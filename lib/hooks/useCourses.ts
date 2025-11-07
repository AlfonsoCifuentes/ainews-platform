'use client';

import { useState, useEffect, useCallback } from 'react';

export interface Course {
  id: string;
  title_en: string;
  title_es: string;
  description_en: string;
  description_es: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration_minutes: number;
  topics: string[];
  enrollment_count: number;
  rating_avg: number;
  view_count: number;
  completion_rate: number;
  created_at: string;
  published_at: string | null;
}

interface FetchCoursesParams {
  locale: string;
  category?: string;
  difficulty?: string;
  sort?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

interface PaginationInfo {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export function useCourses(initialParams: FetchCoursesParams) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    limit: 20,
    offset: 0,
    hasMore: false
  });

  const fetchCourses = useCallback(async (params: FetchCoursesParams) => {
    setLoading(true);
    setError(null);

    try {
      const searchParams = new URLSearchParams({
        locale: params.locale,
        limit: String(params.limit || 20),
        offset: String(params.offset || 0)
      });

      if (params.category && params.category !== 'all') {
        searchParams.append('category', params.category);
      }
      if (params.difficulty && params.difficulty !== 'all') {
        searchParams.append('difficulty', params.difficulty);
      }
      if (params.sort) {
        searchParams.append('sort', params.sort);
      }
      if (params.search) {
        searchParams.append('search', params.search);
      }

      const response = await fetch(`/api/courses?${searchParams}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch courses');
      }

      setCourses(data.data || []);
      setPagination(data.pagination);
    } catch (err) {
      console.error('[useCourses] Fetch error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setCourses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(() => {
    if (!pagination.hasMore || loading) return;

    fetchCourses({
      ...initialParams,
      offset: pagination.offset + pagination.limit
    });
  }, [pagination, loading, initialParams, fetchCourses]);

  const refresh = useCallback(() => {
    fetchCourses({ ...initialParams, offset: 0 });
  }, [initialParams, fetchCourses]);

  useEffect(() => {
    fetchCourses(initialParams);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    initialParams.locale,
    initialParams.category,
    initialParams.difficulty,
    initialParams.sort,
    initialParams.search,
  ]);

  return {
    courses,
    loading,
    error,
    pagination,
    loadMore,
    refresh
  };
}
