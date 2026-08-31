import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Lock, LogIn } from 'lucide-react';
import { loginSchema, type LoginValues } from '@/lib/schemas';
import { signIn } from '@/lib/api';
import { errorMessage } from '@/lib/supabase';
import { useAuth } from '@/auth/AuthProvider';
import { IS_CONFIGURED } from '@/config';
import { Button, Field, Input } from '@/components/ui/primitives';

export function LoginPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  if (!loading && session) {
    const to = (location.state as { from?: string })?.from ?? '/';
    return <Navigate to={to} replace />;
  }

  const onSubmit = async (values: LoginValues) => {
    setFormError(null);
    try {
      await signIn(values.email, values.password);
      navigate((location.state as { from?: string })?.from ?? '/', { replace: true });
    } catch (err) {
      const msg = errorMessage(err);
      setFormError(
        /invalid login credentials/i.test(msg) ? 'Неверный email или пароль.' : msg,
      );
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand text-lg font-bold text-brand-fg">
            W
          </div>
          <h1 className="mt-3 text-lg font-semibold">Вход в админ-панель</h1>
          <p className="text-sm text-muted">WaveSign Studio</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="card space-y-4 p-6">
          {!IS_CONFIGURED && (
            <p className="rounded-lg border border-warn/30 bg-warn/10 px-3 py-2 text-xs text-warn">
              Не задан адрес Supabase. Проверьте <code>/public-config.js</code> или <code>.env</code>.
            </p>
          )}
          <Field label="Email" htmlFor="email" error={errors.email?.message}>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              placeholder="admin@wavesign.art"
              {...register('email')}
            />
          </Field>
          <Field label="Пароль" htmlFor="password" error={errors.password?.message}>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              {...register('password')}
            />
          </Field>
          {formError && (
            <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs font-medium text-danger">
              {formError}
            </p>
          )}
          <Button type="submit" className="w-full" loading={isSubmitting} icon={<LogIn className="h-4 w-4" />}>
            Войти
          </Button>
        </form>

        <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-faint">
          <Lock className="h-3 w-3" />
          Защищённая зона. Доступ только для администраторов.
        </p>
      </div>
    </div>
  );
}
