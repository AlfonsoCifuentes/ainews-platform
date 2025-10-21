import { notFound } from 'next/navigation';
import { getRequestConfig } from 'next-intl/server';

// Can be imported from a shared config
const locales = ['en', 'es'] as const;

type Locale = (typeof locales)[number];

function isLocale(locale: string): locale is Locale {
  return (locales as readonly string[]).includes(locale);
}

export default getRequestConfig(async ({ locale }) => {
  // Validate that the incoming `locale` parameter is valid
  if (!locale || !isLocale(locale)) notFound();

  return {
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
