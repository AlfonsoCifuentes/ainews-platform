"use client";

import { useState } from 'react';
import type { UserProgress } from '@/lib/types/user';

interface UseModuleProgressResult {
  updateProgress: (params: {
    courseId: string;
    moduleId: string;
    completed: boolean;
    score?: number;
    timeSpent?: number;
    notes?: string;
  }) => Promise<boolean>;
  isLoading: boolean;
  error: string | null;
}

export function useModuleProgress(): UseModuleProgressResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateProgress = async (params: {
    courseId: string;
    moduleId: string;
    completed: boolean;
    score?: number;
    timeSpent?: number;
    notes?: string;
  }): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/courses/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update progress');
      }

      // Dispatch module completion event for XP award
      if (params.completed) {
        const event = new CustomEvent('module-completed', {
          detail: {
            courseId: params.courseId,
            moduleId: params.moduleId,
            score: params.score,
          },
        });
        window.dispatchEvent(event);
      }

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return { updateProgress, isLoading, error };
}

/**
 * Hook to fetch course progress
 */
export function useCourseProgress(courseId: string) {
  const [progress, setProgress] = useState<UserProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProgress = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/courses/progress?courseId=${courseId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch progress');
      }

      setProgress(data.progress || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return { progress, isLoading, error, refetch: fetchProgress };
}
