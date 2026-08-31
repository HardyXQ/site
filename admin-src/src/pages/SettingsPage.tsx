import { ExternalLink } from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card } from '@/components/ui/primitives';
import { useAuth } from '@/auth/AuthProvider';
import { PUBLIC_SITE_URL } from '@/config';

export function SettingsPage() {
  const { email } = useAuth();

  return (
    <AdminLayout title="Настройки" crumbs={[{ label: 'Dashboard', to: '/' }]}>
      <div className="max-w-2xl space-y-4">
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

        <Card className="p-5">
          <h3 className="mb-3 text-sm font-semibold">Публичный сайт</h3>
          <p className="text-sm text-muted">
            Опубликованные услуги сразу отображаются на сайте.
          </p>
          <a
            href={PUBLIC_SITE_URL}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
          >
            <ExternalLink className="h-4 w-4" />
            Открыть {PUBLIC_SITE_URL.replace(/^https?:\/\//, '')}
          </a>
        </Card>
      </div>
    </AdminLayout>
  );
}
