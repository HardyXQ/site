/**
 * Runtime configuration.
 *
 * Production: `/public-config.js` (served from the site root, shared with the
 * public site) sets `window.WAVESIGN_CONFIG`.
 * Local dev: falls back to Vite env vars from `.env` (see .env.example).
 */
declare global {
  interface Window {
    WAVESIGN_CONFIG?: {
      supabaseUrl?: string;
      supabaseAnonKey?: string;
    };
  }
}

const runtime = typeof window !== 'undefined' ? window.WAVESIGN_CONFIG : undefined;

export const SUPABASE_URL: string =
  runtime?.supabaseUrl || import.meta.env.VITE_SUPABASE_URL || '';

export const SUPABASE_ANON_KEY: string =
  runtime?.supabaseAnonKey || import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const IS_CONFIGURED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const STORAGE_BUCKET = 'service-images';

/** Public site origin — used by the "open on site" / preview links. */
export const PUBLIC_SITE_URL: string =
  runtime && 'publicSiteUrl' in (runtime as Record<string, unknown>)
    ? String((runtime as Record<string, unknown>).publicSiteUrl)
    : import.meta.env.VITE_PUBLIC_SITE_URL || 'https://wavesign.art';
