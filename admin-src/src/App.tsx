import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/auth/AuthProvider';
import { RequireAuth } from '@/auth/RequireAuth';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ServicesListPage } from '@/pages/ServicesListPage';
import { ServiceFormPage } from '@/pages/ServiceFormPage';
import { CategoriesPage } from '@/pages/CategoriesPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/primitives';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 15_000 },
  },
});

function NotFound() {
  return (
    <AdminLayout title="Страница не найдена">
      <div className="py-16 text-center">
        <p className="text-5xl font-bold text-faint">404</p>
        <p className="mt-2 text-sm text-muted">Такой страницы нет.</p>
        <Button className="mt-5" onClick={() => (window.location.href = '/admin/')}>
          На главную
        </Button>
      </div>
    </AdminLayout>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename="/admin">
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<RequireAuth />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/services" element={<ServicesListPage />} />
              <Route path="/services/new" element={<ServiceFormPage />} />
              <Route path="/services/:id/edit" element={<ServiceFormPage />} />
              <Route path="/categories" element={<CategoriesPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
            <Route path="/404" element={<NotFound />} />
            <Route path="*" element={<Navigate to="/404" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'rgb(var(--surface))',
            color: 'rgb(var(--ink))',
            border: '1px solid rgb(var(--border))',
          },
        }}
      />
    </QueryClientProvider>
  );
}
