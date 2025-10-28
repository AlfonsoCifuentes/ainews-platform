'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { X } from 'lucide-react';
import type { INewsArticle } from '@/lib/types/news';
import type { Locale } from '@/i18n';
import { getLocalizedString } from '@/lib/utils/i18n';
import { formatRelativeTimeFromNow } from '@/lib/utils/dates';
import { ShareButtons } from '@/components/shared/ShareButtons';
import { BookmarkButton } from '@/components/shared/BookmarkButton';

type ArticleModalProps = {
  article: INewsArticle | null;
  locale: Locale;
  onClose: () => void;
  translations: {
    readTime: string;
    aiGenerated: string;
    close: string;
    category: string;
    readOriginal: string;
  };
};

export function ArticleModal({
  article,
  locale,
  onClose,
  translations,
}: ArticleModalProps) {
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (article) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden'; // Prevent scroll
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [article, onClose]);

  if (!article) return null;

  const title = getLocalizedString(article, 'title', locale);
  const content = getLocalizedString(article, 'content', locale);
  const summary = getLocalizedString(article, 'summary', locale);
  const relativeTime = formatRelativeTimeFromNow(article.published_at, locale);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
        onClick={onClose}
      >
        {/* Modal Container */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl bg-background shadow-2xl border border-border"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 rounded-full bg-black/50 p-2 text-white backdrop-blur-sm transition-all hover:bg-black/70 hover:scale-110"
            aria-label={translations.close}
          >
            <X className="h-6 w-6" />
          </button>

          {/* Scrollable Content */}
          <div className="overflow-y-auto max-h-[90vh] custom-scrollbar">
            {/* Hero Image */}
            {article.image_url && (
              <div className="relative h-[40vh] w-full">
                <Image
                  src={article.image_url}
                  alt={title}
                  fill
                  priority
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 1024px"
                />
                {/* Gradient overlay for title readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

                {/* Title over hero image */}
                <div className="absolute bottom-0 left-0 right-0 p-8">
                  <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight drop-shadow-2xl">
                    {title}
                  </h1>
                  
                  {/* Meta info */}
                  <div className="flex flex-wrap items-center gap-3 mt-4 text-sm text-white/90">
                    <span className="rounded-full bg-white/20 px-3 py-1 backdrop-blur-sm font-semibold">
                      {translations.category}
                    </span>
                    <span>{relativeTime}</span>
                    <span>•</span>
                    <span>
                      {translations.readTime.replace(
                        '{{minutes}}',
                        String(article.reading_time_minutes ?? 5)
                      )}
                    </span>
                    {article.ai_generated && (
                      <>
                        <span>•</span>
                        <span className="text-primary font-semibold">
                          {translations.aiGenerated}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Article Content */}
            <div className="p-8 md:p-12">
              {/* Summary */}
              {summary && (
                <div className="mb-8 p-6 rounded-2xl bg-muted/50 border-l-4 border-primary">
                  <p className="text-lg leading-relaxed text-muted-foreground italic">
                    {summary}
                  </p>
                </div>
              )}

              {/* Full Content */}
              {content && content.length > 100 ? (
                <div 
                  className="prose prose-lg dark:prose-invert max-w-none
                    prose-headings:font-bold prose-headings:tracking-tight
                    prose-p:leading-relaxed prose-p:text-foreground/90
                    prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                    prose-img:rounded-xl prose-img:shadow-lg
                    prose-code:bg-muted prose-code:px-2 prose-code:py-1 prose-code:rounded
                    prose-pre:bg-muted prose-pre:border prose-pre:border-border"
                  dangerouslySetInnerHTML={{ __html: content }}
                />
              ) : (
                <div className="prose prose-lg dark:prose-invert max-w-none">
                  <p className="text-foreground/80 leading-relaxed whitespace-pre-wrap">
                    {content || summary}
                  </p>
                </div>
              )}

              {/* Read Original Link + Actions */}
              {article.source_url && (
                <div className="mt-12 pt-8 border-t border-border">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
                    <a
                      href={article.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground font-semibold transition-all hover:bg-primary/90 hover:scale-105 hover:shadow-lg"
                    >
                      {translations.readOriginal} →
                    </a>
                    
                    <div className="flex items-center gap-3">
                      <BookmarkButton 
                        article={article} 
                        locale={locale}
                        showLabel
                      />
                      <ShareButtons 
                        article={article} 
                        locale={locale}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
