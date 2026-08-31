import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save } from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button, Card, Field, Input, Select, Skeleton } from '@/components/ui/primitives';
import { toast } from '@/components/ui/toast';
import { useAuth } from '@/auth/AuthProvider';
import { useSaveSettings, useSettings } from '@/lib/queries';
import { settingsSchema, type SettingsFormValues } from '@/lib/schemas';
import { CURRENCIES } from '@/lib/types';
import { errorMessage } from '@/lib/supabase';

export function SettingsPage() {
  const settings = useSettings();
  const save = useSaveSettings();
  const { email } = useAuth();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: { studio_name: '', contact_email: '', default_currency: 'USD' },
  });

  useEffect(() => {
    if (settings.data) {
      reset({
        studio_name: settings.data.studio_name ?? '',
        contact_email: settings.data.contact_email ?? '',
        default_currency: settings.data.default_currency ?? 'USD',
      });
    }
  }, [settings.data, reset]);

  const onSubmit = (values: SettingsFormValues) => {
    save.mutate(values, {
      onSuccess: () => {
        toast.success('Настройки сохранены');
        reset(values);
      },
      onError: (err) => toast.error(errorMessage(err)),
    });
  };

  return (
    <AdminLayout title="Настройки" crumbs={[{ label: 'Dashboard', to: '/' }]}>
      <div className="max-w-2xl space-y-4">
        <Card className="p-5">
          <h3 className="mb-4 text-sm font-semibold">Студия</h3>
          {settings.isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Field label="Название студии" error={errors.studio_name?.message}>
                <Input placeholder="WaveSign Studio" {...register('studio_name')} />
              </Field>
              <Field label="Контактный email" error={errors.contact_email?.message}>
                <Input type="email" placeholder="hello@wavesign.art" {...register('contact_email')} />
              </Field>
              <Field label="Валюта по умолчанию" hint="Предлагается при создании новой услуги.">
                <Select {...register('default_currency')}>
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </Field>
              <Button
                type="submit"
                icon={<Save className="h-4 w-4" />}
                loading={save.isPending}
                disabled={!isDirty}
              >
                Сохранить
              </Button>
            </form>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="mb-3 text-sm font-semibold">Аккаунт</h3>
          <p className="text-sm text-muted">
            Вы вошли как <span className="font-medium text-ink">{email}</span>.
          </p>
          <p className="mt-2 text-xs text-faint">
            Смена пароля и добавление администраторов выполняются в панели Supabase
            (Authentication → Users) и таблице <code>public.admins</code>.
          </p>
        </Card>
      </div>
    </AdminLayout>
  );
}
