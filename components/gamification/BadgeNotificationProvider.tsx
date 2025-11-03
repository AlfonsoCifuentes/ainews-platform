'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { BadgeUnlockNotification } from './BadgeUnlockNotification';

interface Badge {
  id: string;
  name: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

interface BadgeNotificationProviderProps {
  children: React.ReactNode;
  locale: 'en' | 'es';
}

// Global state for badge notifications
let showBadgeNotification: ((badges: Badge[]) => void) | null = null;

/**
 * Provider component that manages badge unlock notifications globally
 * Use the `showBadges` function exported from this file to trigger notifications
 */
export function BadgeNotificationProvider({
  children,
  locale,
}: BadgeNotificationProviderProps) {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    // Register the global notification function
    showBadgeNotification = (newBadges: Badge[]) => {
      setBadges(newBadges);
      setShowNotification(true);
    };

    return () => {
      showBadgeNotification = null;
    };
  }, []);

  const handleClose = () => {
    setShowNotification(false);
    setBadges([]);
  };

  return (
    <>
      {children}
      {showNotification && badges.length > 0 && (
        <BadgeUnlockNotification
          badges={badges}
          onClose={handleClose}
          locale={locale}
        />
      )}
    </>
  );
}

/**
 * Trigger a badge unlock notification
 * Can be called from anywhere in the app (client-side only)
 */
export function showBadges(badges: Badge[]) {
  if (showBadgeNotification) {
    showBadgeNotification(badges);
  } else {
    // Fallback to toast if provider not mounted
    badges.forEach((badge) => {
      toast.success(`🎉 Badge Unlocked: ${badge.name}`, {
        duration: 5000,
      });
    });
  }
}
