'use client';

import { useState, useCallback } from 'react';

interface Article {
  id: string;
  title_en: string;
  title_es: string;
  summary_en: string;
  summary_es: string;
  image_url?: string;
  published_at: string;
  category?: string;
}

interface Course {
  id: string;
  title_en: string;
  title_es: string;
  description_en: string;
  description_es: string;
  difficulty: string;
  estimated_hours: number;
}

interface SearchResults {
  articles: Article[];
  courses: Course[];
}

interface SearchCounts {
  articles: number;
  courses: number;
  total: number;
}

interface UseSearchResult {
  results: SearchResults;
  counts: SearchCounts;
  loading: boolean;
  error: string | null;
  search: (query: string, options?: { locale?: 'en' | 'es'; category?: string }) => Promise<void>;
  clear: () => void;
}

export function useSearch(): UseSearchResult {
  const [results, setResults] = useState<SearchResults>({
    articles: [],
    courses: [],
  });
  const [counts, setCounts] = useState<SearchCounts>({
    articles: 0,
    courses: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(
    async (query: string, options?: { locale?: 'en' | 'es'; category?: string }) => {
      if (!query.trim()) {
        clear();
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams({ q: query });
        if (options?.locale) params.append('locale', options.locale);
        if (options?.category) params.append('category', options.category);

        const response = await fetch(`/api/search?${params}`);
        if (!response.ok) throw new Error('Search failed');

        const data = await response.json();

        setResults(data.results);
        setCounts(data.counts);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const clear = useCallback(() => {
    setResults({ articles: [], courses: [] });
    setCounts({ articles: 0, courses: 0, total: 0 });
    setError(null);
  }, []);

  return {
    results,
    counts,
    loading,
    error,
    search,
    clear,
  };
}
