/**
 * Runtime configuration for the public site AND the admin panel (/admin).
 * Loaded from the site root as a plain script — safe to commit.
 *
 * The anon key is a *public* key: it only permits what the database's
 * Row-Level Security policies allow (public read of published rows).
 * All writes require an authenticated administrator. Never put the
 * service_role key here.
 *
 * Fill PROD_SUPABASE_URL / PROD_SUPABASE_ANON_KEY with the values from
 * Supabase → Project Settings → API.
 */
(function () {
  var PROD = {
    supabaseUrl: 'https://etdsqzlyzsuqeqdczajz.supabase.co',
    supabaseAnonKey:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0ZHNxemx5enN1cWVxZGN6YWp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxNzM2ODgsImV4cCI6MjEwMzc0OTY4OH0.BjgGaV6WRCuyNvl8f5r220F5XEtH3lOuiy-aneo8b4E',
    publicSiteUrl: 'https://wavesign.art',
  };

  // Local development (npm run db:start) — the local anon key is a fixed public demo key.
  var LOCAL = {
    supabaseUrl: 'http://127.0.0.1:54321',
    supabaseAnonKey:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
    publicSiteUrl: location.origin,
  };

  var host = location.hostname;
  var isLocal = host === 'localhost' || host === '127.0.0.1' || host === '';
  window.WAVESIGN_CONFIG = isLocal ? LOCAL : PROD;
})();
