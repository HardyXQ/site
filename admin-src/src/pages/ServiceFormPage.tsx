import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, Plus, RotateCcw, Save, X } from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  Select,
  Skeleton,
  Switch,
  Textarea,
} from '@/components/ui/primitives';
import { Modal } from '@/components/ui/Modal';
import { toast } from '@/components/ui/toast';
import { I18nField } from '@/components/I18nField';
import { RichTextEditor } from '@/components/RichTextEditor';
import { GalleryInput, MainImageInput } from '@/components/ImageUpload';
import { ServicePreview } from '@/components/ServicePreview';
import { serviceSchema, categorySchema, type ServiceFormValues } from '@/lib/schemas';
import {
  createCategory,
  createService,
  getDraft,
  saveDraft,
  deleteDraft,
  slugExists,
  updateService,
} from '@/lib/api';
import { useCategories, useInvalidateAll, useService } from '@/lib/queries';
import { CURRENCIES, LANGS, PRICE_UNITS, type Lang } from '@/lib/types';
import { errorMessage } from '@/lib/supabase';
import { slugify } from '@/lib/slug';
import { pickText } from '@/lib/i18n';
import { cn } from '@/lib/cn';

const EMPTY_I18N = { ru: '', uk: '', en: '' };

const DEFAULTS: ServiceFormValues = {
  title: { ...EMPTY_I18N },
  slug: '',
  category_id: null,
  short_description: { ...EMPTY_I18N },
  description: { ...EMPTY_I18N },
  price_type: 'from',
  price_amount: null,
  price_currency: 'USD',
  price_unit: null,
  main_image_url: null,
  gallery: [],
  is_published: false,
  sort_order: 0,
  sub_group: 0,
  seo_title: { ...EMPTY_I18N },
  seo_description: { ...EMPTY_I18N },
  og_image_url: null,
};

const CURRENCY_LABEL: Record<string, string> = {
  USD: 'USD $',
  EUR: 'EUR €',
  GBP: 'GBP £',
  UAH: 'UAH ₴',
  RUB: 'RUB ₽',
  PLN: 'PLN zł',
};
const UNIT_LABEL: Record<string, string> = {
  item: 'за штуку',
  hour: 'за час',
  minute: 'за минуту',
};

function toForm(s: NonNullable<ReturnType<typeof useService>['data']>): ServiceFormValues {
  const i18n = (v: Record<string, string | undefined> | null) => ({
    ru: v?.ru ?? '',
    uk: v?.uk ?? '',
    en: v?.en ?? '',
  });
  return {
    title: i18n(s.title),
    slug: s.slug,
    category_id: s.category_id,
    short_description: i18n(s.short_description),
    description: i18n(s.description),
    price_type: s.price_type,
    price_amount: s.price_amount,
    price_currency: s.price_currency,
    price_unit: s.price_unit,
    main_image_url: s.main_image_url,
    gallery: s.images.map((img, i) => ({ id: img.id, image_url: img.image_url, sort_order: i })),
    is_published: s.is_published,
    sort_order: s.sort_order,
    sub_group: s.sub_group,
    seo_title: i18n(s.seo_title),
    seo_description: i18n(s.seo_description),
    og_image_url: s.og_image_url,
  };
}

export function ServiceFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const categories = useCategories();
  const existing = useService(id);
  const invalidateAll = useInvalidateAll();

  const draftKey = `wavesign:draft:${id ?? 'new'}`;
  const [ready, setReady] = useState(!isEdit);
  const [showPreview, setShowPreview] = useState(false);
  const [addCat, setAddCat] = useState(false);
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [restorable, setRestorable] = useState<ServiceFormValues | null>(null);
  const [uploading, setUploading] = useState(0);
  const savedRef = useRef(false);
  const onBusyChange = (busy: boolean) => setUploading((n) => Math.max(0, n + (busy ? 1 : -1)));

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: DEFAULTS,
    mode: 'onBlur',
  });
  const { control, handleSubmit, reset, setValue, getValues, setError, formState } = form;

  // ---- load existing + drafts ------------------------------------------------
  useEffect(() => {
    if (!isEdit) {
      const local = localStorage.getItem(draftKey);
      if (local) {
        try {
          setRestorable(JSON.parse(local) as ServiceFormValues);
        } catch {
          localStorage.removeItem(draftKey);
        }
      }
      return;
    }
    if (!existing.data) return;
    const base = toForm(existing.data);
    reset(base);
    (async () => {
      const [serverDraft] = await Promise.all([getDraft(existing.data!.id).catch(() => null)]);
      const local = localStorage.getItem(draftKey);
      const candidate =
        serverDraft && new Date(serverDraft.updated_at).getTime() > new Date(existing.data!.updated_at).getTime()
          ? (serverDraft.data as ServiceFormValues)
          : local
            ? (JSON.parse(local) as ServiceFormValues)
            : null;
      if (candidate) setRestorable(candidate);
      setReady(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing.data, isEdit]);

  // ---- autosave (debounced) ------------------------------------------------
  const watched = useWatch({ control });
  useEffect(() => {
    if (!ready || restorable) return;
    const t = setTimeout(() => {
      const values = getValues();
      if (JSON.stringify(values) === JSON.stringify(isEdit && existing.data ? toForm(existing.data) : DEFAULTS)) {
        return;
      }
      localStorage.setItem(draftKey, JSON.stringify(values));
      if (isEdit && id) saveDraft(id, values).catch(() => undefined);
    }, 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watched, ready, restorable]);

  // ---- slug auto-generation ------------------------------------------------
  const titleRu = useWatch({ control, name: 'title.ru' });
  useEffect(() => {
    if (slugTouched) return;
    const next = slugify(titleRu ?? '');
    if (next) setValue('slug', next, { shouldValidate: true });
  }, [titleRu, slugTouched, setValue]);

  const priceType = useWatch({ control, name: 'price_type' });

  const clearDrafts = () => {
    localStorage.removeItem(draftKey);
    if (isEdit && id) deleteDraft(id).catch(() => undefined);
  };

  // ---- submit ------------------------------------------------------------
  const onSubmit = async (values: ServiceFormValues) => {
    if (uploading > 0) {
      toast.error('Дождитесь окончания загрузки изображений');
      return;
    }
    // slug uniqueness (friendly pre-check; DB constraint is the real guard)
    if (await slugExists(values.slug, id)) {
      setError('slug', { message: 'Услуга с таким slug уже существует' });
      toast.error('Slug занят — измените его');
      return;
    }
    try {
      if (isEdit && id) {
        await updateService(id, values);
        toast.success('Изменения успешно сохранены');
      } else {
        const created = await createService(values);
        toast.success('Услуга создана');
        savedRef.current = true;
        clearDrafts();
        invalidateAll();
        navigate(`/services/${created.id}/edit`, { replace: true });
        return;
      }
      savedRef.current = true;
      clearDrafts();
      invalidateAll();
      reset(values);
    } catch (err) {
      const msg = errorMessage(err);
      if (/duplicate key|unique/i.test(msg)) {
        setError('slug', { message: 'Услуга с таким slug уже существует' });
        toast.error('Slug занят');
      } else {
        toast.error(msg);
      }
    }
  };

  const onInvalid = () => toast.error('Проверьте отмеченные поля');

  const selectedCategory = useMemo(
    () => categories.data?.find((c) => c.id === watched.category_id),
    [categories.data, watched.category_id],
  );

  if (isEdit && (existing.isLoading || !ready)) {
    return (
      <AdminLayout title="Загрузка…" crumbs={[{ label: 'Услуги', to: '/services' }]}>
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </AdminLayout>
    );
  }

  if (isEdit && existing.isError) {
    return (
      <AdminLayout title="Ошибка" crumbs={[{ label: 'Услуги', to: '/services' }]}>
        <Card className="p-6 text-sm text-danger">Не удалось загрузить услугу. {errorMessage(existing.error)}</Card>
      </AdminLayout>
    );
  }

  if (isEdit && existing.data === null) {
    return (
      <AdminLayout title="Не найдено" crumbs={[{ label: 'Услуги', to: '/services' }]}>
        <Card className="p-6 text-sm">Такой услуги нет.</Card>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title={isEdit ? pickText(existing.data?.title) || 'Услуга' : 'Новая услуга'}
      crumbs={[
        { label: 'Dashboard', to: '/' },
        { label: 'Услуги', to: '/services' },
      ]}
      actions={
        <>
          <Button size="sm" variant="ghost" icon={<X className="h-4 w-4" />} onClick={() => navigate('/services')}>
            <span className="hidden sm:inline">Отмена</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            icon={<Eye className="h-4 w-4" />}
            onClick={() => setShowPreview(true)}
          >
            <span className="hidden sm:inline">Предпросмотр</span>
          </Button>
          <Button
            size="sm"
            icon={<Save className="h-4 w-4" />}
            loading={formState.isSubmitting}
            disabled={uploading > 0}
            title={uploading > 0 ? 'Идёт загрузка изображений…' : undefined}
            onClick={handleSubmit(onSubmit, onInvalid)}
          >
            {isEdit ? 'Сохранить' : 'Создать'}
          </Button>
        </>
      }
    >
      {restorable && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-brand/30 bg-brand-soft px-4 py-3 text-sm">
          <RotateCcw className="h-4 w-4 text-brand" />
          <span className="text-ink">Найден несохранённый черновик этой формы.</span>
          <div className="ml-auto flex gap-2">
            <Button
              size="sm"
              onClick={() => {
                reset(restorable);
                setRestorable(null);
                setSlugTouched(true);
              }}
            >
              Восстановить
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setRestorable(null);
                clearDrafts();
              }}
            >
              Отклонить
            </Button>
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit(onSubmit, onInvalid)}
        className="grid gap-4 lg:grid-cols-[1fr_320px] lg:items-start"
      >
        {/* main column */}
        <div className="space-y-4">
          <Card className="space-y-4 p-4 sm:p-5">
            <Controller
              control={control}
              name="title"
              render={({ field, fieldState }) => (
                <I18nField
                  label="Название услуги"
                  required
                  value={field.value as Record<Lang, string>}
                  onChange={field.onChange}
                  error={
                    fieldState.error && 'ru' in fieldState.error
                      ? (fieldState.error as { ru?: { message?: string } }).ru?.message
                      : fieldState.error?.message
                  }
                >
                  {({ value, setValue: set, lang }) => (
                    <Input
                      value={value}
                      onChange={(e) => set(e.target.value)}
                      placeholder={lang === 'ru' ? 'Логотип' : lang === 'uk' ? 'Логотип' : 'Logo'}
                    />
                  )}
                </I18nField>
              )}
            />

            <Controller
              control={control}
              name="slug"
              render={({ field, fieldState }) => (
                <Field
                  label="URL slug"
                  required
                  htmlFor="slug"
                  error={fieldState.error?.message}
                  hint="Латиница, цифры и дефис. Используется в адресе на сайте."
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-faint">/service-</span>
                    <Input
                      id="slug"
                      value={field.value}
                      onChange={(e) => {
                        setSlugTouched(true);
                        field.onChange(e.target.value);
                      }}
                      placeholder="logo"
                    />
                    {!slugTouched && <Badge tone="brand">авто</Badge>}
                  </div>
                </Field>
              )}
            />

            <Controller
              control={control}
              name="short_description"
              render={({ field }) => (
                <I18nField
                  label="Краткое описание"
                  hint="Показывается в карточке услуги."
                  value={field.value as Record<Lang, string>}
                  onChange={field.onChange}
                >
                  {({ value, setValue: set }) => (
                    <Textarea value={value} onChange={(e) => set(e.target.value)} rows={2} />
                  )}
                </I18nField>
              )}
            />

            <Controller
              control={control}
              name="description"
              render={({ field }) => (
                <I18nField
                  label="Полное описание"
                  hint="Заголовки, списки, жирный текст, ссылки."
                  value={field.value as Record<Lang, string>}
                  onChange={field.onChange}
                >
                  {({ value, setValue: set }) => (
                    <RichTextEditor value={value} onChange={set} />
                  )}
                </I18nField>
              )}
            />
          </Card>

          <Card className="space-y-4 p-4 sm:p-5">
            <h3 className="text-sm font-semibold">Цена</h3>
            <Controller
              control={control}
              name="price_type"
              render={({ field }) => (
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      ['fixed', 'Фиксированная'],
                      ['from', '«от»'],
                      ['on_request', 'По запросу'],
                    ] as const
                  ).map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => field.onChange(val)}
                      className={cn(
                        'rounded-lg border px-3 py-2 text-sm font-medium transition',
                        field.value === val
                          ? 'border-brand bg-brand-soft text-brand'
                          : 'border-border text-muted hover:bg-surface-2',
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            />
            {priceType !== 'on_request' && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Controller
                  control={control}
                  name="price_amount"
                  render={({ field, fieldState }) => (
                    <Field label="Сумма" required error={fieldState.error?.message}>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        inputMode="decimal"
                        value={field.value ?? ''}
                        onChange={(e) =>
                          field.onChange(e.target.value === '' ? null : Number(e.target.value))
                        }
                        placeholder="50"
                      />
                    </Field>
                  )}
                />
                <Controller
                  control={control}
                  name="price_currency"
                  render={({ field }) => (
                    <Field label="Валюта">
                      <Select value={field.value} onChange={(e) => field.onChange(e.target.value)}>
                        {CURRENCIES.map((c) => (
                          <option key={c} value={c}>
                            {CURRENCY_LABEL[c]}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  )}
                />
                <Controller
                  control={control}
                  name="price_unit"
                  render={({ field }) => (
                    <Field label="Единица" hint="необязательно">
                      <Select
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value === '' ? null : e.target.value)}
                      >
                        <option value="">—</option>
                        {PRICE_UNITS.map((u) => (
                          <option key={u} value={u}>
                            {UNIT_LABEL[u]}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  )}
                />
              </div>
            )}
          </Card>

          <Card className="space-y-4 p-4 sm:p-5">
            <h3 className="text-sm font-semibold">Главное изображение</h3>
            <Controller
              control={control}
              name="main_image_url"
              render={({ field }) => (
                <MainImageInput
                  value={field.value}
                  onChange={field.onChange}
                  folder="services"
                  onBusyChange={onBusyChange}
                />
              )}
            />
          </Card>

          <Card className="space-y-3 p-4 sm:p-5">
            <h3 className="text-sm font-semibold">Галерея</h3>
            <Controller
              control={control}
              name="gallery"
              render={({ field }) => (
                <GalleryInput
                  value={field.value}
                  onChange={field.onChange}
                  folder="services/gallery"
                  onBusyChange={onBusyChange}
                />
              )}
            />
          </Card>

          <Card className="space-y-4 p-4 sm:p-5">
            <h3 className="text-sm font-semibold">SEO</h3>
            <Controller
              control={control}
              name="seo_title"
              render={({ field }) => (
                <I18nField
                  label="SEO title"
                  value={field.value as Record<Lang, string>}
                  onChange={field.onChange}
                >
                  {({ value, setValue: set }) => (
                    <Input value={value} onChange={(e) => set(e.target.value)} maxLength={70} />
                  )}
                </I18nField>
              )}
            />
            <Controller
              control={control}
              name="seo_description"
              render={({ field }) => (
                <I18nField
                  label="Meta description"
                  value={field.value as Record<Lang, string>}
                  onChange={field.onChange}
                >
                  {({ value, setValue: set }) => (
                    <Textarea value={value} onChange={(e) => set(e.target.value)} rows={2} maxLength={200} />
                  )}
                </I18nField>
              )}
            />
            <Controller
              control={control}
              name="og_image_url"
              render={({ field }) => (
                <Field label="OpenGraph image" hint="Картинка для превью при шаринге ссылки.">
                  <MainImageInput
                    value={field.value}
                    onChange={field.onChange}
                    folder="services/og"
                    onBusyChange={onBusyChange}
                  />
                </Field>
              )}
            />
          </Card>
        </div>

        {/* sidebar */}
        <div className="space-y-4 lg:sticky lg:top-20">
          <Card className="space-y-4 p-4">
            <Controller
              control={control}
              name="is_published"
              render={({ field }) => (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Статус</p>
                    <p className="text-xs text-muted">
                      {field.value ? 'Видна на сайте' : 'Скрыта с сайта'}
                    </p>
                  </div>
                  <Switch
                    checked={field.value}
                    onChange={field.onChange}
                    label={field.value ? 'Опубликовано' : 'Скрыто'}
                  />
                </div>
              )}
            />

            <div className="border-t border-border pt-4">
              <Controller
                control={control}
                name="category_id"
                render={({ field }) => (
                  <Field label="Категория" error={form.formState.errors.category_id?.message}>
                    <div className="flex gap-2">
                      <Select
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      >
                        <option value="">Без категории</option>
                        {categories.data?.map((c) => (
                          <option key={c.id} value={c.id}>
                            {pickText(c.name)}
                            {!c.is_published ? ' (скрыта)' : ''}
                          </option>
                        ))}
                      </Select>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="shrink-0 px-2"
                        onClick={() => setAddCat(true)}
                        title="Новая категория"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </Field>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-border pt-4">
              <Controller
                control={control}
                name="sort_order"
                render={({ field }) => (
                  <Field label="Порядок" hint="меньше = выше">
                    <Input
                      type="number"
                      min={0}
                      value={field.value}
                      onChange={(e) => field.onChange(Number(e.target.value || 0))}
                    />
                  </Field>
                )}
              />
              <Controller
                control={control}
                name="sub_group"
                render={({ field }) => (
                  <Field label="Подгруппа" hint="блок в категории">
                    <Input
                      type="number"
                      min={0}
                      value={field.value}
                      onChange={(e) => field.onChange(Number(e.target.value || 0))}
                    />
                  </Field>
                )}
              />
            </div>
          </Card>

          <Card className="p-4">
            <p className="text-xs text-muted">
              Черновик сохраняется автоматически. После «{isEdit ? 'Сохранить' : 'Создать'}» изменения
              появляются на сайте{watched.is_published ? '' : ' (после публикации)'}.
            </p>
          </Card>
        </div>
      </form>

      <Modal open={showPreview} onClose={() => setShowPreview(false)} title="Предпросмотр" size="lg">
        <ServicePreview
          values={getValues()}
          categoryName={selectedCategory?.name as Record<Lang, string> | undefined}
        />
      </Modal>

      <QuickCategoryModal
        open={addCat}
        onClose={() => setAddCat(false)}
        onCreated={(catId) => {
          categories.refetch();
          setValue('category_id', catId, { shouldDirty: true });
          setAddCat(false);
        }}
      />
    </AdminLayout>
  );
}

/* -------------------------------------------------------------------------- */
/* inline category creation                                                   */
/* -------------------------------------------------------------------------- */
function QuickCategoryModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [name, setName] = useState({ ...EMPTY_I18N });
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setName({ ...EMPTY_I18N });
      setSlug('');
      setSlugTouched(false);
      setErr(null);
    }
  }, [open]);

  useEffect(() => {
    if (!slugTouched) setSlug(slugify(name.ru));
  }, [name.ru, slugTouched]);

  const submit = async () => {
    setErr(null);
    const parsed = categorySchema.safeParse({ name, slug, is_published: true });
    if (!parsed.success) {
      setErr(parsed.error.issues[0]?.message ?? 'Проверьте поля');
      return;
    }
    setBusy(true);
    try {
      const cat = await createCategory(parsed.data);
      toast.success('Категория создана');
      onCreated(cat.id);
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={busy ? () => undefined : onClose}
      title="Новая категория"
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Отмена
          </Button>
          <Button onClick={submit} loading={busy}>
            Создать
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {LANGS.map((l) => (
          <Field key={l} label={`Название (${l.toUpperCase()})`} required={l === 'ru'}>
            <Input
              value={name[l]}
              onChange={(e) => setName((prev) => ({ ...prev, [l]: e.target.value }))}
            />
          </Field>
        ))}
        <Field label="Slug" required error={err ?? undefined}>
          <Input
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
          />
        </Field>
      </div>
    </Modal>
  );
}
