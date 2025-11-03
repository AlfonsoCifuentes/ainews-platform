"use client";

import { useState, useEffect } from 'react';

interface LeaderboardUser {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  total_xp: number;
  level: number;
  streak_days: number;
  rank: number;
}

interface UseLeaderboardResult {
  users: LeaderboardUser[];
  currentUserRank: number | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useLeaderboard(
  period: 'all' | 'week' | 'month' = 'all',
  limit: number = 50
): UseLeaderboardResult {
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/leaderboard?period=${period}&limit=${limit}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch leaderboard');
      }

      setUsers(data.leaderboard || []);
      setCurrentUserRank(data.currentUserRank);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, limit]);

  return { users, currentUserRank, isLoading, error, refetch: fetchLeaderboard };
}
