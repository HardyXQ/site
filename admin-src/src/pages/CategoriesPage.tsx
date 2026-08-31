import { useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FolderTree, GripVertical, Pencil, Plus, Trash2 } from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Badge, Button, Card, EmptyState, Field, Input, Skeleton, Switch } from '@/components/ui/primitives';
import { ConfirmDialog, Modal } from '@/components/ui/Modal';
import { toast } from '@/components/ui/toast';
import { useCategories, useInvalidateAll } from '@/lib/queries';
import {
  countServicesInCategory,
  createCategory,
  deleteCategory,
  reorderCategories,
  setCategoryPublished,
  updateCategory,
} from '@/lib/api';
import { categorySchema } from '@/lib/schemas';
import { LANGS, type Category, type Lang } from '@/lib/types';
import { errorMessage } from '@/lib/supabase';
import { pickText } from '@/lib/i18n';
import { slugify } from '@/lib/slug';
import { cn } from '@/lib/cn';

const EMPTY = { ru: '', uk: '', en: '' };

function SortableRow({
  category,
  onEdit,
  onDelete,
  onToggle,
  busyToggle,
}: {
  category: Category;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  busyToggle: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id,
  });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'flex items-center gap-3 border-b border-border px-3 py-3 last:border-0',
        isDragging && 'bg-surface-2 shadow-pop',
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab p-1 text-faint hover:text-muted"
        aria-label="Переместить"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{pickText(category.name)}</p>
        <p className="text-xs text-faint">/{category.slug}</p>
      </div>
      <Badge tone={category.is_published ? 'ok' : 'warn'}>
        {category.is_published ? 'Видна' : 'Скрыта'}
      </Badge>
      <Switch checked={category.is_published} onChange={onToggle} disabled={busyToggle} />
      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={onEdit} title="Редактировать">
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0 text-danger hover:bg-danger/10"
        onClick={onDelete}
        title="Удалить"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function CategoriesPage() {
  const categories = useCategories();
  const invalidateAll = useInvalidateAll();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const [orderedIds, setOrderedIds] = useState<string[] | null>(null);
  const [editing, setEditing] = useState<Category | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [deleteInfo, setDeleteInfo] = useState<{ count: number } | null>(null);
  const [busyToggleId, setBusyToggleId] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const list = useMemo(() => {
    const data = categories.data ?? [];
    if (!orderedIds) return data;
    const map = new Map(data.map((c) => [c.id, c]));
    return orderedIds.map((id) => map.get(id)).filter(Boolean) as Category[];
  }, [categories.data, orderedIds]);

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = list.map((c) => c.id);
    const next = arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id)));
    setOrderedIds(next);
    reorderCategories(next)
      .then(() => {
        toast.success('Порядок сохранён');
        invalidateAll();
        setOrderedIds(null);
      })
      .catch((err) => {
        toast.error(errorMessage(err));
        setOrderedIds(null);
      });
  };

  const toggle = (cat: Category) => {
    setBusyToggleId(cat.id);
    setCategoryPublished(cat.id, !cat.is_published)
      .then(() => {
        toast.success(cat.is_published ? 'Категория скрыта' : 'Категория показана');
        invalidateAll();
      })
      .catch((err) => toast.error(errorMessage(err)))
      .finally(() => setBusyToggleId(null));
  };

  const askDelete = async (cat: Category) => {
    setDeleting(cat);
    setDeleteInfo(null);
    try {
      const count = await countServicesInCategory(cat.id);
      setDeleteInfo({ count });
    } catch {
      setDeleteInfo({ count: 0 });
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await deleteCategory(deleting.id);
      toast.success('Категория удалена');
      invalidateAll();
      setDeleting(null);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <AdminLayout
      title="Категории"
      crumbs={[{ label: 'Dashboard', to: '/' }]}
      actions={
        <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setEditing('new')}>
          Новая категория
        </Button>
      }
    >
      <Card className="overflow-hidden">
        {categories.isLoading ? (
          <div className="space-y-px">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-40 flex-1" />
                <Skeleton className="h-5 w-16" />
              </div>
            ))}
          </div>
        ) : list.length === 0 ? (
          <EmptyState
            icon={<FolderTree className="h-8 w-8" />}
            title="Нет категорий"
            description="Категории группируют услуги на сайте."
            action={
              <Button icon={<Plus className="h-4 w-4" />} onClick={() => setEditing('new')}>
                Создать категорию
              </Button>
            }
          />
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={list.map((c) => c.id)} strategy={verticalListSortingStrategy}>
              {list.map((c) => (
                <SortableRow
                  key={c.id}
                  category={c}
                  busyToggle={busyToggleId === c.id}
                  onEdit={() => setEditing(c)}
                  onDelete={() => askDelete(c)}
                  onToggle={() => toggle(c)}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </Card>

      {list.length > 1 && (
        <p className="mt-2 text-xs text-faint">Перетаскивайте категории, чтобы изменить их порядок на сайте.</p>
      )}

      <CategoryEditModal
        state={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          categories.refetch();
          invalidateAll();
          setEditing(null);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        loading={deleteBusy}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title="Удалить категорию?"
        destructive
        confirmLabel={deleteInfo && deleteInfo.count > 0 ? 'Нельзя удалить' : 'Удалить'}
        message={
          deleteInfo == null ? (
            'Проверяем, используется ли категория…'
          ) : deleteInfo.count > 0 ? (
            <>
              В категории <strong>«{deleting ? pickText(deleting.name) : ''}»</strong>{' '}
              {deleteInfo.count} {plural(deleteInfo.count, ['услуга', 'услуги', 'услуг'])}. Сначала
              перенесите эти услуги в другую категорию или скройте категорию вместо удаления.
            </>
          ) : (
            <>
              Удалить категорию <strong>«{deleting ? pickText(deleting.name) : ''}»</strong>? Действие
              нельзя отменить.
            </>
          )
        }
      />
    </AdminLayout>
  );
}

function CategoryEditModal({
  state,
  onClose,
  onSaved,
}: {
  state: Category | 'new' | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = state === 'new';
  const cat = state && state !== 'new' ? state : null;
  const [name, setName] = useState<Record<Lang, string>>({ ...EMPTY });
  const [slug, setSlug] = useState('');
  const [published, setPublished] = useState(true);
  const [slugTouched, setSlugTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!state) return;
    if (cat) {
      setName({ ru: cat.name.ru ?? '', uk: cat.name.uk ?? '', en: cat.name.en ?? '' });
      setSlug(cat.slug);
      setPublished(cat.is_published);
      setSlugTouched(true);
    } else {
      setName({ ...EMPTY });
      setSlug('');
      setPublished(true);
      setSlugTouched(false);
    }
    setErr(null);
  }, [state, cat]);

  useEffect(() => {
    if (!slugTouched) setSlug(slugify(name.ru));
  }, [name.ru, slugTouched]);

  const submit = async () => {
    setErr(null);
    const parsed = categorySchema.safeParse({ name, slug, is_published: published });
    if (!parsed.success) {
      setErr(parsed.error.issues[0]?.message ?? 'Проверьте поля');
      return;
    }
    setBusy(true);
    try {
      if (cat) await updateCategory(cat.id, parsed.data);
      else await createCategory(parsed.data);
      toast.success(cat ? 'Категория обновлена' : 'Категория создана');
      onSaved();
    } catch (e) {
      const msg = errorMessage(e);
      setErr(/duplicate|unique/i.test(msg) ? 'Категория с таким slug уже существует' : msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={Boolean(state)}
      onClose={busy ? () => undefined : onClose}
      title={isNew ? 'Новая категория' : 'Редактировать категорию'}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Отмена
          </Button>
          <Button onClick={submit} loading={busy}>
            {isNew ? 'Создать' : 'Сохранить'}
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
        <Switch checked={published} onChange={setPublished} label="Показывать на сайте" />
      </div>
    </Modal>
  );
}

function plural(n: number, forms: [string, string, string]): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return forms[0];
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return forms[1];
  return forms[2];
}
