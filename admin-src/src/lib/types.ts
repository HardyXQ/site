export const LANGS = ['ru', 'uk', 'en'] as const;
export type Lang = (typeof LANGS)[number];

export const LANG_LABELS: Record<Lang, string> = {
  ru: 'RU',
  uk: 'UA',
  en: 'EN',
};

export type I18nText = Partial<Record<Lang, string>>;

export const CURRENCIES = ['USD', 'EUR', 'GBP', 'UAH', 'RUB', 'PLN'] as const;
export type Currency = (typeof CURRENCIES)[number];

export const PRICE_TYPES = ['fixed', 'from', 'on_request'] as const;
export type PriceType = (typeof PRICE_TYPES)[number];

export const PRICE_UNITS = ['item', 'hour', 'minute'] as const;
export type PriceUnit = (typeof PRICE_UNITS)[number];

export interface Category {
  id: string;
  name: I18nText;
  slug: string;
  is_published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ServiceImage {
  id: string;
  service_id: string;
  image_url: string;
  sort_order: number;
  created_at: string;
}

export interface Service {
  id: string;
  title: I18nText;
  slug: string;
  short_description: I18nText;
  description: I18nText;
  price_amount: number | null;
  price_currency: Currency;
  price_type: PriceType;
  price_unit: PriceUnit | null;
  main_image_url: string | null;
  seo_title: I18nText;
  seo_description: I18nText;
  og_image_url: string | null;
  is_published: boolean;
  sort_order: number;
  sub_group: number;
  category_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ServiceWithRelations extends Service {
  category: Category | null;
  images: ServiceImage[];
}

export interface AdminSettings {
  studio_name?: string;
  default_currency?: Currency;
  contact_email?: string;
}
