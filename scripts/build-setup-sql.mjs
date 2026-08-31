/**
 * Concatenates all migrations + the generated seed into supabase/setup.sql,
 * so it can be pasted into the Supabase SQL Editor in one go.
 *
 *   npm run setup:sql
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// refresh seed.sql from the current site content first
execFileSync(process.execPath, [join(root, 'scripts/build-seed.mjs')], { stdio: 'inherit' });

const migrationsDir = join(root, 'supabase/migrations');
const files = readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();

const parts = [
  '-- WaveSign — full database setup. Run once in the Supabase SQL Editor.',
  '-- (Regenerate with: npm run setup:sql)',
  '',
];
for (const f of files) {
  parts.push(`-- ================= supabase/migrations/${f} =================`);
  parts.push(readFileSync(join(migrationsDir, f), 'utf8').trimEnd(), '');
}
parts.push('-- ================= supabase/seed.sql =================');
parts.push(readFileSync(join(root, 'supabase/seed.sql'), 'utf8').trimEnd(), '');

writeFileSync(join(root, 'supabase/setup.sql'), parts.join('\n') + '\n', 'utf8');
console.log(`supabase/setup.sql written (${files.length} migrations + seed)`);
