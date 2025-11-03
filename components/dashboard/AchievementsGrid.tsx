'use client';

import { motion } from 'framer-motion';
import { ACHIEVEMENTS } from '@/lib/gamification/xp';
import type { UserAchievement } from '@/lib/types/user';

interface AchievementsGridProps {
  achievements: UserAchievement[];
  locale: 'en' | 'es';
}

export function AchievementsGrid({ achievements, locale }: AchievementsGridProps) {
  const unlockedIds = new Set(achievements.map(a => a.achievement_id));
  
  const translations = {
    en: {
      title: 'Achievements',
      locked: 'Locked',
      unlocked: 'Unlocked'
    },
    es: {
      title: 'Logros',
      locked: 'Bloqueado',
      unlocked: 'Desbloqueado'
    }
  }[locale];

  return (
    <div className="space-y-4">
      <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
        {translations.title}
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Object.entries(ACHIEVEMENTS).map(([key, achievement], index) => {
          const isUnlocked = unlockedIds.has(key);
          const unlockedDate = achievements.find(a => a.achievement_id === key)?.unlocked_at;

          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className={`relative overflow-hidden rounded-xl p-4 border-2 transition-all ${
                isUnlocked
                  ? 'bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-500/50'
                  : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 opacity-60'
              }`}
            >
              {/* Icon */}
              <div className={`text-4xl mb-2 ${!isUnlocked && 'grayscale opacity-50'}`}>
                {achievement.icon}
              </div>

              {/* Name */}
              <div className="font-bold text-sm mb-1 text-gray-900 dark:text-white">
                {achievement.name[locale]}
              </div>

              {/* Description */}
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                {achievement.description[locale]}
              </div>

              {/* Status */}
              <div className="text-xs font-medium">
                {isUnlocked ? (
                  <span className="text-yellow-600 dark:text-yellow-400">
                    ✓ {translations.unlocked}
                  </span>
                ) : (
                  <span className="text-gray-500 dark:text-gray-500">
                    🔒 {translations.locked}
                  </span>
                )}
              </div>

              {/* Unlock date */}
              {isUnlocked && unlockedDate && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {new Date(unlockedDate).toLocaleDateString(locale)}
                </div>
              )}

              {/* Shine effect when unlocked */}
              {isUnlocked && (
                <motion.div
                  initial={{ x: '-100%' }}
                  animate={{ x: '200%' }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 5 }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                  style={{ transform: 'skewX(-20deg)' }}
                />
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
