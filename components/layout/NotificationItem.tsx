'use client';

import { useState, useEffect } from 'react';
import { useNotifications } from '@/lib/hooks/useNotifications';
import { formatRelativeTimeFromNow } from '@/lib/utils/format';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import {
  Trophy,
  GraduationCap,
  MessageCircle,
  Heart,
  TrendingUp,
} from 'lucide-react';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  read: boolean;
  created_at: string;
}

interface NotificationItemProps {
  notification: Notification;
  onClose: () => void;
}

const iconMap: Record<string, React.ReactNode> = {
  achievement: <Trophy className="h-5 w-5 text-yellow-500" />,
  level_up: <TrendingUp className="h-5 w-5 text-green-500" />,
  course_complete: <GraduationCap className="h-5 w-5 text-blue-500" />,
  comment_reply: <MessageCircle className="h-5 w-5 text-purple-500" />,
  comment_like: <Heart className="h-5 w-5 text-red-500" />,
};

export function NotificationItem({ notification, onClose }: NotificationItemProps) {
  const router = useRouter();
  const locale = useLocale();
  const { markAsRead } = useNotifications();
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => setHasMounted(true), []);

  const handleClick = async () => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    // Navigate based on notification type
    if (notification.data?.url) {
      router.push(`/${locale}${notification.data.url}`);
      onClose();
    }
  };

  const icon = iconMap[notification.type] || <Trophy className="h-5 w-5 text-gray-500" />;

  return (
    <button
      onClick={handleClick}
      className={`w-full text-left px-4 py-3 hover:bg-accent transition-colors ${
        !notification.read ? 'bg-blue-50 dark:bg-blue-950/20' : ''
      }`}
    >
      <div className="flex gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 mt-1">{icon}</div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm mb-1">{notification.title}</p>
          <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
            {notification.message}
          </p>
          <p className="text-xs text-muted-foreground">
            {hasMounted 
              ? formatRelativeTimeFromNow(new Date(notification.created_at), locale as 'en' | 'es')
              : new Date(notification.created_at).toISOString().slice(0, 10)
            }
          </p>
        </div>

        {/* Unread indicator */}
        {!notification.read && (
          <div className="flex-shrink-0">
            <div className="h-2 w-2 rounded-full bg-blue-500" />
          </div>
        )}
      </div>
    </button>
  );
}
