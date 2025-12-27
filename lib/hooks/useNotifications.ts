'use client';

import { useState, useEffect, useCallback } from 'react';

interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  read: boolean;
  created_at: string;
}

interface UseNotificationsResult {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refetch: () => Promise<void>;
}

export function useNotifications(unreadOnly = false): UseNotificationsResult {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (unreadOnly) params.append('unreadOnly', 'true');

      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 15000);

      const response = await fetch(`/api/notifications?${params}`, {
        method: 'GET',
        credentials: 'include',
        signal: controller.signal,
      }).finally(() => {
        window.clearTimeout(timeoutId);
      });
      
      if (response.status === 401) {
        // User not authenticated
        setNotifications([]);
        setUnreadCount(0);
        setLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch notifications: ${response.status}`);
      }

      const data = await response.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Request timeout');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load notifications');
      }
    } finally {
      setLoading(false);
    }
  }, [unreadOnly]);

  useEffect(() => {
    let isMounted = true;

    const loadNotifications = async () => {
      if (isMounted) {
        await fetchNotifications();
      }
    };

    loadNotifications();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unreadOnly]); // Only depend on unreadOnly, fetchNotifications is stable due to useCallback

  const markAsRead = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/notifications?id=${id}`, {
        method: 'PATCH',
      });

      if (!response.ok) throw new Error('Failed to mark as read');

      // Update local state
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Mark as read error:', err);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to mark all as read');

      // Update local state
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error('Mark all as read error:', err);
    }
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications,
  };
}
