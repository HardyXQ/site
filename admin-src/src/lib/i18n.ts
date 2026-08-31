import { LANGS, type I18nText, type Lang } from './types';

/** Pick the best available translation: requested lang → ru → uk → en → any → ''. */
export function pickText(value: I18nText | null | undefined, lang: Lang = 'ru'): string {
  if (!value) return '';
  if (value[lang]?.trim()) return value[lang]!.trim();
  for (const l of ['ru', 'uk', 'en'] as Lang[]) {
    if (value[l]?.trim()) return value[l]!.trim();
  }
  const first = Object.values(value).find((v) => v?.trim());
  return first ?? '';
}

/** Normalize an i18n object so it always has all three keys (as strings). */
export function normalizeI18n(value: I18nText | null | undefined): Record<Lang, string> {
  const out = {} as Record<Lang, string>;
  for (const l of LANGS) out[l] = value?.[l] ?? '';
  return out;
}

/** True when at least the ru text is present. */
export function hasPrimaryText(value: I18nText | null | undefined): boolean {
  return Boolean(pickText(value, 'ru'));
}

/** Strip HTML tags to plain text (for short descriptions / previews). */
export function stripHtml(html: string): string {
  const el = document.createElement('div');
  el.innerHTML = html;
  return (el.textContent || '').replace(/\s+/g, ' ').trim();
}
