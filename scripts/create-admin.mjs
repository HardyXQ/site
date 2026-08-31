/**
 * Creates (or updates) the administrator account and registers it in public.admins.
 * Works against local Supabase and against your cloud project.
 *
 *   Reads from .env:  VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAIL, ADMIN_PASSWORD
 *
 *   node scripts/create-admin.mjs
 *   node scripts/create-admin.mjs new@email.com 'new-password'   # override
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

function loadEnv() {
  try {
    for (const line of readFileSync(new URL('../.env', import.meta.url), 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
    }
  } catch {
    /* no .env — rely on real env */
  }
}
loadEnv();

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.argv[2] || process.env.ADMIN_EMAIL;
const password = process.argv[3] || process.env.ADMIN_PASSWORD;

if (!url || !serviceKey || !email || !password) {
  console.error(
    'Missing config. Need VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAIL, ADMIN_PASSWORD.',
  );
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
let user = list?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

if (user) {
  await admin.auth.admin.updateUserById(user.id, { password, email_confirm: true });
  console.log(`Updated existing user ${email}`);
} else {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  user = data.user;
  console.log(`Created user ${email}`);
}

const { error: adminErr } = await admin
  .from('admins')
  .upsert({ user_id: user.id, email }, { onConflict: 'user_id' });
if (adminErr) throw adminErr;

console.log(`Registered ${email} in public.admins — you can now sign in at /admin/login`);
