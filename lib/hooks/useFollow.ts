'use client';

import { useState, useEffect, useCallback } from 'react';

interface UseFollowResult {
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
  loading: boolean;
  following: boolean; // State during follow/unfollow action
  follow: () => Promise<void>;
  unfollow: () => Promise<void>;
  refetch: () => Promise<void>;
}

export function useFollow(userId: string): UseFollowResult {
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);

  const fetchFollowStatus = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/users/follow?userId=${userId}`);
      if (!response.ok) throw new Error('Failed to fetch follow status');

      const data = await response.json();
      setFollowerCount(data.followerCount);
      setFollowingCount(data.followingCount);
      setIsFollowing(data.isFollowing);
    } catch (error) {
      console.error('Fetch follow status error:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchFollowStatus();
  }, [fetchFollowStatus]);

  const follow = useCallback(async () => {
    try {
      setFollowing(true);
      const response = await fetch('/api/users/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) throw new Error('Failed to follow user');

      setIsFollowing(true);
      setFollowerCount((prev) => prev + 1);
    } catch (error) {
      console.error('Follow error:', error);
    } finally {
      setFollowing(false);
    }
  }, [userId]);

  const unfollow = useCallback(async () => {
    try {
      setFollowing(true);
      const response = await fetch(`/api/users/follow?userId=${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to unfollow user');

      setIsFollowing(false);
      setFollowerCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Unfollow error:', error);
    } finally {
      setFollowing(false);
    }
  }, [userId]);

  return {
    followerCount,
    followingCount,
    isFollowing,
    loading,
    following,
    follow,
    unfollow,
    refetch: fetchFollowStatus,
  };
}
