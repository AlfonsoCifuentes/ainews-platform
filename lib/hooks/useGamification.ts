'use client';

import { useState, useCallback } from 'react';
import type { UserProfile, UserXPLog, Badge } from '@/lib/types/user';

interface UserStatsData {
  profile: UserProfile | null;
  stats: {
    enrolledCount: number;
    createdCount: number;
    completedCount: number;
  };
  badges: Badge[];
  recentXP: UserXPLog[];
}

interface AwardXPResult {
  xpAwarded: number;
  newXP: number;
  newLevel: number;
  leveledUp: boolean;
}

export function useGamification() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async (): Promise<UserStatsData | null> => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/user/stats');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch stats');
      }

      return result.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('[useGamification] Error fetching stats:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const awardXP = useCallback(async (
    action: 'ARTICLE_READ' | 'COURSE_ENROLL' | 'MODULE_COMPLETE' | 'COURSE_COMPLETE' | 'COURSE_CREATE' | 'PERFECT_QUIZ' | 'DAILY_LOGIN',
    referenceId?: string
  ): Promise<AwardXPResult | null> => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/user/xp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, referenceId })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to award XP');
      }

      return result.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('[useGamification] Error awarding XP:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateProfile = useCallback(async (updates: {
    display_name?: string;
    full_name?: string;
    bio?: string;
    preferred_locale?: 'en' | 'es';
    theme?: 'dark' | 'light';
  }): Promise<UserProfile | null> => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update profile');
      }

      return result.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('[useGamification] Error updating profile:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    fetchStats,
    awardXP,
    updateProfile,
    isLoading,
    error
  };
}
