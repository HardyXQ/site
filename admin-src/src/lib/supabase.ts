import { createClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/config';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storageKey: 'wavesign-admin-auth',
  },
});

/** Narrow a Supabase error / unknown into a readable message. */
export function errorMessage(err: unknown): string {
  if (!err) return 'Неизвестная ошибка';
  if (typeof err === 'string') return err;
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && 'message' in err) {
    return String((err as { message: unknown }).message);
  }
  return 'Неизвестная ошибка';
}
