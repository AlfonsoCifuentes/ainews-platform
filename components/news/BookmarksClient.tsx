'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import { BookmarkX, Sparkles } from 'lucide-react';
import type { INewsArticle } from '@/lib/types/news';
import type { Locale } from '@/i18n';
import { useBookmarks } from '@/components/shared/BookmarkButton';
import { getLocalizedString } from '@/lib/utils/i18n';
import { formatRelativeTimeFromNow } from '@/lib/utils/dates';
import { BookmarkButton } from '@/components/shared/BookmarkButton';
import { MiniShareButtons } from '@/components/shared/ShareButtons';
import Image from 'next/image';

// Lazy load ArticleModal (heavy component with animations)
const ArticleModal = dynamic(
  () => import('./ArticleModal').then(mod => ({ default: mod.ArticleModal })),
  {
    loading: () => null, // Modal appears on demand, no skeleton needed
    ssr: false // Modal is client-side only
  }
);

type BookmarksClientProps = {
  locale: Locale;
};

export function BookmarksClient({ locale }: BookmarksClientProps) {
  const t = useTranslations('bookmarks');
  const tCommon = useTranslations('common');
  const tNews = useTranslations('news');
  
  const { bookmarkedIds, refreshBookmarks } = useBookmarks();
  const [articles, setArticles] = useState<INewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState<INewsArticle | null>(null);

  useEffect(() => {
    loadBookmarkedArticles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookmarkedIds]);

  const loadBookmarkedArticles = async () => {
    if (bookmarkedIds.length === 0) {
      setArticles([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/news/by-ids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: bookmarkedIds, locale }),
      });

      if (!response.ok) throw new Error('Failed to load articles');
      
      const data = await response.json();
      setArticles(data.data || []);
    } catch (error) {
      console.error('Error loading bookmarked articles:', error);
      setArticles([]);
    } finally {
      setLoading(false);
    }
  };

  const translateCategory = (category: string) => {
    const validCategories = ['machinelearning', 'nlp', 'computervision', 'robotics', 'ethics'];
    const key = validCategories.includes(category) ? category : 'all';
    return tNews(`categories.${key}`);
  };

  const handleRemoveBookmark = () => {
    refreshBookmarks();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Sparkles className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <BookmarkX className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">{t('empty.title')}</h2>
        <p className="text-muted-foreground max-w-md mb-8">{t('empty.description')}</p>
        <a
          href={`/${locale}/news`}
          className="px-6 py-3 rounded-full bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
        >
          {t('empty.cta')}
        </a>
      </div>
    );
  }

  return (
    <>
      <ArticleModal
        article={selectedArticle}
        locale={locale}
        onClose={() => setSelectedArticle(null)}
        translations={{
          readTime: tNews('modal.readTime'), // Use modal translation with {{minutes}} placeholder
          aiGenerated: tNews('aiGenerated'),
          close: tCommon('buttons.close'),
          category: translateCategory(selectedArticle?.category || 'machinelearning'),
          readOriginal: tCommon('buttons.readOriginal'),
        }}
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {articles.map((article) => (
          <button
            key={article.id}
            onClick={() => setSelectedArticle(article)}
            className="group w-full text-left"
          >
            <article className="relative h-full overflow-hidden rounded-3xl border border-border/50 bg-card backdrop-blur-xl transition-all duration-300 hover:-translate-y-2 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10">
              <div className="relative h-56 overflow-hidden">
                <Image
                  src={article.image_url || '/placeholder-news.jpg'}
                  alt={getLocalizedString(article, 'title', locale)}
                  fill
                  className="object-cover scale-105 transition-transform duration-500 group-hover:scale-100"
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
                
                <div className="absolute left-4 top-4">
                  <span className="rounded-full bg-primary/90 px-3 py-1 text-xs font-bold text-primary-foreground backdrop-blur-sm">
                    {translateCategory(article.category)}
                  </span>
                </div>

                <div className="absolute right-4 top-4 flex items-center gap-2 z-10">
                  <div onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveBookmark();
                  }}>
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
          </button>
        ))}
      </div>
    </>
  );
}
