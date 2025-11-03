'use client';

import { useNotifications } from '@/lib/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import { NotificationItem } from '@/components/layout/NotificationItem';
import { Loader2, BellOff } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface NotificationsListProps {
  onClose: () => void;
}

export function NotificationsList({ onClose }: NotificationsListProps) {
  const t = useTranslations('notifications');
  const { notifications, unreadCount, loading, markAllAsRead } = useNotifications();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <BellOff className="h-12 w-12 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">{t('empty')}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="font-semibold">
          {t('title')} {unreadCount > 0 && `(${unreadCount})`}
        </h3>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={markAllAsRead}
            className="h-auto py-1 px-2 text-xs"
          >
            {t('markAllRead')}
          </Button>
        )}
      </div>

      {/* List */}
      <div className="divide-y">
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onClose={onClose}
          />
        ))}
      </div>
    </div>
  );
}
