import { setRequestLocale, getTranslations } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { fetchLatestNews } from '@/lib/db/news';
import { NewsContent } from '@/components/news/NewsContent';
import { generateLocalizedMetadata } from '@/lib/utils/seo';
import { Metadata } from 'next';

type Locale = (typeof routing.locales)[number];

type NewsPageProps = {
  params: Promise<{
    locale: Locale;
  }>;
};

// ISR: Revalidate every 10 minutes (600 seconds)
// Fresh news every 10 min while keeping page pre-rendered
export const revalidate = 600;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// Generate metadata with alternates
export async function generateMetadata({ params }: NewsPageProps): Promise<Metadata> {
  const { locale } = await params;
  
  const title = locale === 'en' ? 'Latest AI News' : 'Últimas Noticias de IA';
  const description =
    locale === 'en'
      ? 'Stay updated with the latest artificial intelligence news, breakthroughs, and developments from around the world.'
      : 'Mantente actualizado con las últimas noticias de inteligencia artificial, avances y desarrollos de todo el mundo.';

  return generateLocalizedMetadata(title, description, `/${locale}/news`, locale, {
    keywords: locale === 'en' 
      ? ['AI news', 'artificial intelligence', 'machine learning', 'tech news']
      : ['noticias IA', 'inteligencia artificial', 'aprendizaje automático', 'noticias tecnológicas'],
    type: 'website',
  });
}

export default async function NewsPage({ params }: NewsPageProps) {
  const { locale } = await params;

  setRequestLocale(locale);

  const t = await getTranslations('news');

  // Fetch initial batch of articles (maximum allowed for better client-side filtering)
  const articles = await fetchLatestNews({ locale, limit: 50 });

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

  return <NewsContent initialArticles={articles} locale={locale} />;
}
