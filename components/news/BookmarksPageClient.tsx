"use client";

import { motion } from 'framer-motion';
import { Bookmark, Trash2, Calendar } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { useBookmarks } from '@/lib/hooks/useBookmarks';

interface SavedArticle {
  id: string;
  article_id: string;
  saved_at: string;
  news_articles: {
    id: string;
    title_en: string;
    title_es: string;
    summary_en: string;
    summary_es: string;
    image_url: string | null;
    source_name: string;
    published_at: string;
    category: string;
  };
}

interface BookmarksPageClientProps {
  bookmarks: SavedArticle[];
  locale: 'en' | 'es';
  translations: {
    title: string;
    subtitle: string;
    empty: string;
    emptyDescription: string;
    savedOn: string;
    remove: string;
  };
}

export function BookmarksPageClient({
  bookmarks: initialBookmarks,
  locale,
  translations,
}: BookmarksPageClientProps) {
  const [bookmarks, setBookmarks] = useState(initialBookmarks);
  const { unbookmark, isLoading } = useBookmarks();

  const handleRemove = async (articleId: string) => {
    const success = await unbookmark(articleId);
    if (success) {
      setBookmarks((prev) => prev.filter((b) => b.article_id !== articleId));
    }
  };

  if (bookmarks.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
          >
            <Bookmark className="mx-auto mb-6 h-24 w-24 text-muted-foreground" />
          </motion.div>
          <h2 className="mb-2 text-3xl font-bold">{translations.empty}</h2>
          <p className="mb-8 text-muted-foreground">
            {translations.emptyDescription}
          </p>
          <Link
            href={`/${locale}/news`}
            className="rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground transition-all hover:bg-primary/90"
          >
            {locale === 'en' ? 'Explore News' : 'Explorar Noticias'}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-16">
      {/* Header */}
      <div className="mb-12 text-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="mb-4 text-5xl font-bold tracking-tight">
            {translations.title}
          </h1>
          <p className="text-xl text-muted-foreground">
            {translations.subtitle}
          </p>
        </motion.div>
      </div>

      {/* Bookmarks Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {bookmarks.map((bookmark, index) => {
          const article = bookmark.news_articles;
          if (!article) return null;

          const title = article[`title_${locale}`];
          const summary = article[`summary_${locale}`];

          return (
            <motion.div
              key={bookmark.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="group relative overflow-hidden rounded-3xl border border-white/20 bg-black/20 backdrop-blur-xl transition-all hover:bg-white/10"
            >
              <Link href={`/${locale}/news/${article.id}`}>
                {/* Image */}
                {article.image_url && (
                  <div className="relative aspect-video w-full overflow-hidden">
                    <Image
                      src={article.image_url}
                      alt={title}
                      fill
                      className="object-cover transition-transform group-hover:scale-105"
                    />
                  </div>
                )}

                {/* Content */}
                <div className="p-6">
                  {/* Category Badge */}
                  {article.category && (
                    <span className="mb-3 inline-block rounded-full bg-primary/20 px-3 py-1 text-xs font-semibold uppercase text-primary">
                      {article.category}
                    </span>
                  )}

                  {/* Title */}
                  <h3 className="mb-2 text-xl font-bold line-clamp-2 group-hover:text-primary">
                    {title}
                  </h3>

                  {/* Summary */}
                  <p className="mb-4 text-sm text-muted-foreground line-clamp-3">
                    {summary}
                  </p>

                  {/* Meta */}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{article.source_name}</span>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>
                        {translations.savedOn}{' '}
                        {new Date(bookmark.saved_at).toLocaleDateString(
                          locale === 'en' ? 'en-US' : 'es-ES',
                          { month: 'short', day: 'numeric' }
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>

              {/* Remove Button */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleRemove(article.id)}
                disabled={isLoading}
                className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/60 text-red-400 backdrop-blur-xl transition-all hover:bg-red-500/20 disabled:opacity-50"
                aria-label={translations.remove}
              >
                <Trash2 size={18} />
              </motion.button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
