'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLogger } from '@/lib/utils/logging';

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
  const logger = useLogger('useCourses');
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
    logger.info('fetchCourses called', params);

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

      const url = `/api/courses?${searchParams}`;
      logger.debug('Fetching from URL', { url });
      
      const response = await fetch(url);
      
      logger.info('API response received', {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      logger.info('API data parsed', {
        success: data.success,
        coursesCount: data.data?.length || 0,
        totalCount: data.pagination?.total || 0,
        hasError: !data.success,
        errorMessage: data.error
      });

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch courses');
      }

      logger.debug('Setting courses state', {
        courses: data.data,
        pagination: data.pagination
      });

      setCourses(data.data || []);
      setPagination(data.pagination);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      logger.error('Fetch error', err);
      setError(errorMsg);
      setCourses([]);
    } finally {
      setLoading(false);
    }
  }, [logger]);

  const loadMore = useCallback(() => {
    if (!pagination.hasMore || loading) return;
    logger.info('loadMore called', { currentOffset: pagination.offset, limit: pagination.limit });

    fetchCourses({
      ...initialParams,
      offset: pagination.offset + pagination.limit
    });
  }, [pagination, loading, initialParams, fetchCourses, logger]);

  const refresh = useCallback(() => {
    logger.info('refresh called');
    fetchCourses({ ...initialParams, offset: 0 });
  }, [initialParams, fetchCourses, logger]);

  useEffect(() => {
    logger.info('useEffect triggered, calling fetchCourses', { initialParams });
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
