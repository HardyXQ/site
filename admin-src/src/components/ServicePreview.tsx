import { useState } from 'react';
import { LANGS, LANG_LABELS, type Lang } from '@/lib/types';
import type { ServiceFormValues } from '@/lib/schemas';
import { formatPrice } from '@/lib/format';
import { pickText } from '@/lib/i18n';
import { cn } from '@/lib/cn';

/**
 * Approximates how the service appears on the public site (dark theme),
 * so the admin can check content before publishing.
 */
export function ServicePreview({
  values,
  categoryName,
}: {
  values: ServiceFormValues;
  categoryName?: Record<Lang, string>;
}) {
  const [lang, setLang] = useState<Lang>('ru');

  const title = values.title[lang] || pickText(values.title, lang);
  const desc = values.description[lang] || pickText(values.description, lang);
  const short = values.short_description[lang] || pickText(values.short_description, lang);
  const price = formatPrice(
    {
      price_type: values.price_type,
      price_amount: values.price_amount,
      price_currency: values.price_currency,
      price_unit: values.price_unit,
    },
    lang,
  );
  const gallery = values.gallery.map((g) => g.image_url);

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <span className="text-xs text-muted">Язык превью:</span>
        <div className="inline-flex rounded-lg border border-border bg-surface-2 p-0.5">
          {LANGS.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLang(l)}
              className={cn(
                'rounded-md px-2 py-0.5 text-xs font-semibold transition',
                lang === l ? 'bg-surface text-ink shadow-sm' : 'text-muted',
              )}
            >
              {LANG_LABELS[l]}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-[#150E20] text-[#FBE8FF]">
        <div className="grid gap-5 p-5 sm:grid-cols-[1.1fr_1fr]">
          <div className="aspect-square overflow-hidden rounded-lg bg-[#ff9298]/20">
            {values.main_image_url ? (
              <img src={values.main_image_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full place-items-center text-sm text-[#FBE8FF]/40">
                нет изображения
              </div>
            )}
          </div>
          <div>
            <h1 className="font-[Unbounded,Inter,sans-serif] text-2xl font-bold uppercase leading-none">
              {title || 'Без названия'}
            </h1>
            {price && (
              <div className="mt-3 inline-flex bg-[#7C25F4] px-2.5 py-1 text-sm font-bold">{price}</div>
            )}
            {short && <p className="mt-3 text-sm text-[#FBE8FF]/70">{short}</p>}
            <div className="mt-5 grid h-9 place-items-center rounded-lg border border-[#FBE8FF]/40 text-sm font-semibold">
              заказать
            </div>
          </div>
        </div>

        {desc && (
          <div
            className="prose-mini border-t border-[#FBE8FF]/10 px-5 py-5 text-sm text-[#FBE8FF]/85 [&_a]:text-[#EE99FF]"
            dangerouslySetInnerHTML={{ __html: desc }}
          />
        )}

        {gallery.length > 0 && (
          <div className="grid grid-cols-3 gap-2 border-t border-[#FBE8FF]/10 p-5">
            {gallery.map((src, i) => (
              <div key={i} className="aspect-square overflow-hidden rounded bg-white/5">
                <img src={src} alt="" className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
        )}
      </div>

      {categoryName && (
        <p className="mt-2 text-xs text-faint">
          Категория: {categoryName[lang] || pickText(categoryName, lang) || '—'} · slug: /{values.slug}
        </p>
      )}
    </div>
  );
}
