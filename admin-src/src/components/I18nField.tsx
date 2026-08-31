import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { LANGS, LANG_LABELS, type Lang } from '@/lib/types';
import { Field } from './ui/primitives';

type I18nValue = Record<Lang, string>;

export function I18nField({
  label,
  required,
  hint,
  error,
  value,
  onChange,
  children,
}: {
  label: ReactNode;
  required?: boolean;
  hint?: ReactNode;
  error?: string;
  value: I18nValue;
  onChange: (next: I18nValue) => void;
  children: (args: {
    lang: Lang;
    value: string;
    setValue: (v: string) => void;
  }) => ReactNode;
}) {
  const [active, setActive] = useState<Lang>('ru');

  return (
    <Field label={label} required={required} hint={hint} error={error}>
      <div className="mb-1.5 inline-flex rounded-lg border border-border bg-surface-2 p-0.5">
        {LANGS.map((lang) => {
          const filled = value[lang]?.trim().length > 0;
          return (
            <button
              key={lang}
              type="button"
              onClick={() => setActive(lang)}
              className={cn(
                'relative rounded-md px-2.5 py-1 text-xs font-semibold transition',
                active === lang ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink',
              )}
            >
              {LANG_LABELS[lang]}
              <span
                className={cn(
                  'ml-1 inline-block h-1.5 w-1.5 rounded-full align-middle',
                  filled ? 'bg-ok' : 'bg-border',
                )}
              />
            </button>
          );
        })}
      </div>
      {LANGS.map((lang) => (
        <div key={lang} className={active === lang ? 'block' : 'hidden'}>
          {children({
            lang,
            value: value[lang] ?? '',
            setValue: (v) => onChange({ ...value, [lang]: v }),
          })}
        </div>
      ))}
    </Field>
  );
}
