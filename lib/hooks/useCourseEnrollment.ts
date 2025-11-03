"use client";

import { useState } from 'react';

interface UseCourseEnrollmentResult {
  enroll: (courseId: string) => Promise<boolean>;
  unenroll: (courseId: string) => Promise<boolean>;
  isLoading: boolean;
  error: string | null;
}

export function useCourseEnrollment(): UseCourseEnrollmentResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enroll = async (courseId: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/courses/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to enroll');
      }

      // Dispatch XP award event (will be caught by XPAwardWrapper)
      const event = new CustomEvent('course-enrolled', {
        detail: { courseId },
      });
      window.dispatchEvent(event);

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const unenroll = async (courseId: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/courses/enroll?courseId=${courseId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to unenroll');
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

  return { enroll, unenroll, isLoading, error };
}
