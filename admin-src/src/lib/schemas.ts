import { z } from 'zod';
import { CURRENCIES, PRICE_TYPES, PRICE_UNITS } from './types';
import { isValidSlug } from './slug';

const i18nText = z.object({
  ru: z.string().trim().default(''),
  uk: z.string().trim().default(''),
  en: z.string().trim().default(''),
});

const i18nRequiredRu = i18nText.refine((v) => v.ru.length > 0, {
  message: 'Заполните русскую версию',
  path: ['ru'],
});

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Введите email').email('Некорректный email'),
  password: z.string().min(1, 'Введите пароль'),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const galleryItemSchema = z.object({
  id: z.string().optional(),
  image_url: z.string().url(),
  sort_order: z.number().int(),
});

export const serviceSchema = z
  .object({
    title: i18nRequiredRu,
    slug: z
      .string()
      .trim()
      .min(2, 'Минимум 2 символа')
      .max(80, 'Максимум 80 символов')
      .refine(isValidSlug, 'Только строчные латинские буквы, цифры и дефис'),
    category_id: z.string().uuid().nullable(),
    short_description: i18nText,
    description: i18nText,
    price_type: z.enum(PRICE_TYPES),
    price_amount: z
      .number({ invalid_type_error: 'Введите число' })
      .nonnegative('Цена не может быть отрицательной')
      .max(9_999_999, 'Слишком большое значение')
      .nullable(),
    price_currency: z.enum(CURRENCIES),
    price_unit: z.enum(PRICE_UNITS).nullable(),
    main_image_url: z.string().url().nullable(),
    gallery: z.array(galleryItemSchema).default([]),
    is_published: z.boolean(),
    sort_order: z.number().int().min(0).max(100000),
    sub_group: z.number().int().min(0).max(50),
    seo_title: i18nText,
    seo_description: i18nText,
    og_image_url: z.string().url().nullable(),
  })
  .superRefine((val, ctx) => {
    if (val.price_type !== 'on_request' && (val.price_amount == null || Number.isNaN(val.price_amount))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Укажите цену или выберите «Цена по запросу»',
        path: ['price_amount'],
      });
    }
  });

export type ServiceFormValues = z.infer<typeof serviceSchema>;

export const categorySchema = z.object({
  name: i18nRequiredRu,
  slug: z
    .string()
    .trim()
    .min(2, 'Минимум 2 символа')
    .max(60)
    .refine(isValidSlug, 'Только строчные латинские буквы, цифры и дефис'),
  is_published: z.boolean(),
});
export type CategoryFormValues = z.infer<typeof categorySchema>;
