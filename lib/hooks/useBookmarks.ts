"use client";

import { useState } from 'react';

interface UseBookmarksResult {
  bookmark: (articleId: string) => Promise<boolean>;
  unbookmark: (articleId: string) => Promise<boolean>;
  isBookmarked: (articleId: string) => boolean;
  bookmarkedIds: Set<string>;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useBookmarks(): UseBookmarksResult {
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBookmarks = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/bookmarks');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch bookmarks');
      }

      const ids = new Set(data.bookmarks?.map((b: any) => b.article_id) || []);
      setBookmarkedIds(ids);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const bookmark = async (articleId: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to bookmark');
      }

      setBookmarkedIds((prev) => new Set(prev).add(articleId));
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const unbookmark = async (articleId: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/bookmarks?articleId=${articleId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to unbookmark');
      }

      setBookmarkedIds((prev) => {
        const next = new Set(prev);
        next.delete(articleId);
        return next;
      });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const isBookmarked = (articleId: string): boolean => {
    return bookmarkedIds.has(articleId);
  };

  return {
    bookmark,
    unbookmark,
    isBookmarked,
    bookmarkedIds,
    isLoading,
    error,
    refetch: fetchBookmarks,
  };
}
