import { setRequestLocale, getTranslations } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { fetchLatestNews } from '@/lib/db/news';
import { NewsGridClient } from '@/components/news/NewsGridClient';

type Locale = (typeof routing.locales)[number];

type NewsPageProps = {
  params: Promise<{
    locale: Locale;
  }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function NewsPage({ params }: NewsPageProps) {
  const { locale } = await params;

  setRequestLocale(locale);

  const t = await getTranslations('news');

  // Fetch initial batch of articles (first 20 for SSR)
  const articles = await fetchLatestNews({ locale, limit: 20 });

  if (articles.length === 0) {
    return (
      <main className="min-h-screen px-4 py-16">
        <div className="container mx-auto max-w-3xl text-center">
          <h1 className="mb-4 text-4xl font-bold md:text-5xl">{t('title')}</h1>
          <p className="text-lg text-muted-foreground">{t('empty.subtitle')}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Revolutionary Animated Header */}
      <section className="relative overflow-hidden border-b border-border/50 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/5 px-4 py-16">
        <div className="absolute inset-0 bg-grid-white/5 [mask-image:radial-gradient(white,transparent_70%)]" />
        <div className="container relative mx-auto">
          <div className="mb-8 flex items-center gap-3">
            <div className="h-1 w-12 bg-gradient-to-r from-primary to-accent" />
            <span className="text-sm font-bold uppercase tracking-wider text-primary">
              {locale === 'en' ? 'Latest Intelligence' : 'Última Inteligencia'}
            </span>
          </div>
          <h1 className="mb-4 text-5xl font-black tracking-tight md:text-7xl">
            <span className="bg-gradient-to-r from-foreground via-primary to-accent bg-clip-text text-transparent">
              {t('title')}
            </span>
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground">
            {locale === 'en' 
              ? 'Real-time AI news from the cutting edge. Curated by intelligent agents, verified by experts.'
              : 'Noticias de IA en tiempo real desde la vanguardia. Curadas por agentes inteligentes, verificadas por expertos.'}
          </p>
        </div>
      </section>

      <NewsGridClient initialArticles={articles} locale={locale} />
    </main>
  );
}
