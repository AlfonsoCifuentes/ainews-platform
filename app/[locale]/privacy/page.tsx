import { getTranslations, setRequestLocale } from 'next-intl/server';

export default async function PrivacyPolicyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'legal' });

  return (
    <main className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-6">{t('privacy.title')}</h1>
      <div className="space-y-4 text-sm text-muted-foreground max-w-3xl">
        <p>{t('privacy.intro')}</p>
        <p>{t('privacy.adsense')}</p>
        <p>{t('privacy.analytics')}</p>
        <p>{t('privacy.control')}</p>
        <p className="text-xs">{t('privacy.disclaimer')}</p>
      </div>
    </main>
  );
}
