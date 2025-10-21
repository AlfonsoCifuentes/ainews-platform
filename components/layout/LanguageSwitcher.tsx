'use client';

import { ChangeEvent, useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { locales, usePathname, useRouter, type Locale } from '@/i18n';

function isLocale(code: string): code is Locale {
  return (locales as readonly string[]).includes(code);
}

export function LanguageSwitcher() {
  const t = useTranslations('common.language');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextLocale = event.target.value;

    if (!isLocale(nextLocale)) {
      return;
    }

    startTransition(() => {
      router.replace(pathname, { locale: nextLocale });
    });
  };

  return (
    <label className="flex items-center gap-2 text-sm text-muted-foreground">
      <span className="hidden sm:inline">{t('switchTo')}</span>
      <span className="sm:hidden" aria-hidden>
        {locale.toUpperCase()}
      </span>
      <select
        className="rounded-full border border-border bg-background/80 px-3 py-1 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        value={locale}
        onChange={handleChange}
        disabled={isPending}
      >
        {locales.map((code) => (
          <option key={code} value={code}>
            {t(code)}
          </option>
        ))}
      </select>
    </label>
  );
}
