import { setRequestLocale, getTranslations } from 'next-intl/server';
import { locales, type Locale } from '@/i18n';
import { fetchLatestNews, deriveCategoriesFromArticles } from '@/lib/db/news';
import { getLocalizedString } from '@/lib/utils/i18n';
import { formatRelativeTimeFromNow } from '@/lib/utils/dates';

type NewsPageProps = {
  params: {
    locale: Locale;
  };
};

const articleCategoryKeys = [
  'machinelearning',
  'nlp',
  'computervision',
  'robotics',
  'ethics',
] as const;

type ArticleCategoryKey = (typeof articleCategoryKeys)[number];

function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

function isArticleCategoryKey(value: string): value is ArticleCategoryKey {
  return (articleCategoryKeys as readonly string[]).includes(value);
}

export default async function NewsPage({ params }: NewsPageProps) {
  const locale = params.locale;

  if (!isLocale(locale)) {
    throw new Error('Invalid locale received for news page.');
  }

  setRequestLocale(locale);

  const [tNews, tCommon] = await Promise.all([
    getTranslations({ locale, namespace: 'news' }),
    getTranslations({ locale, namespace: 'common' }),
  ]);

  const articles = await fetchLatestNews({ locale, limit: 9 });

  if (articles.length === 0) {
    return (
      <main className="min-h-screen px-4 py-16">
        <div className="container mx-auto max-w-3xl text-center">
          <h1 className="mb-4 text-4xl font-bold md:text-5xl">{tNews('title')}</h1>
          <p className="text-lg text-muted-foreground">{tNews('empty.subtitle')}</p>
        </div>
      </main>
    );
  }

  const [featured, ...rest] = articles;
  const categories = deriveCategoriesFromArticles(articles).filter(
    (category): category is ArticleCategoryKey => isArticleCategoryKey(category),
  );
  const availableCategoryKeys: Array<'all' | ArticleCategoryKey> = ['all', ...categories];

  const translateCategory = (category: string) => {
    const key = isArticleCategoryKey(category) ? category : 'all';
    try {
      return tNews(`categories.${key}`);
    } catch (error) {
      console.error(`Translation error for category.${key}:`, error);
      return key.charAt(0).toUpperCase() + key.slice(1);
    }
  };

  return (
    <main className="min-h-screen px-4 py-12">
      <div className="container mx-auto">
        <header className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 text-sm uppercase tracking-widest text-primary">IA Today</p>
            <h1 className="text-4xl font-bold md:text-5xl">{tNews('title')}</h1>
          </div>
          <div className="flex flex-wrap gap-3">
            {availableCategoryKeys.map((key) => (
              <span
                key={key}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-transform ${
                  key === 'all'
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
                    : 'glass hover:scale-105'
                }`}
              >
                {translateCategory(key)}
              </span>
            ))}
          </div>
        </header>

        <section className="mb-12 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <article className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/15 via-background to-primary/5 p-0 shadow-xl">
            <div className="relative h-64 w-full overflow-hidden md:h-80">
              <div
                aria-hidden
                className="absolute inset-0 scale-105 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                style={{ backgroundImage: `url(${featured.image_url})` }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                <div className="mb-4 flex items-center gap-3 text-sm text-white/80">
                  <span className="rounded-full bg-white/10 px-3 py-1">
                    {translateCategory(featured.category)}
                  </span>
                  <span>{formatRelativeTimeFromNow(featured.published_at, locale)}</span>
                  {featured.ai_generated && (
                    <span className="rounded-full bg-white/10 px-3 py-1">
                      {tNews('card.aiGenerated')}
                    </span>
                  )}
                </div>
                <h2 className="mb-4 text-3xl font-bold md:text-4xl">
                  {getLocalizedString(featured, 'title', locale)}
                </h2>
                <p className="max-w-2xl text-base text-white/90 md:text-lg">
                  {getLocalizedString(featured, 'summary', locale)}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{tNews('card.readTime', { minutes: featured.reading_time_minutes })}</span>
                <span>•</span>
                <span>{new Intl.NumberFormat(locale).format(Math.round(featured.quality_score * 100))}% IQ</span>
              </div>
              <a
                href={featured.source_url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-transform hover:scale-105"
              >
                {tCommon('buttons.readMore')}
                <span aria-hidden>→</span>
              </a>
            </div>
          </article>

          <div className="grid gap-4">
            {rest.slice(0, 2).map((article) => (
              <article key={article.id} className="glass group rounded-3xl p-6 transition-transform hover:-translate-y-1">
                <div className="mb-3 flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-primary">
                  <span>{translateCategory(article.category)}</span>
                  <span className="text-muted-foreground">
                    {formatRelativeTimeFromNow(article.published_at, locale)}
                  </span>
                </div>
                <h3 className="mb-3 text-2xl font-bold text-foreground">
                  {getLocalizedString(article, 'title', locale)}
                </h3>
                <p className="line-clamp-3 text-sm text-muted-foreground">
                  {getLocalizedString(article, 'summary', locale)}
                </p>
                <div className="mt-6 flex items-center justify-between text-sm text-muted-foreground">
                  <span>{tNews('card.readTime', { minutes: article.reading_time_minutes })}</span>
                  <a
                    href={article.source_url || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-primary transition-colors hover:text-primary/80"
                  >
                    {tCommon('buttons.readMore')}
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {rest.slice(2).map((article) => (
            <article key={article.id} className="glass group flex flex-col overflow-hidden rounded-3xl">
              <div className="relative h-48 w-full overflow-hidden">
                <div
                  aria-hidden
                  className="absolute inset-0 scale-105 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                  style={{ backgroundImage: `url(${article.image_url})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-white/80">
                  <span>{translateCategory(article.category)}</span>
                  <span>{formatRelativeTimeFromNow(article.published_at, locale)}</span>
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-4 p-6">
                <h3 className="text-xl font-bold text-foreground">
                  {getLocalizedString(article, 'title', locale)}
                </h3>
                <p className="flex-1 text-sm text-muted-foreground">
                  {getLocalizedString(article, 'summary', locale)}
                </p>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{tNews('card.readTime', { minutes: article.reading_time_minutes })}</span>
                  <a
                    href={article.source_url || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-primary transition-colors hover:text-primary/80"
                  >
                    {tCommon('buttons.readMore')}
                  </a>
                </div>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
