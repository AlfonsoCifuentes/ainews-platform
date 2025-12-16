import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'legal' });

  return {
    title: t('terms.title'),
    description: t('terms.intro'),
  };
}

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'legal' });

  return (
    <main className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-6">{t('terms.title')}</h1>
      <div className="space-y-4 text-sm text-muted-foreground max-w-3xl">
        <p>{t('terms.intro')}</p>
        <p>{t('terms.accounts')}</p>
        <p>{t('terms.availability')}</p>
        <p>{t('terms.disclaimer')}</p>
      </div>
    </main>
  );
}
