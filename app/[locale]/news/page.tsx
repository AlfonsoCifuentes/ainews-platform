import { setRequestLocale, getTranslations } from 'next-intl/server';
import { locales, type Locale } from '@/i18n';
import { fetchLatestNews } from '@/lib/db/news';
import { getLocalizedString } from '@/lib/utils/i18n';
import { formatRelativeTimeFromNow } from '@/lib/utils/dates';
import Link from 'next/link';

type NewsPageProps = {
  params: {
    locale: Locale;
  };
};

function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export default async function NewsPage({ params }: NewsPageProps) {
  const locale = params.locale;

  if (!isLocale(locale)) {
    throw new Error('Invalid locale received for news page.');
  }

  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'news' });
  const tCommon = await getTranslations({ locale, namespace: 'common' });

  // Fetch MANY more articles (50 instead of 9)
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

  const translateCategory = (category: string) => {
    const validCategories = ['machinelearning', 'nlp', 'computervision', 'robotics', 'ethics'];
    const key = validCategories.includes(category) ? category : 'all';
    return t(`categories.${key}`);
  };

  // Split articles for revolutionary layout
  const [hero, ...restArticles] = articles;
  const featured = restArticles.slice(0, 3);
  const grid = restArticles.slice(3);

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Revolutionary Animated Header */}
      <section className="relative overflow-hidden border-b border-border/50 bg-gradient-to-r from-primary/10 via-purple-500/10 to-pink-500/10 px-4 py-16">
        <div className="absolute inset-0 bg-grid-white/5 [mask-image:radial-gradient(white,transparent_70%)]" />
        <div className="container relative mx-auto">
          <div className="mb-8 flex items-center gap-3">
            <div className="h-1 w-12 bg-gradient-to-r from-primary to-purple-500" />
            <span className="text-sm font-bold uppercase tracking-wider text-primary">
              {locale === 'en' ? 'Latest Intelligence' : 'Última Inteligencia'}
            </span>
          </div>
          <h1 className="mb-4 text-5xl font-black tracking-tight md:text-7xl">
            <span className="bg-gradient-to-r from-foreground via-primary to-purple-600 bg-clip-text text-transparent">
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

      <div className="container mx-auto px-4 py-12">
        {/* HERO Article - Full Width Cinematic */}
        <Link 
          href={`/${locale}/news/${hero.id}`}
          className="group mb-12 block"
        >
          <article className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-primary/20 via-purple-500/20 to-pink-500/20 shadow-2xl shadow-primary/10 transition-all duration-500 hover:scale-[1.02] hover:shadow-3xl hover:shadow-primary/20">
            {/* Background Image with Parallax Effect */}
            <div className="relative h-[60vh] min-h-[500px] w-full overflow-hidden">
              <div
                className="absolute inset-0 scale-110 bg-cover bg-center transition-transform duration-700 group-hover:scale-100"
                style={{ backgroundImage: `url(${hero.image_url})` }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
              
              {/* Floating Category Badge */}
              <div className="absolute left-8 top-8">
                <span className="rounded-full border border-white/30 bg-white/10 px-6 py-2 text-sm font-bold uppercase tracking-wider text-white backdrop-blur-xl">
                  {translateCategory(hero.category)}
                </span>
              </div>

              {/* AI Generated Badge */}
              {hero.ai_generated && (
                <div className="absolute right-8 top-8">
                  <span className="flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-2 text-sm font-bold text-purple-300 backdrop-blur-xl">
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 2a8 8 0 100 16 8 8 0 000-16zM9 9V5h2v4H9zm0 2h2v2H9v-2z" />
                    </svg>
                    AI Generated
                  </span>
                </div>
              )}

              {/* Hero Content */}
              <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
                <div className="mb-4 flex items-center gap-4 text-sm text-white/80">
                  <span>{formatRelativeTimeFromNow(hero.published_at, locale)}</span>
                  <span>•</span>
                  <span>{hero.reading_time_minutes || 5} min {locale === 'en' ? 'read' : 'lectura'}</span>
                  <span>•</span>
                  <span>{Math.round(hero.quality_score * 100)}% {locale === 'en' ? 'Quality' : 'Calidad'}</span>
                </div>
                <h2 className="mb-6 text-4xl font-black leading-tight text-white md:text-6xl">
                  {getLocalizedString(hero, 'title', locale)}
                </h2>
                <p className="mb-8 max-w-3xl text-xl leading-relaxed text-white/90">
                  {getLocalizedString(hero, 'summary', locale)}
                </p>
                <div className="inline-flex items-center gap-3 rounded-full bg-white px-8 py-4 text-base font-bold text-primary transition-all duration-300 group-hover:gap-5 group-hover:bg-primary group-hover:text-white">
                  {tCommon('buttons.readMore')}
                  <svg className="h-5 w-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              </div>
            </div>
          </article>
        </Link>

        {/* FEATURED Articles - 3 Column Grid */}
        <div className="mb-12 grid gap-6 md:grid-cols-3">
          {featured.map((article) => (
            <Link 
              key={article.id}
              href={`/${locale}/news/${article.id}`}
              className="group"
            >
              <article className="relative h-full overflow-hidden rounded-3xl border border-border/50 bg-card backdrop-blur-xl transition-all duration-300 hover:-translate-y-2 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10">
                {/* Image */}
                <div className="relative h-56 overflow-hidden">
                  <div
                    className="absolute inset-0 scale-105 bg-cover bg-center transition-transform duration-500 group-hover:scale-100"
                    style={{ backgroundImage: `url(${article.image_url})` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
                  
                  {/* Category Badge */}
                  <div className="absolute left-4 top-4">
                    <span className="rounded-full bg-primary/90 px-3 py-1 text-xs font-bold text-primary-foreground backdrop-blur-sm">
                      {translateCategory(article.category)}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatRelativeTimeFromNow(article.published_at, locale)}</span>
                    <span>•</span>
                    <span>{article.reading_time_minutes || 5} min</span>
                  </div>
                  <h3 className="mb-3 line-clamp-2 text-xl font-bold transition-colors group-hover:text-primary">
                    {getLocalizedString(article, 'title', locale)}
                  </h3>
                  <p className="line-clamp-3 text-sm text-muted-foreground">
                    {getLocalizedString(article, 'summary', locale)}
                  </p>
                </div>
              </article>
            </Link>
          ))}
        </div>

        {/* MASONRY Grid - Revolutionary Bento Layout */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {grid.map((article, index) => {
            // Create variety in card sizes for Masonry effect
            const isLarge = index % 7 === 0;
            const isMedium = index % 5 === 0;
            const colSpan = isLarge ? 'lg:col-span-2' : isMedium ? 'lg:col-span-2 md:col-span-2' : '';
            const rowSpan = isLarge ? 'lg:row-span-2' : '';

            return (
              <Link 
                key={article.id}
                href={`/${locale}/news/${article.id}`}
                className={`group ${colSpan} ${rowSpan}`}
              >
                <article className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm transition-all duration-300 hover:border-primary/50 hover:bg-card hover:shadow-lg hover:shadow-primary/5">
                  {/* Image */}
                  <div className={`relative overflow-hidden ${isLarge ? 'h-80' : 'h-48'}`}>
                    <div
                      className="absolute inset-0 scale-105 bg-cover bg-center transition-transform duration-500 group-hover:scale-100"
                      style={{ backgroundImage: `url(${article.image_url})` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                    
                    {/* Floating Metadata */}
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                      <span className="rounded-full bg-primary/20 px-3 py-1 text-xs font-semibold text-primary backdrop-blur-md">
                        {translateCategory(article.category)}
                      </span>
                      <span className="text-xs text-white/80">
                        {formatRelativeTimeFromNow(article.published_at, locale)}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className={`mb-2 font-bold transition-colors group-hover:text-primary ${isLarge ? 'text-2xl' : 'text-lg'}`}>
                      {getLocalizedString(article, 'title', locale)}
                    </h3>
                    <p className={`mb-4 flex-1 text-sm text-muted-foreground ${isLarge ? 'line-clamp-4' : 'line-clamp-2'}`}>
                      {getLocalizedString(article, 'summary', locale)}
                    </p>
                    
                    {/* Footer */}
                    <div className="flex items-center justify-between border-t border-border/50 pt-3 text-xs text-muted-foreground">
                      <span>{article.reading_time_minutes || 5} min</span>
                      <div className="flex items-center gap-2 font-semibold text-primary">
                        {locale === 'en' ? 'Read' : 'Leer'}
                        <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </article>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
