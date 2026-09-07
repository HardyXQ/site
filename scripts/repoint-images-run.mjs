/**
 * Applies supabase/repoint-images.sql against the live database using the
 * service_role key from .env (via PostgREST). Same effect as pasting the .sql
 * into the Supabase SQL Editor, for people without SQL Editor access handy.
 *
 *   node scripts/repoint-images-run.mjs [--dry]
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dry = process.argv.includes('--dry');

const env = {};
for (const line of readFileSync(join(root, '.env'), 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2];
}
const URL_ = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) throw new Error('Need VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');

const sql = readFileSync(join(root, 'supabase/repoint-images.sql'), 'utf8');
const re =
  /update public\.(\w+) set (\w+) = '((?:[^']|'')*)' where \2 = '((?:[^']|'')*)';/g;

const jobs = [];
let m;
while ((m = re.exec(sql))) {
  const [, table, col, newVal, oldVal] = m;
  jobs.push({ table, col, newVal: newVal.replace(/''/g, "'"), oldVal: oldVal.replace(/''/g, "'") });
}
// de-dup identical jobs
const seen = new Set();
const unique = jobs.filter((j) => {
  const k = `${j.table}|${j.col}|${j.oldVal}`;
  if (seen.has(k)) return false;
  seen.add(k);
  return true;
});

console.log(`${unique.length} updates (${jobs.length - unique.length} duplicates skipped)${dry ? ' — DRY RUN' : ''}`);

let updated = 0;
let untouched = 0;
for (const j of unique) {
  const url = `${URL_}/rest/v1/${j.table}?${j.col}=eq.${encodeURIComponent(j.oldVal)}`;
  if (dry) {
    console.log(`  ${j.table}.${j.col}  ←  ...${j.newVal.split('/').pop()}`);
    continue;
  }
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({ [j.col]: j.newVal }),
  });
  if (!res.ok) {
    console.error(`  FAIL ${res.status} ${j.table} ${await res.text()}`);
    continue;
  }
  const rows = await res.json();
  if (rows.length) updated += rows.length;
  else untouched++;
}

if (!dry) console.log(`\ndone — ${updated} rows updated, ${untouched} old URLs not found (already migrated or unused)`);
