import { Link, useNavigate } from 'react-router-dom';
import { Plus, Package, Eye, EyeOff, FolderTree, ArrowRight } from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Badge, Button, Card, Skeleton } from '@/components/ui/primitives';
import { useDashboardStats, useRecentServices } from '@/lib/queries';
import { pickText } from '@/lib/i18n';
import { formatPrice, formatRelative } from '@/lib/format';

function StatCard({
  label,
  value,
  icon,
  loading,
  accent,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  loading: boolean;
  accent?: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted">{label}</span>
        <span className={accent ?? 'text-faint'}>{icon}</span>
      </div>
      {loading ? (
        <Skeleton className="mt-2 h-8 w-14" />
      ) : (
        <p className="mt-1 text-3xl font-semibold tabular-nums">{value}</p>
      )}
    </Card>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const stats = useDashboardStats();
  const recent = useRecentServices();

  return (
    <AdminLayout
      title="Dashboard"
      actions={
        <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => navigate('/services/new')}>
          Добавить услугу
        </Button>
      }
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Всего услуг"
          value={stats.data?.total ?? 0}
          icon={<Package className="h-4 w-4" />}
          loading={stats.isLoading}
        />
        <StatCard
          label="Опубликовано"
          value={stats.data?.published ?? 0}
          icon={<Eye className="h-4 w-4" />}
          loading={stats.isLoading}
          accent="text-ok"
        />
        <StatCard
          label="Скрыто"
          value={stats.data?.hidden ?? 0}
          icon={<EyeOff className="h-4 w-4" />}
          loading={stats.isLoading}
          accent="text-warn"
        />
        <StatCard
          label="Категорий"
          value={stats.data?.categories ?? 0}
          icon={<FolderTree className="h-4 w-4" />}
          loading={stats.isLoading}
        />
      </div>

      <Card className="mt-6">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">Недавно изменённые</h2>
          <Link to="/services" className="flex items-center gap-1 text-xs font-medium text-brand hover:underline">
            Все услуги <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {recent.isLoading ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <Skeleton className="h-10 w-10 rounded-md" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : recent.data && recent.data.length > 0 ? (
          <ul className="divide-y divide-border">
            {recent.data.map((s) => (
              <li key={s.id}>
                <Link
                  to={`/services/${s.id}/edit`}
                  className="flex items-center gap-3 px-4 py-3 transition hover:bg-surface-2"
                >
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-surface-2">
                    {s.main_image_url && (
                      <img src={s.main_image_url} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{pickText(s.title)}</p>
                    <p className="truncate text-xs text-muted">
                      {pickText(s.category?.name) || 'Без категории'} · {formatPrice(s)}
                    </p>
                  </div>
                  <Badge tone={s.is_published ? 'ok' : 'warn'}>
                    {s.is_published ? 'Опубликовано' : 'Скрыто'}
                  </Badge>
                  <span className="hidden w-28 text-right text-xs text-faint sm:block">
                    {formatRelative(s.updated_at)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="px-4 py-10 text-center text-sm text-muted">
            Пока нет услуг.{' '}
            <Link to="/services/new" className="font-medium text-brand hover:underline">
              Добавить первую
            </Link>
          </div>
        )}
      </Card>
    </AdminLayout>
  );
}
