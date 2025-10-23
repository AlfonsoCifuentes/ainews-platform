import { setRequestLocale, getTranslations } from 'next-intl/server';
import { locales, type Locale } from '@/i18n';
import { getSupabaseServerClient } from '@/lib/db/supabase';
import { getLocalizedString } from '@/lib/utils/i18n';
import { formatRelativeTimeFromNow } from '@/lib/utils/dates';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { INewsArticle } from '@/lib/types/news';

type NewsDetailPageProps = {
  params: Promise<{
    locale: Locale;
    id: string;
  }>;
};

function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

async function fetchArticleById(id: string): Promise<INewsArticle | null> {
  const supabase = getSupabaseServerClient();
  
  const { data, error } = await supabase
    .from('news_articles')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    console.error('Error fetching article:', error);
    return null;
  }

  return data as INewsArticle;
}

async function fetchRelatedArticles(category: string, currentId: string, limit = 3): Promise<INewsArticle[]> {
  const supabase = getSupabaseServerClient();
  
  const { data, error } = await supabase
    .from('news_articles')
    .select('*')
    .eq('category', category)
    .neq('id', currentId)
    .order('published_at', { ascending: false })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return data as INewsArticle[];
}

export default async function NewsDetailPage({ params }: NewsDetailPageProps) {
  const { locale, id } = await params;

  if (!isLocale(locale)) {
    throw new Error('Invalid locale received for news detail page.');
  }

  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'news' });

  const article = await fetchArticleById(id);

  if (!article) {
    notFound();
  }

  const relatedArticles = await fetchRelatedArticles(article.category, article.id);

  const translateCategory = (category: string) => {
    const validCategories = ['machinelearning', 'nlp', 'computervision', 'robotics', 'ethics'];
    const key = validCategories.includes(category) ? category : 'all';
    return t(`categories.${key}`);
  };

  const title = getLocalizedString(article, 'title', locale);
  const summary = getLocalizedString(article, 'summary', locale);
  const content = getLocalizedString(article, 'content', locale);

  return (
    <main className="min-h-screen">
      {/* Hero Image Section */}
      <section className="relative h-[70vh] min-h-[500px] w-full overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${article.image_url})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/30" />
        
        {/* Breadcrumb Navigation */}
        <div className="container relative mx-auto px-4 pt-8">
          <nav className="flex items-center gap-2 text-sm text-white/80">
            <Link href={`/${locale}`} className="hover:text-white">
              {locale === 'en' ? 'Home' : 'Inicio'}
            </Link>
            <span>/</span>
            <Link href={`/${locale}/news`} className="hover:text-white">
              {t('title')}
            </Link>
            <span>/</span>
            <span className="text-white">{translateCategory(article.category)}</span>
          </nav>
        </div>

        {/* Article Title Overlay */}
        <div className="absolute bottom-0 left-0 right-0">
          <div className="container mx-auto px-4 pb-12">
            {/* Category Badge */}
            <div className="mb-6 flex items-center gap-3">
              <span className="rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm font-bold uppercase tracking-wider text-white backdrop-blur-xl">
                {translateCategory(article.category)}
              </span>
              {article.ai_generated && (
                <span className="flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-2 text-sm font-bold text-purple-300 backdrop-blur-xl">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 2a8 8 0 100 16 8 8 0 000-16zM9 9V5h2v4H9zm0 2h2v2H9v-2z" />
                  </svg>
                  AI Generated
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="mb-6 max-w-5xl text-4xl font-black leading-tight text-white md:text-6xl lg:text-7xl">
              {title}
            </h1>

            {/* Metadata */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-white/80">
              <span>{formatRelativeTimeFromNow(article.published_at, locale)}</span>
              <span>•</span>
              <span>{article.reading_time_minutes || 5} min {locale === 'en' ? 'read' : 'lectura'}</span>
              <span>•</span>
              <span>{Math.round(article.quality_score * 100)}% {locale === 'en' ? 'Quality Score' : 'Puntuación de Calidad'}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Article Content */}
      <article className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-4xl">
          {/* Summary */}
          <div className="mb-12 rounded-3xl border border-primary/20 bg-primary/5 p-8">
            <h2 className="mb-4 text-2xl font-bold text-primary">
              {locale === 'en' ? 'Summary' : 'Resumen'}
            </h2>
            <p className="text-lg leading-relaxed text-foreground/90">
              {summary}
            </p>
          </div>

          {/* Main Content */}
          <div className="prose prose-lg dark:prose-invert max-w-none">
            {content ? (
              <div dangerouslySetInnerHTML={{ __html: content }} />
            ) : (
              <p className="whitespace-pre-wrap text-base leading-relaxed">
                {summary}
              </p>
            )}
          </div>

          {/* Source Link */}
          {article.source_url && (
            <div className="mt-12 rounded-2xl border border-border bg-card p-6">
              <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {locale === 'en' ? 'Original Source' : 'Fuente Original'}
              </p>
              <a
                href={article.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-lg font-semibold text-primary hover:underline"
              >
                {locale === 'en' ? 'Read original article' : 'Leer artículo original'}
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          )}

          {/* Share Buttons */}
          <div className="mt-12 flex items-center gap-4">
            <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {locale === 'en' ? 'Share:' : 'Compartir:'}
            </span>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    navigator.clipboard.writeText(window.location.href);
                  }
                }}
                className="rounded-full border border-border bg-card p-3 transition-all hover:border-primary hover:bg-primary/10"
                aria-label={locale === 'en' ? 'Copy link' : 'Copiar enlace'}
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </article>

      {/* Related Articles */}
      {relatedArticles.length > 0 && (
        <section className="border-t border-border bg-muted/30 py-16">
          <div className="container mx-auto px-4">
            <h2 className="mb-8 text-3xl font-black md:text-4xl">
              {locale === 'en' ? 'Related Articles' : 'Artículos Relacionados'}
            </h2>
            <div className="grid gap-6 md:grid-cols-3">
              {relatedArticles.map((related) => (
                <Link
                  key={related.id}
                  href={`/${locale}/news/${related.id}`}
                  className="group"
                >
                  <article className="h-full overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:-translate-y-2 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10">
                    {/* Image */}
                    <div className="relative h-48 overflow-hidden">
                      <div
                        className="absolute inset-0 scale-105 bg-cover bg-center transition-transform duration-500 group-hover:scale-100"
                        style={{ backgroundImage: `url(${related.image_url})` }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
                    </div>

                    {/* Content */}
                    <div className="p-6">
                      <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{translateCategory(related.category)}</span>
                        <span>•</span>
                        <span>{related.reading_time_minutes || 5} min</span>
                      </div>
                      <h3 className="mb-2 line-clamp-2 text-xl font-bold transition-colors group-hover:text-primary">
                        {getLocalizedString(related, 'title', locale)}
                      </h3>
                      <p className="line-clamp-3 text-sm text-muted-foreground">
                        {getLocalizedString(related, 'summary', locale)}
                      </p>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Back to News */}
      <div className="container mx-auto px-4 py-8">
        <Link
          href={`/${locale}/news`}
          className="inline-flex items-center gap-2 text-primary hover:underline"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {locale === 'en' ? 'Back to all news' : 'Volver a todas las noticias'}
        </Link>
      </div>
    </main>
  );
}
