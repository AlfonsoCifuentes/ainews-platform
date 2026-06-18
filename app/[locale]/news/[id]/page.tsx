import type { Metadata } from 'next';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { locales, type Locale } from '@/i18n';
import { getSupabaseServerClient } from '@/lib/db/supabase';
import { getLocalizedString } from '@/lib/utils/i18n';
import { formatRelativeTimeFromNow } from '@/lib/utils/dates';
import { getImageWithFallback } from '@/lib/utils/generate-fallback-image';
import {
  calculateReadingTime,
  extractPlainText,
  normalizeNewsArticleMarkdown,
  sanitizeScrapedContent,
} from '@/lib/utils/content-formatter';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { INewsArticle } from '@/lib/types/news';
import { CorroborationBadge } from '@/components/news/CorroborationBadge';
import { CopyLinkButton } from '@/components/news/CopyLinkButton';
import { JsonLd } from '@/components/seo/JsonLd';
import { SITE_NAME, SITE_BASE_URL } from '@/lib/config/site';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';

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

export async function generateMetadata({ params }: NewsDetailPageProps): Promise<Metadata> {
  const { locale, id } = await params;
  const article = await fetchArticleById(id);
  if (!article) return { title: `Not found · ${SITE_NAME}` };

  const title = getLocalizedString(article, 'title', locale);
  const description = sanitizeScrapedContent(getLocalizedString(article, 'summary', locale)).slice(0, 200);
  const canonical = `${SITE_BASE_URL}/${locale}/news/${id}`;
  const image = article.image_url || undefined;

  return {
    title,
    description,
    alternates: {
      canonical,
      languages: {
        en: `${SITE_BASE_URL}/en/news/${id}`,
        es: `${SITE_BASE_URL}/es/news/${id}`,
      },
    },
    openGraph: {
      type: 'article',
      title,
      description,
      url: canonical,
      siteName: SITE_NAME,
      publishedTime: article.published_at,
      locale: locale === 'es' ? 'es_ES' : 'en_US',
      images: image ? [{ url: image, alt: title }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
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
    // Map category to explicit translation keys
    switch (category) {
      case 'machinelearning':
        return t('categories.machinelearning');
      case 'nlp':
        return t('categories.nlp');
      case 'computervision':
        return t('categories.computervision');
      case 'robotics':
        return t('categories.robotics');
      case 'ethics':
        return t('categories.ethics');
      default:
        return t('categories.all');
    }
  };

  const title = getLocalizedString(article, 'title', locale);
  const summary = sanitizeScrapedContent(getLocalizedString(article, 'summary', locale));
  const content = getLocalizedString(article, 'content', locale);
  
  // Calculate reading time from content
  const textForReadingTime = content || summary || '';
  const plainText = extractPlainText(textForReadingTime);
  const readingTime = calculateReadingTime(plainText);


  const normalizedMarkdown = (() => {
    const raw = normalizeNewsArticleMarkdown(content || '');
    if (!raw) return '';
    return raw
      .replace(/^\s*[-=]{3,}\s*$/gm, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  })();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: title,
    description: summary,
    image: article.image_url ? [article.image_url] : undefined,
    datePublished: article.published_at,
    dateModified: article.published_at,
    inLanguage: locale,
    author: { '@type': 'Organization', name: SITE_NAME },
    publisher: { '@type': 'Organization', name: SITE_NAME },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE_BASE_URL}/${locale}/news/${article.id}` },
  };

  const heroImage = getImageWithFallback(article.image_url, title, article.category, article.id);

  return (
    <main className="min-h-screen">
      <JsonLd data={jsonLd} />
      {/* Hero Image Section */}
      <section className="relative h-[70vh] min-h-[500px] w-full overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url("${heroImage}")` }}
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
              <span>{readingTime} min {locale === 'en' ? 'read' : 'lectura'}</span>
              <span>•</span>
              <span>{Math.round(article.quality_score * 100)}% {locale === 'en' ? 'Quality Score' : 'Puntuación de Calidad'}</span>
              <CorroborationBadge count={article.corroboration_count ?? 1} locale={locale} />
            </div>
          </div>
        </div>
      </section>

      {/* Article Content */}
      <article className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-4xl">
          {/* Summary */}
          <div className="mb-12 border-l-2 border-signal bg-signal/[0.06] p-8">
            <h2 className="mb-4 font-mono text-xs font-medium uppercase tracking-[0.25em] text-signal-soft">
              {locale === 'en' ? 'The gist' : 'En resumen'}
            </h2>
            <p className="text-lg leading-relaxed text-foreground/90">
              {summary}
            </p>
          </div>

          {/* Main Content */}
          <div className="prose prose-lg dark:prose-invert max-w-none prose-headings:font-bold prose-p:leading-relaxed prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-img:rounded-2xl prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:pl-4 prose-blockquote:italic">
            {normalizedMarkdown ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw, rehypeSanitize]}
                components={{
                  h1: ({ children }) => (
                    <h2 className="mt-10 text-3xl font-black leading-tight text-foreground">
                      {children}
                    </h2>
                  ),
                  h2: ({ children }) => (
                    <h2 className="mt-10 text-3xl font-black leading-tight text-foreground">
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="mt-8 text-2xl font-bold leading-tight text-foreground">
                      {children}
                    </h3>
                  ),
                }}
              >
                {normalizedMarkdown}
              </ReactMarkdown>
            ) : (
              <div className="space-y-6">
                {summary.split('\n\n').map((paragraph, index) => (
                  paragraph.trim() && (
                    <p key={index} className="leading-relaxed text-base md:text-lg text-foreground/90 first-letter:text-2xl first-letter:font-bold first-letter:text-primary">
                      {paragraph.trim()}
                    </p>
                  )
                ))}
              </div>
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

          {/* Corroborating sources — why this story matters */}
          {(article.corroboration_count ?? 1) > 1 && Array.isArray(article.corroborating_sources) && article.corroborating_sources.length > 0 && (
            <div className="mt-8 rounded-2xl border border-[#6366f1]/30 bg-[#6366f1]/5 p-6">
              <div className="mb-3 flex items-center gap-3">
                <CorroborationBadge count={article.corroboration_count ?? 1} locale={locale} />
              </div>
              <p className="mb-4 text-sm text-muted-foreground">
                {locale === 'en'
                  ? 'We surfaced this story because several independent outlets are reporting it. Here is who else is covering it:'
                  : 'Destacamos esta noticia porque varios medios independientes la están cubriendo. Estos son los que también la reportan:'}
              </p>
              <div className="flex flex-wrap gap-2">
                {article.corroborating_sources.map((src, i) => {
                  const domain = typeof src?.domain === 'string' ? src.domain : '';
                  if (!domain) return null;
                  const href = typeof src?.url === 'string' && src.url ? src.url : `https://${domain}`;
                  return (
                    <a
                      key={`${domain}-${i}`}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground/80 transition-colors hover:border-primary hover:text-primary"
                    >
                      {domain}
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {/* Share Buttons */}
          <div className="mt-12 flex items-center gap-4">
            <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {locale === 'en' ? 'Share:' : 'Compartir:'}
            </span>
            <div className="flex gap-3">
              <CopyLinkButton locale={locale} />
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
                        style={{ backgroundImage: `url("${getImageWithFallback(related.image_url, getLocalizedString(related, 'title', locale), related.category, related.id)}")` }}
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
