"use client";

import { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useGamification } from '@/lib/hooks/useGamification';
import { LevelUpNotification } from '@/components/shared/LevelUpNotification';

interface XPAwardWrapperProps {
  children: React.ReactNode;
  locale: 'en' | 'es';
}

/**
 * Wrapper component that monitors XP awards and shows level-up notifications
 * Place this at the root of authenticated pages to enable automatic notifications
 */
export function XPAwardWrapper({ children, locale }: XPAwardWrapperProps) {
  const [levelUp, setLevelUp] = useState<{ show: boolean; newLevel: number }>({
    show: false,
    newLevel: 1,
  });

  useEffect(() => {
    // Listen for custom XP award events
    const handleXPAward = (event: CustomEvent) => {
      const { leveledUp, newLevel } = event.detail;
      if (leveledUp) {
        setLevelUp({ show: true, newLevel });
      }
    };

    window.addEventListener('xp-awarded', handleXPAward as EventListener);

    return () => {
      window.removeEventListener('xp-awarded', handleXPAward as EventListener);
    };
  }, []);

  return (
    <>
      {children}
      <AnimatePresence>
        {levelUp.show && (
          <LevelUpNotification
            newLevel={levelUp.newLevel}
            locale={locale}
            show={levelUp.show}
            onClose={() => setLevelUp({ show: false, newLevel: 1 })}
          />
        )}
      </AnimatePresence>
    </>
  );
}

/**
 * Hook to award XP and trigger notifications
 * Use this instead of calling the API directly
 */
export function useXPAward() {
  const { awardXP: baseAwardXP } = useGamification();

  const awardXP = async (
    action: 'ARTICLE_READ' | 'COURSE_ENROLL' | 'MODULE_COMPLETE' | 'COURSE_COMPLETE' | 'COURSE_CREATE' | 'PERFECT_QUIZ' | 'DAILY_LOGIN',
    referenceId?: string
  ) => {
    const result = await baseAwardXP(action, referenceId);
    
    if (result?.leveledUp) {
      // Dispatch custom event for level up
      const event = new CustomEvent('xp-awarded', {
        detail: {
          leveledUp: true,
          newLevel: result.newLevel,
          xpAwarded: result.xpAwarded,
        },
      });
      window.dispatchEvent(event);
    }

    return result;
  };

  return { awardXP };
}
