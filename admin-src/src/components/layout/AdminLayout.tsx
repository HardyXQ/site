import { useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Settings,
  LogOut,
  Menu,
  X,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAuth } from '@/auth/AuthProvider';
import { PUBLIC_SITE_URL } from '@/config';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/services', label: 'Услуги', icon: Package, end: false },
  { to: '/categories', label: 'Категории', icon: FolderTree, end: false },
  { to: '/settings', label: 'Настройки', icon: Settings, end: false },
];

export interface Crumb {
  label: string;
  to?: string;
}

export function AdminLayout({
  title,
  crumbs,
  actions,
  children,
}: {
  title: string;
  crumbs?: Crumb[];
  actions?: ReactNode;
  children: ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { email, signOut } = useAuth();
  const location = useLocation();

  return (
    <div className="flex min-h-screen bg-bg">
      {/* sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-border bg-surface transition-transform lg:static lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-14 items-center gap-2 border-b border-border px-4">
          <div className="grid h-7 w-7 place-items-center rounded-md bg-brand text-sm font-bold text-brand-fg">
            W
          </div>
          <span className="text-sm font-semibold tracking-tight">WaveSign Admin</span>
          <button
            className="ml-auto rounded-md p-1 text-muted hover:bg-surface-2 lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Закрыть меню"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
                  isActive
                    ? 'bg-brand-soft text-brand'
                    : 'text-muted hover:bg-surface-2 hover:text-ink',
                )
              }
            >
              <item.icon className="h-[18px] w-[18px]" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-border p-3">
          <a
            href={PUBLIC_SITE_URL}
            target="_blank"
            rel="noreferrer"
            className="mb-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted transition hover:bg-surface-2 hover:text-ink"
          >
            <ExternalLink className="h-[18px] w-[18px]" />
            Открыть сайт
          </a>
          <button
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted transition hover:bg-danger/10 hover:text-danger"
          >
            <LogOut className="h-[18px] w-[18px]" />
            Выйти
          </button>
          {email && <p className="mt-2 truncate px-3 text-xs text-faint">{email}</p>}
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-ink/30 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-surface/80 px-4 backdrop-blur lg:px-6">
          <button
            className="rounded-md p-1.5 text-muted hover:bg-surface-2 lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Открыть меню"
          >
            <Menu className="h-5 w-5" />
          </button>
          <nav className="flex min-w-0 items-center gap-1.5 text-sm">
            {(crumbs ?? []).map((c, i) => (
              <span key={i} className="flex items-center gap-1.5 text-muted">
                {c.to ? (
                  <Link to={c.to} className="hover:text-ink">
                    {c.label}
                  </Link>
                ) : (
                  <span>{c.label}</span>
                )}
                <ChevronRight className="h-3.5 w-3.5 text-faint" />
              </span>
            ))}
            <span className="truncate font-medium text-ink">{title}</span>
          </nav>
          <div className="ml-auto flex items-center gap-2">{actions}</div>
        </header>

        <main key={location.pathname} className="flex-1 p-4 lg:p-6">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
