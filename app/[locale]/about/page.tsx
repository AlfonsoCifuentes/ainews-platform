import { getTranslations, setRequestLocale } from 'next-intl/server';

export default async function AboutPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const t = await getTranslations({ locale: params.locale, namespace: 'home' });
  return (
    <main className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-4">AINews</h1>
      <p className="text-muted-foreground max-w-2xl">
        {t('features.subtitle')}
      </p>
      <div className="mt-6 space-y-3 text-sm text-muted-foreground max-w-2xl">
        <p>• Bilingual (English/Spanish) AI news and learning platform.</p>
        <p>• Zero-cost infra strategy, mobile-first UX, and autonomous agents.</p>
        <p>• Knowledge Graph and personalized learning paths.</p>
      </div>
    </main>
  );
}
