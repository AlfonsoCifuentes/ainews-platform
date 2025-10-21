'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';

interface Notification {
  id: string;
  type: 'trending' | 'flashcard' | 'bookmark' | 'system';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    // Load notifications from localStorage
    const stored = localStorage.getItem('notifications');
    if (stored) {
      try {
        setNotifications(JSON.parse(stored));
      } catch {
        // Invalid JSON, ignore
      }
    }

    const checkFlashcardsDue = async () => {
      try {
        const res = await fetch('/api/flashcards?action=stats');
        if (res.ok) {
          const data = await res.json();
          if (data.data.due > 0) {
            addNotification({
              type: 'flashcard',
              title: 'Flashcards Due',
              message: `You have ${data.data.due} flashcard(s) ready for review`,
            });
          }
        }
      } catch {
        // Silently fail
      }
    };

    const checkForUpdates = async () => {
      try {
        // Check trending topics
        const res = await fetch('/api/trending?limit=1');
        if (res.ok) {
          const data = await res.json();
          if (data.data.length > 0 && !data.meta.cached) {
            addNotification({
              type: 'trending',
              title: 'New Trending Topic',
              message: `"${data.data[0].topic}" is trending in AI`,
            });
          }
        }
      } catch {
        // Silently fail
      }
    };

    // Check for new flashcards due
    checkFlashcardsDue();
    
    // Poll for new content every 5 minutes
    const interval = setInterval(() => {
      checkForUpdates();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      read: false,
    };

    setNotifications((prev) => {
      const updated = [newNotification, ...prev].slice(0, 20); // Keep last 20
      localStorage.setItem('notifications', JSON.stringify(updated));
      return updated;
    });
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) => {
      const updated = prev.map((n) => 
        n.id === id ? { ...n, read: true } : n
      );
      localStorage.setItem('notifications', JSON.stringify(updated));
      return updated;
    });
  };

  const markAllAsRead = () => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }));
      localStorage.setItem('notifications', JSON.stringify(updated));
      return updated;
    });
  };

  const typeIcons = {
    trending: '🔥',
    flashcard: '🎴',
    bookmark: '🔖',
    system: '⚙️',
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="relative p-2 hover:bg-muted rounded-full transition-colors"
        aria-label="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center text-xs"
          >
            {unreadCount}
          </Badge>
        )}
      </button>

      {showPanel && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-auto bg-card border rounded-lg shadow-lg z-50">
          <div className="sticky top-0 bg-card border-b p-3 flex items-center justify-between">
            <h3 className="font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-primary hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="divide-y">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                No notifications
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => markAsRead(notification.id)}
                  className={`p-3 hover:bg-muted cursor-pointer transition-colors ${
                    notification.read ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-lg">{typeIcons[notification.type]}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm">{notification.title}</p>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-primary rounded-full" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(notification.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
