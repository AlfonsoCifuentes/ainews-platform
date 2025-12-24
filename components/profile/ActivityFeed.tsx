"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { UserXPLog } from '@/lib/types/user';

interface ActivityFeedProps {
  activities: UserXPLog[];
  locale: 'en' | 'es';
}

const ACTION_ICONS: Record<string, string> = {
  ARTICLE_READ: '📰',
  COURSE_ENROLL: '📚',
  MODULE_COMPLETE: '✅',
  COURSE_COMPLETE: '🎓',
  COURSE_CREATE: '✍️',
  PERFECT_QUIZ: '💯',
  DAILY_LOGIN: '🌅',
  WEEK_STREAK: '🔥',
  MONTH_STREAK: '🌟',
};

const ACTION_LABELS = {
  en: {
    ARTICLE_READ: 'Read an article',
    COURSE_ENROLL: 'Enrolled in a course',
    MODULE_COMPLETE: 'Completed a module',
    COURSE_COMPLETE: 'Completed a course',
    COURSE_CREATE: 'Created a course',
    PERFECT_QUIZ: 'Scored 100% on a quiz',
    DAILY_LOGIN: 'Daily login',
    WEEK_STREAK: '7-day streak',
    MONTH_STREAK: '30-day streak',
  },
  es: {
    ARTICLE_READ: 'Leyó un artículo',
    COURSE_ENROLL: 'Se inscribió en un curso',
    MODULE_COMPLETE: 'Completó un módulo',
    COURSE_COMPLETE: 'Completó un curso',
    COURSE_CREATE: 'Creó un curso',
    PERFECT_QUIZ: 'Obtuvo 100% en un quiz',
    DAILY_LOGIN: 'Inicio de sesión diario',
    WEEK_STREAK: 'Racha de 7 días',
    MONTH_STREAK: 'Racha de 30 días',
  },
};

export function ActivityFeed({ activities, locale }: ActivityFeedProps) {
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => setHasMounted(true), []);

  if (activities.length === 0) {
    return (
      <div className="glass rounded-2xl border border-white/10 p-8 text-center text-muted-foreground">
        {locale === 'en' ? 'No recent activity' : 'Sin actividad reciente'}
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl border border-white/10 p-6">
      <div className="space-y-4">
        {activities.map((activity, index) => (
          <motion.div
            key={activity.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-start gap-4 border-b border-white/5 pb-4 last:border-0 last:pb-0"
          >
            {/* Icon */}
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-purple-600/20 text-2xl">
              {ACTION_ICONS[activity.action_type] || '⭐'}
            </div>

            {/* Content */}
            <div className="flex-1">
              <p className="font-semibold">{ACTION_LABELS[locale][activity.action_type as keyof typeof ACTION_LABELS.en] || activity.action_type}</p>
              <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="text-primary">+{activity.xp_amount} XP</span>
                </span>
                <span>•</span>
                <span>{hasMounted ? formatRelativeTime(activity.earned_at, locale) : new Date(activity.earned_at).toISOString().slice(0, 10)}</span>
              </div>
            </div>

            {/* XP Badge */}
            <div className="flex-shrink-0 rounded-full bg-primary/20 px-3 py-1 text-sm font-bold text-primary">
              +{activity.xp_amount}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function formatRelativeTime(date: string, locale: 'en' | 'es'): string {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return locale === 'en' ? 'Just now' : 'Ahora mismo';
  }
  if (diffMins < 60) {
    return locale === 'en' ? `${diffMins}m ago` : `Hace ${diffMins}m`;
  }
  if (diffHours < 24) {
    return locale === 'en' ? `${diffHours}h ago` : `Hace ${diffHours}h`;
  }
  if (diffDays < 7) {
    return locale === 'en' ? `${diffDays}d ago` : `Hace ${diffDays}d`;
  }
  return past.toLocaleDateString(locale);
}
