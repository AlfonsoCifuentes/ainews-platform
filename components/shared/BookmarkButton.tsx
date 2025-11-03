'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import type { INewsArticle } from '@/lib/types/news';

interface BookmarkButtonProps {
  article: INewsArticle;
  userId?: string;
  className?: string;
  showLabel?: boolean;
  locale?: 'en' | 'es';
}

export function BookmarkButton({ 
  article, 
  userId, 
  className = '',
  showLabel = false,
  locale = 'en'
}: BookmarkButtonProps) {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load bookmark status from localStorage (or API if userId provided)
  useEffect(() => {
    if (userId) {
      // TODO: Load from API when user auth is implemented
      loadBookmarkStatus();
    } else {
      // Load from localStorage for anonymous users
      const bookmarks = getLocalBookmarks();
      setIsBookmarked(bookmarks.includes(article.id));
    }
  }, [article.id, userId]);

  const loadBookmarkStatus = async () => {
    // TODO: Implement when Supabase auth is ready
    // const { data } = await supabase
    //   .from('user_bookmarks')
    //   .select('id')
    //   .eq('user_id', userId)
    //   .eq('article_id', article.id)
    //   .single();
    // setIsBookmarked(!!data);
  };

  const getLocalBookmarks = (): string[] => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem('bookmarked_articles');
    return stored ? JSON.parse(stored) : [];
  };

  const saveLocalBookmarks = (bookmarks: string[]) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('bookmarked_articles', JSON.stringify(bookmarks));
  };

  const handleToggleBookmark = async () => {
    setIsLoading(true);

    try {
      if (userId) {
        // TODO: Save to API when user auth is implemented
        await toggleBookmarkAPI();
      } else {
        // Save to localStorage for anonymous users
        const bookmarks = getLocalBookmarks();
        if (isBookmarked) {
          const updated = bookmarks.filter(id => id !== article.id);
          saveLocalBookmarks(updated);
        } else {
          saveLocalBookmarks([...bookmarks, article.id]);
        }
      }

      setIsBookmarked(!isBookmarked);
      
      // Trigger bookmark event for badge checking (only when adding)
      if (!isBookmarked) {
        window.dispatchEvent(new CustomEvent('bookmark-added', {
          detail: { articleId: article.id }
        }));
      }
    } catch (error) {
      console.error('Failed to toggle bookmark:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleBookmarkAPI = async () => {
    // TODO: Implement when Supabase auth is ready
    // if (isBookmarked) {
    //   await supabase
    //     .from('user_bookmarks')
    //     .delete()
    //     .eq('user_id', userId)
    //     .eq('article_id', article.id);
    // } else {
    //   await supabase
    //     .from('user_bookmarks')
    //     .insert({
    //       user_id: userId,
    //       article_id: article.id,
    //       bookmarked_at: new Date().toISOString()
    //     });
    // }
  };

  const label = isBookmarked 
    ? (locale === 'en' ? 'Saved' : 'Guardado')
    : (locale === 'en' ? 'Save' : 'Guardar');

  return (
    <motion.button
      onClick={handleToggleBookmark}
      disabled={isLoading}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`flex items-center gap-2 ${showLabel ? 'px-4 py-2' : 'p-2'} rounded-full transition-colors ${
        isBookmarked 
          ? 'bg-primary text-primary-foreground' 
          : 'bg-secondary/50 hover:bg-secondary'
      } ${className}`}
    >
      {isBookmarked ? (
        <BookmarkCheck className="w-4 h-4" />
      ) : (
        <Bookmark className="w-4 h-4" />
      )}
      {showLabel && <span className="text-sm font-medium">{label}</span>}
    </motion.button>
  );
}

// Hook to get all bookmarked articles
export function useBookmarks(userId?: string) {
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadBookmarks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const loadBookmarks = async () => {
    setIsLoading(true);
    try {
      if (userId) {
        // TODO: Load from API
        // const { data } = await supabase
        //   .from('user_bookmarks')
        //   .select('article_id')
        //   .eq('user_id', userId);
        // setBookmarkedIds(data?.map(b => b.article_id) || []);
      } else {
        const stored = localStorage.getItem('bookmarked_articles');
        setBookmarkedIds(stored ? JSON.parse(stored) : []);
      }
    } catch (error) {
      console.error('Failed to load bookmarks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshBookmarks = () => {
    loadBookmarks();
  };

  return { bookmarkedIds, isLoading, refreshBookmarks };
}
