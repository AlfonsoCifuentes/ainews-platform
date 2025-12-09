'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { type INewsArticle } from '@/lib/types/news';
import { getLocalizedString } from '@/lib/utils/i18n';
import { formatRelativeTimeFromNow } from '@/lib/utils/dates';
import { type Locale } from '@/i18n';
import { BookmarkButton } from '@/components/shared/BookmarkButton';
import { MiniShareButtons } from '@/components/shared/ShareButtons';
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
          className="mb-12 block w-full cursor-pointer text-left"
        >
          <article className="relative border border-white/12 bg-[#050505]">
            <div className="relative w-full" style={{ aspectRatio: '16 / 9', minHeight: '500px', overflow: 'hidden' }}>
              <Image
                src={hero.image_url || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"%3E%3Crect fill="%23111827" width="1200" height="630"/%3E%3Ctext fill="%233B82F6" font-family="system-ui" font-size="48" font-weight="bold" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3EAI News%3C/text%3E%3C/svg%3E'}
                alt={getLocalizedString(hero, 'title', locale)}
                fill
                priority
                sizes="100vw"
                unoptimized={!hero.image_url}
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />
              
              <div className="absolute left-8 top-8 z-20 pointer-events-none">
                <span className="border border-white/30 bg-transparent px-4 py-2 text-[11px] font-mono uppercase tracking-[0.2em] text-white/90">
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
                <div className="mb-4 flex items-center gap-4 text-xs font-mono tracking-[0.18em] text-white/60">
                  <span>{formatRelativeTimeFromNow(hero.published_at, locale)}</span>
                  <span>•</span>
                  <span>{hero.reading_time_minutes || 5} min {locale === 'en' ? 'read' : 'lectura'}</span>
                </div>
                <h2 className="mb-6 text-4xl font-semibold leading-tight text-white md:text-6xl">
                  {getLocalizedString(hero, 'title', locale)}
                </h2>
                <p className="mb-8 max-w-3xl text-lg leading-relaxed text-white/70">
                  {getLocalizedString(hero, 'summary', locale)}
                </p>
                <button className="inline-flex items-center gap-3 border border-white/40 bg-transparent px-8 py-3 text-xs font-mono uppercase tracking-[0.22em] text-white">
                  {tCommon('buttons.readMore')}
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              className="w-full cursor-pointer text-left"
            >
              <article className="relative h-full overflow-hidden border border-white/12 bg-[#050505]">
                <div className="relative h-56 overflow-hidden">
                  <Image
                    src={getImageWithFallback(
                      article.image_url,
                      getLocalizedString(article, 'title', locale),
                      article.category
                    )}
                    alt={getLocalizedString(article, 'title', locale)}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    unoptimized={!article.image_url || article.image_url.startsWith('data:')}
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
                  
                  <div className="absolute left-4 top-4 pointer-events-none">
                    <span className="border border-white/25 bg-transparent px-3 py-1 text-[11px] font-mono uppercase tracking-[0.2em] text-white/80">
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
                  <div className="mb-3 flex items-center gap-2 text-[11px] font-mono tracking-[0.18em] text-white/60">
                    <span>{formatRelativeTimeFromNow(article.published_at, locale)}</span>
                    <span>•</span>
                    <span>{article.reading_time_minutes || 5} min</span>
                  </div>
                  <h3 className="mb-3 line-clamp-2 text-xl font-semibold text-white">
                    {getLocalizedString(article, 'title', locale)}
                  </h3>
                  <p className="line-clamp-3 text-sm text-white/60">
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
                <article className="relative flex h-full flex-col overflow-hidden border border-white/12 bg-[#050505] transition-colors duration-200 hover:border-white/40">
                  <div className={`relative overflow-hidden ${isLarge ? 'flex-[2] min-h-0' : 'h-48'}`}>
                    <Image
                      src={getImageWithFallback(
                        article.image_url,
                        getLocalizedString(article, 'title', locale),
                        article.category
                      )}
                      alt={getLocalizedString(article, 'title', locale)}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      unoptimized={!article.image_url || article.image_url.startsWith('data:')}
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
                    
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                      <span className="border border-white/25 bg-transparent px-3 py-1 text-[11px] font-mono uppercase tracking-[0.2em] text-white/80">
                        {translateCategory(article.category)}
                      </span>
                      <span className="text-[11px] font-mono text-white/60">
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
                    <h3 className={`mb-2 font-semibold text-white ${isLarge ? 'text-2xl' : 'text-lg'}`}>
                      {getLocalizedString(article, 'title', locale)}
                    </h3>
                    <p className={`mb-4 flex-1 text-sm text-white/60 ${isLarge ? 'line-clamp-4' : 'line-clamp-2'}`}>
                      {getLocalizedString(article, 'summary', locale)}
                    </p>
                    
                    <div className="flex items-center justify-between border-t border-white/12 pt-3 text-[11px] font-mono text-white/60">
                      <span>{article.reading_time_minutes || 5} min</span>
                      <div className="flex items-center gap-2 font-mono uppercase tracking-[0.18em] text-white">
                        {locale === 'en' ? 'Read' : 'Leer'}
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            <div className="flex items-center gap-3 border border-white/15 bg-transparent px-8 py-4">
              <div className="h-5 w-5 border-2 border-white/50" />
              <span className="text-sm font-mono uppercase tracking-[0.18em] text-white/80">
                {locale === 'en' ? 'Loading more articles...' : 'Cargando más artículos...'}
              </span>
            </div>
          )}
          {!hasMore && articles.length > initialArticles.length && (
            <div className="text-center text-sm font-mono text-[#888888]">
              {locale === 'en' ? 'No more articles to load' : 'No hay más artículos para cargar'}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
