'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '@/lib/hooks/useUser';
import { loggers } from '@/lib/utils/logger';

export function XPAnimator() {
  const { refetch } = useUser();
  const [pings, setPings] = useState<Array<{ id: string; amount: number; x: number; y: number }>>([]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ amount: number; from?: { x: number; y: number } | null }>).detail;
      const clientX = detail?.from?.x ?? window.innerWidth - 100;
      const clientY = detail?.from?.y ?? window.innerHeight - 100;
      const id = `xp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      setPings((p) => [...p, { id, amount: detail?.amount || 0, x: clientX, y: clientY }]);
      // Optimistically refresh user's profile to reflect new XP
      try {
        setTimeout(() => refetch && refetch(), 1000);
      } catch (err) {
        loggers.warn('xp', 'Failed to call refetch after xp-awarded', err);
      }
    };

    window.addEventListener('xp-awarded', handler as EventListener);
    return () => window.removeEventListener('xp-awarded', handler as EventListener);
  }, [refetch]);

  const handleComplete = (id: string) => {
    setPings((p) => p.filter((x) => x.id !== id));
  };

  // Avatar bounding rect for animation target
  const getAvatarTarget = () => {
    const avatarEl = document.querySelector('.user-avatar-target');
    if (!avatarEl) {
      return { x: window.innerWidth - 60, y: 40 };
    }
    const rect = avatarEl.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  };

  return (
    <div aria-hidden>
      <AnimatePresence>
        {pings.map((ping) => {
          const target = getAvatarTarget();
          return (
            <motion.div
              key={ping.id}
              initial={{ x: ping.x, y: ping.y, opacity: 1, scale: 1 }}
              animate={{ x: target.x, y: target.y, opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.9, ease: 'easeInOut' }}
              onAnimationComplete={() => handleComplete(ping.id)}
              className="pointer-events-none fixed z-[80]"
            >
              <div className="rounded-full bg-emerald-500/80 px-3 py-1 text-xs font-bold text-white shadow-lg">+{ping.amount} XP</div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

export default XPAnimator;
