"use client";

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useGamification } from '@/lib/hooks/useGamification';

/**
 * Daily Login Tracker
 * Awards XP for daily logins (once per day)
 * Place in root layout to track all page visits
 */
export function DailyLoginTracker({ userId }: { userId: string }) {
  const pathname = usePathname();
  const { awardXP } = useGamification();
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    if (hasChecked || !userId) return;

    const checkDailyLogin = async () => {
      const today = new Date().toDateString();
      const lastLogin = localStorage.getItem('last_login_date');

      // Award XP if it's a new day
      if (lastLogin !== today) {
        try {
          await awardXP('DAILY_LOGIN');
          localStorage.setItem('last_login_date', today);
        } catch (error) {
          console.error('Failed to award daily login XP:', error);
        }
      }

      setHasChecked(true);
    };

    checkDailyLogin();
  }, [userId, hasChecked, awardXP, pathname]);

  return null; // This component doesn't render anything
}
