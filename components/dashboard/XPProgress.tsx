'use client';

import { motion } from 'framer-motion';
import { calculateLevel, xpForLevel, xpForNextLevel } from '@/lib/gamification/xp';

interface XPProgressProps {
  totalXP: number;
  locale: 'en' | 'es';
}

export function XPProgress({ totalXP, locale }: XPProgressProps) {
  const currentLevel = calculateLevel(totalXP);
  const currentLevelXP = xpForLevel(currentLevel);
  const nextLevelXP = xpForLevel(currentLevel + 1);
  const xpInCurrentLevel = totalXP - currentLevelXP;
  const xpNeededForLevel = nextLevelXP - currentLevelXP;
  const progress = (xpInCurrentLevel / xpNeededForLevel) * 100;
  
  const translations = {
    en: {
      level: 'Level',
      nextLevel: 'Next Level',
      xpToGo: 'XP to go'
    },
    es: {
      level: 'Nivel',
      nextLevel: 'Próximo Nivel',
      xpToGo: 'XP restante'
    }
  }[locale];

  return (
    <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 dark:from-purple-500/20 dark:to-blue-500/20 rounded-2xl p-6 border border-purple-500/20">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
            {translations.level}
          </div>
          <div className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            {currentLevel}
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
            {translations.nextLevel}
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {currentLevel + 1}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full"
        />
      </div>

      {/* XP Text */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600 dark:text-gray-400">
          {xpInCurrentLevel.toLocaleString()} / {xpNeededForLevel.toLocaleString()} XP
        </span>
        <span className="font-medium text-purple-600 dark:text-purple-400">
          {xpForNextLevel(totalXP).toLocaleString()} {translations.xpToGo}
        </span>
      </div>
    </div>
  );
}
