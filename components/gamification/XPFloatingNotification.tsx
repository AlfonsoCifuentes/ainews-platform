"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface XPFloatingNotificationProps {
  xpAmount: number;
  show: boolean;
  onComplete?: () => void;
}

/**
 * Small floating notification for XP gains
 * Shows briefly when user earns XP (without level up)
 */
export function XPFloatingNotification({ xpAmount, show, onComplete }: XPFloatingNotificationProps) {
  const [visible, setVisible] = useState(show);

  useEffect(() => {
    if (show) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        onComplete?.();
      }, 2000);

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [show, onComplete]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.8 }}
          className="fixed bottom-24 right-8 z-50 pointer-events-none"
        >
          <div className="bg-gradient-to-r from-primary to-purple-600 text-white px-6 py-3 rounded-full shadow-2xl border-2 border-white/20 flex items-center gap-2">
            <span className="text-2xl">⭐</span>
            <span className="font-bold text-lg">+{xpAmount} XP</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Global XP notification manager
 * Displays floating notifications for XP gains
 */
export function XPNotificationManager() {
  const [notification, setNotification] = useState<{ xpAmount: number; show: boolean }>({
    xpAmount: 0,
    show: false,
  });

  useEffect(() => {
    const handleXPAward = (event: CustomEvent) => {
      const { xpAwarded, leveledUp } = event.detail;
      
      // Only show floating notification if user didn't level up
      // (level up has its own full notification)
      if (!leveledUp && xpAwarded > 0) {
        setNotification({ xpAmount: xpAwarded, show: true });
      }
    };

    window.addEventListener('xp-awarded', handleXPAward as EventListener);

    return () => {
      window.removeEventListener('xp-awarded', handleXPAward as EventListener);
    };
  }, []);

  return (
    <XPFloatingNotification
      xpAmount={notification.xpAmount}
      show={notification.show}
      onComplete={() => setNotification({ xpAmount: 0, show: false })}
    />
  );
}
