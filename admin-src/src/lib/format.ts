import type { Currency, Lang, PriceType, PriceUnit } from './types';

interface CurrencyMeta {
  symbol: string;
  placement: 'before' | 'after';
}

export const CURRENCY_META: Record<Currency, CurrencyMeta> = {
  USD: { symbol: '$', placement: 'before' },
  EUR: { symbol: '€', placement: 'before' },
  GBP: { symbol: '£', placement: 'before' },
  UAH: { symbol: '₴', placement: 'after' },
  RUB: { symbol: '₽', placement: 'after' },
  PLN: { symbol: 'zł', placement: 'after' },
};

const FROM_PREFIX: Record<Lang, string> = { ru: 'от', uk: 'від', en: 'from' };

const ON_REQUEST: Record<Lang, string> = {
  ru: 'Цена по запросу',
  uk: 'Ціна за запитом',
  en: 'Price on request',
};

const UNIT_LABEL: Record<PriceUnit, Record<Lang, string>> = {
  item: { ru: '/ шт.', uk: '/ шт.', en: '/ item' },
  hour: { ru: '/ час', uk: '/ год', en: '/ hr' },
  minute: { ru: '/ мин', uk: '/ хв', en: '/ min' },
};

export function formatAmount(amount: number, lang: Lang): string {
  const locale = lang === 'en' ? 'en-US' : lang === 'uk' ? 'uk-UA' : 'ru-RU';
  const hasFraction = Math.abs(amount % 1) > 0.0001;
  return amount.toLocaleString(locale, {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  });
}

export function formatMoney(amount: number, currency: Currency, lang: Lang): string {
  const meta = CURRENCY_META[currency] ?? CURRENCY_META.USD;
  const num = formatAmount(amount, lang);
  return meta.placement === 'before' ? `${meta.symbol}${num}` : `${num} ${meta.symbol}`;
}

export interface PriceInput {
  price_type: PriceType;
  price_amount: number | null;
  price_currency: Currency;
  price_unit: PriceUnit | null;
}

/** Human price label exactly as the public site renders it. */
export function formatPrice(service: PriceInput, lang: Lang = 'ru'): string {
  if (service.price_type === 'on_request') return ON_REQUEST[lang];
  if (service.price_amount == null) return '';

  const parts: string[] = [];
  if (service.price_type === 'from') parts.push(FROM_PREFIX[lang]);
  parts.push(formatMoney(service.price_amount, service.price_currency, lang));
  if (service.price_unit) parts.push(UNIT_LABEL[service.price_unit][lang]);
  return parts.join(' ');
}

export function formatDateTime(iso: string, lang: Lang = 'ru'): string {
  const locale = lang === 'en' ? 'en-US' : lang === 'uk' ? 'uk-UA' : 'ru-RU';
  return new Date(iso).toLocaleString(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelative(iso: string, lang: Lang = 'ru'): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60000);
  const rtf = new Intl.RelativeTimeFormat(lang === 'en' ? 'en' : lang === 'uk' ? 'uk' : 'ru', {
    numeric: 'auto',
  });
  if (Math.abs(min) < 60) return rtf.format(-min, 'minute');
  const hours = Math.round(min / 60);
  if (Math.abs(hours) < 24) return rtf.format(-hours, 'hour');
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 30) return rtf.format(-days, 'day');
  return formatDateTime(iso, lang);
}
