"use client";

import { motion } from 'framer-motion';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { useBookmarks } from '@/lib/hooks/useBookmarks';
import { useEffect } from 'react';

interface BookmarkButtonProps {
  articleId: string;
  locale: 'en' | 'es';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function BookmarkButton({
  articleId,
  locale,
  size = 'md',
  showLabel = false,
}: BookmarkButtonProps) {
  const { bookmark, unbookmark, isBookmarked, isLoading, refetch } = useBookmarks();

  useEffect(() => {
    refetch();
  }, [refetch]);

  const bookmarked = isBookmarked(articleId);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (bookmarked) {
      await unbookmark(articleId);
    } else {
      await bookmark(articleId);
    }
  };

  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
  };

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24,
  };

  const translations = {
    en: {
      save: 'Save',
      saved: 'Saved',
    },
    es: {
      save: 'Guardar',
      saved: 'Guardado',
    },
  }[locale];

  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={handleClick}
      disabled={isLoading}
      className={`${sizeClasses[size]} flex items-center justify-center gap-2 rounded-full transition-all ${
        bookmarked
          ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/50'
          : 'border border-white/20 bg-black/20 text-muted-foreground backdrop-blur-xl hover:bg-white/10'
      } ${isLoading ? 'opacity-50 cursor-wait' : ''}`}
      aria-label={bookmarked ? translations.saved : translations.save}
    >
      {bookmarked ? (
        <BookmarkCheck size={iconSizes[size]} className="fill-current" />
      ) : (
        <Bookmark size={iconSizes[size]} />
      )}
      {showLabel && (
        <span className="text-sm font-semibold">
          {bookmarked ? translations.saved : translations.save}
        </span>
      )}
    </motion.button>
  );
}
