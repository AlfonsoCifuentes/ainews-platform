"use client";

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useGamification } from '@/lib/hooks/useGamification';
import { useUser } from '@/lib/hooks/useUser';

/**
 * Daily Login Tracker
 * Awards XP for daily logins (once per day)
 * Place in root layout to track all page visits
 */
export function DailyLoginTracker() {
  const pathname = usePathname();
  const { awardXP } = useGamification();
  const { profile } = useUser();
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    if (hasChecked || !profile) return;

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
  }, [profile, hasChecked, awardXP, pathname]);

  return null; // This component doesn't render anything
}
