import { getTranslations, setRequestLocale } from 'next-intl/server';
import Image from 'next/image';

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'home' });
  return (
    <main className="container mx-auto px-4 py-12">
      <div className="flex items-center gap-4 mb-6">
        <Image 
          src="/logos/thotnet-core-white-only.svg" 
          alt="ThotNet Core Logo" 
          width={64}
          height={64}
          className="drop-shadow-[0_0_20px_rgba(59,130,246,0.6)]"
        />
        <h1 className="text-3xl font-bold">ThotNet Core</h1>
      </div>
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
