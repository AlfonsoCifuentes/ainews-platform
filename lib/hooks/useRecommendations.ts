"use client";

import { useState, useEffect, useCallback } from 'react';

interface Article {
  id: string;
  title_en: string;
  title_es: string;
  summary_en: string;
  summary_es: string;
  image_url: string | null;
  source_name: string;
  published_at: string;
  category: string;
}

interface UseRecommendationsResult {
  recommendations: Article[];
  reason: string;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useRecommendations(
  locale: 'en' | 'es',
  limit: number = 10
): UseRecommendationsResult {
  const [recommendations, setRecommendations] = useState<Article[]>([]);
  const [reason, setReason] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendations = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/recommendations?locale=${locale}&limit=${limit}`,
        { signal }
      );
      const data = await response.json();

      if (response.ok) {
        setRecommendations(data.recommendations || []);
        setReason(data.reason || '');
      } else {
        throw new Error(data.error || 'Failed to fetch recommendations');
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [locale, limit]);

  useEffect(() => {
    const controller = new AbortController();
    fetchRecommendations(controller.signal);
    return () => controller.abort();
  }, [fetchRecommendations]);

  return {
    recommendations,
    reason,
    isLoading,
    error,
    refetch: fetchRecommendations,
  };
}
