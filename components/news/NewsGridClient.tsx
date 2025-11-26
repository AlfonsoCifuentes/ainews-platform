'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import { type INewsArticle } from '@/lib/types/news';
import { getLocalizedString } from '@/lib/utils/i18n';
import { formatRelativeTimeFromNow } from '@/lib/utils/dates';
import { type Locale } from '@/i18n';
import { BookmarkButton } from '@/components/shared/BookmarkButton';
import { MiniShareButtons } from '@/components/shared/ShareButtons';
import Image from 'next/image';
import { getImageWithFallback } from '@/lib/utils/generate-fallback-image';

// Lazy load ArticleModal (heavy component with animations)
const ArticleModal = dynamic(
  () => import('./ArticleModal').then(mod => ({ default: mod.ArticleModal })),
  {
    loading: () => null, // Modal appears on demand, no skeleton needed
    ssr: false // Modal is client-side only
  }
);

type NewsGridClientProps = {
  initialArticles: INewsArticle[];
  locale: Locale;
  activeCategory?: string | null;
};

export function NewsGridClient({ initialArticles, locale, activeCategory }: NewsGridClientProps) {
  const t = useTranslations('news');
  const tCommon = useTranslations('common');
  
  const [articles, setArticles] = useState<INewsArticle[]>(initialArticles);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(initialArticles.length);
  const [selectedArticle, setSelectedArticle] = useState<INewsArticle | null>(null);
  
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Filter articles by category
  const filteredArticles = activeCategory 
    ? articles.filter(article => article.category === activeCategory)
    : articles;

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

  const loadMoreArticles = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/news?locale=${locale}&offset=${offset}&limit=20`
      );
      const data = await response.json();

      if (data.data && data.data.length > 0) {
        setArticles(prev => [...prev, ...data.data]);
        setOffset(prev => prev + data.data.length);
        setHasMore(data.hasMore);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error loading more articles:', error);
    } finally {
      setLoading(false);
    }
  }, [locale, offset, loading, hasMore]);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMoreArticles();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, loading, loadMoreArticles]);

  if (filteredArticles.length === 0) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="mb-4 text-4xl font-bold md:text-5xl">
          {activeCategory ? t('empty.noResultsCategory') : t('title')}
        </h1>
        <p className="text-lg text-muted-foreground">
          {activeCategory ? t('empty.tryDifferentFilter') : t('empty.subtitle')}
        </p>
      </div>
    );
  }

  const [hero, ...restArticles] = filteredArticles;
  const featured = restArticles.slice(0, 3);
  const grid = restArticles.slice(3);

  return (
    <>
      {selectedArticle && (
        <ArticleModal
          article={selectedArticle}
          locale={locale}
          onClose={() => setSelectedArticle(null)}
          translations={{
            aiGenerated: t('card.aiGenerated'),
            close: tCommon('buttons.close'),
            category: translateCategory(selectedArticle.category),
            readOriginal: tCommon('buttons.readOriginal'),
          }}
        />
      )}

      <div className="container mx-auto px-4 py-12">
        {/* HERO Article */}
        <div 
          onClick={() => setSelectedArticle(hero)}
          className="group mb-12 block w-full cursor-pointer text-left"
        >
          <article className="relative rounded-[2.5rem] bg-gradient-to-br from-primary/20 via-accent/20 to-primary/10 shadow-2xl shadow-primary/10 transition-all duration-500 hover:scale-[1.02] hover:shadow-3xl hover:shadow-primary/20">
            <div className="relative w-full" style={{ aspectRatio: '16 / 9', minHeight: '500px', overflow: 'hidden' }}>
              <Image
                src={hero.image_url || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"%3E%3Crect fill="%23111827" width="1200" height="630"/%3E%3Ctext fill="%233B82F6" font-family="system-ui" font-size="48" font-weight="bold" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3EAI News%3C/text%3E%3C/svg%3E'}
                alt={getLocalizedString(hero, 'title', locale)}
                fill
                priority
                className="object-cover scale-110 transition-transform duration-700 group-hover:scale-100"
                sizes="100vw"
                unoptimized={!hero.image_url}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
              
              <div className="absolute left-8 top-8 z-20">
                <span className="rounded-full border border-white/30 bg-white/10 px-6 py-2 text-sm font-bold uppercase tracking-wider text-white backdrop-blur-xl">
                  {translateCategory(hero.category)}
                </span>
              </div>

              <div className="absolute right-8 top-8 flex items-center gap-3 z-30">
                <div onClick={(e) => e.stopPropagation()}>
                  <BookmarkButton article={hero} locale={locale} />
                </div>
                <div onClick={(e) => e.stopPropagation()}>
                  <MiniShareButtons article={hero} locale={locale} />
                </div>
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12 z-40">
                <div className="mb-4 flex items-center gap-4 text-sm text-white/80">
                  <span>{formatRelativeTimeFromNow(hero.published_at, locale)}</span>
                  <span>•</span>
                  <span>{hero.reading_time_minutes || 5} min {locale === 'en' ? 'read' : 'lectura'}</span>
                </div>
                <h2 className="mb-6 text-4xl font-black leading-tight text-white md:text-6xl">
                  {getLocalizedString(hero, 'title', locale)}
                </h2>
                <p className="mb-8 max-w-3xl text-xl leading-relaxed text-white/90">
                  {getLocalizedString(hero, 'summary', locale)}
                </p>
                <button className="inline-flex items-center gap-3 rounded-full bg-white px-8 py-4 text-base font-bold text-black transition-all duration-300 hover:gap-5 hover:bg-primary hover:text-white">
                  {tCommon('buttons.readMore')}
                  <svg className="h-5 w-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </button>
              </div>
            </div>
          </article>
        </div>

        {/* FEATURED Articles */}
        <div className="mb-12 grid gap-6 md:grid-cols-3">
          {featured.map((article) => (
            <div 
              key={article.id}
              onClick={() => setSelectedArticle(article)}
              className="group w-full cursor-pointer text-left"
            >
              <article className="relative h-full overflow-hidden rounded-3xl border border-border/50 bg-card backdrop-blur-xl transition-all duration-300 hover:-translate-y-2 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10">
                <div className="relative h-56 overflow-hidden">
                  <Image
                    src={getImageWithFallback(
                      article.image_url,
                      getLocalizedString(article, 'title', locale),
                      article.category
                    )}
                    alt={getLocalizedString(article, 'title', locale)}
                    fill
                    className="object-cover scale-105 transition-transform duration-500 group-hover:scale-100"
                    sizes="(max-width: 768px) 100vw, 33vw"
                    unoptimized={!article.image_url || article.image_url.startsWith('data:')}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
                  
                  <div className="absolute left-4 top-4">
                    <span className="rounded-full bg-primary/90 px-3 py-1 text-xs font-bold text-primary-foreground backdrop-blur-sm">
                      {translateCategory(article.category)}
                    </span>
                  </div>

                  <div className="absolute right-4 top-4 flex items-center gap-2 z-10">
                    <div onClick={(e) => e.stopPropagation()}>
                      <BookmarkButton article={article} locale={locale} />
                    </div>
                    <div onClick={(e) => e.stopPropagation()}>
                      <MiniShareButtons article={article} locale={locale} />
                    </div>
                  </div>
                </div>

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
            </div>
          ))}
        </div>

        {/* MASONRY Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {grid.map((article, index) => {
            const isLarge = index % 7 === 0;
            const isMedium = index % 5 === 0;
            const colSpan = isLarge ? 'lg:col-span-2' : isMedium ? 'lg:col-span-2 md:col-span-2' : '';
            const rowSpan = isLarge ? 'lg:row-span-2' : '';

            return (
              <div 
                key={article.id}
                onClick={() => setSelectedArticle(article)}
                className={`group w-full cursor-pointer text-left ${colSpan} ${rowSpan}`}
              >
                <article className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm transition-all duration-300 hover:border-primary/50 hover:bg-card hover:shadow-lg hover:shadow-primary/5">
                  <div className={`relative overflow-hidden ${isLarge ? 'flex-[2] min-h-0' : 'h-48'}`}>
                    <Image
                      src={getImageWithFallback(
                        article.image_url,
                        getLocalizedString(article, 'title', locale),
                        article.category
                      )}
                      alt={getLocalizedString(article, 'title', locale)}
                      fill
                      className="object-cover scale-105 transition-transform duration-500 group-hover:scale-100"
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      unoptimized={!article.image_url || article.image_url.startsWith('data:')}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                    
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                      <span className="rounded-full bg-primary/20 px-3 py-1 text-xs font-semibold text-primary backdrop-blur-md">
                        {translateCategory(article.category)}
                      </span>
                      <span className="text-xs text-white/80">
                        {formatRelativeTimeFromNow(article.published_at, locale)}
                      </span>
                    </div>

                    <div className="absolute right-3 top-3 flex items-center gap-2 z-10">
                      <div onClick={(e) => e.stopPropagation()}>
                        <BookmarkButton article={article} locale={locale} />
                      </div>
                      <div onClick={(e) => e.stopPropagation()}>
                        <MiniShareButtons article={article} locale={locale} />
                      </div>
                    </div>
                  </div>

                  <div className={`flex flex-col p-5 ${isLarge ? 'flex-[1]' : 'flex-1'}`}>
                    <h3 className={`mb-2 font-bold transition-colors group-hover:text-primary ${isLarge ? 'text-2xl' : 'text-lg'}`}>
                      {getLocalizedString(article, 'title', locale)}
                    </h3>
                    <p className={`mb-4 flex-1 text-sm text-muted-foreground ${isLarge ? 'line-clamp-4' : 'line-clamp-2'}`}>
                      {getLocalizedString(article, 'summary', locale)}
                    </p>
                    
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
              </div>
            );
          })}
        </div>

        {/* Load More Trigger */}
        <div ref={loadMoreRef} className="mt-12 flex justify-center">
          {loading && (
            <div className="flex items-center gap-3 rounded-full border border-border bg-card px-8 py-4">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span className="text-sm font-medium">
                {locale === 'en' ? 'Loading more articles...' : 'Cargando más artículos...'}
              </span>
            </div>
          )}
          {!hasMore && articles.length > initialArticles.length && (
            <div className="text-center text-sm text-muted-foreground">
              {locale === 'en' ? 'No more articles to load' : 'No hay más artículos para cargar'}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
