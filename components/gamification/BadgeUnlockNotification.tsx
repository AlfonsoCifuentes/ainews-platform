'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import Confetti from 'react-confetti';
import useWindowSize from 'react-use/lib/useWindowSize';

interface Badge {
  id: string;
  name: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

interface BadgeUnlockNotificationProps {
  badges: Badge[];
  onClose: () => void;
  locale: 'en' | 'es';
}

export function BadgeUnlockNotification({
  badges,
  onClose,
  locale,
}: BadgeUnlockNotificationProps) {
  const { width, height } = useWindowSize();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showConfetti, setShowConfetti] = useState(true);

  const t = locale === 'en' ? {
    badgeUnlocked: 'Badge Unlocked!',
    congratulations: 'Congratulations!',
    viewBadges: 'View All Badges',
    next: 'Next',
    close: 'Close',
  } : {
    badgeUnlocked: '¡Insignia Desbloqueada!',
    congratulations: '¡Felicitaciones!',
    viewBadges: 'Ver Todas las Insignias',
    next: 'Siguiente',
    close: 'Cerrar',
  };

  useEffect(() => {
    // Stop confetti after 3 seconds
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, [currentIndex]);

  useEffect(() => {
    // Reset confetti when badge changes
    setShowConfetti(true);
  }, [currentIndex]);

  if (badges.length === 0) return null;

  const currentBadge = badges[currentIndex];
  const hasMore = currentIndex < badges.length - 1;

  const rarityColors = {
    common: 'from-gray-500 to-gray-600',
    rare: 'from-blue-500 to-blue-600',
    epic: 'from-purple-500 to-pink-600',
    legendary: 'from-yellow-500 to-orange-600',
  };

  const rarityGlow = {
    common: 'shadow-gray-500/50',
    rare: 'shadow-blue-500/50',
    epic: 'shadow-purple-500/50',
    legendary: 'shadow-yellow-500/50',
  };

  const handleNext = () => {
    if (hasMore) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      >
        {/* Confetti */}
        {showConfetti && (
          <Confetti
            width={width}
            height={height}
            recycle={false}
            numberOfPieces={200}
            gravity={0.3}
          />
        )}

        {/* Badge Card */}
        <motion.div
          initial={{ scale: 0.8, y: 50, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.8, y: 50, opacity: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="relative max-w-md w-full mx-4"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute -top-4 -right-4 z-10 p-2 rounded-full bg-secondary hover:bg-secondary/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Card */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-card to-background border border-white/10 p-8 text-center">
            {/* Background Glow */}
            <div
              className={cn(
                'absolute inset-0 opacity-20 blur-3xl',
                `bg-gradient-to-br ${rarityColors[currentBadge.rarity]}`
              )}
            />

            {/* Content */}
            <div className="relative z-10 space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <Sparkles className="w-5 h-5 text-yellow-500" />
                  <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    {t.badgeUnlocked}
                  </p>
                  <Sparkles className="w-5 h-5 text-yellow-500" />
                </div>
                <h2 className="text-3xl font-bold">{t.congratulations}</h2>
              </div>

              {/* Badge Icon */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                  type: 'spring',
                  damping: 15,
                  stiffness: 200,
                  delay: 0.2,
                }}
                className="flex justify-center"
              >
                <div
                  className={cn(
                    'relative w-32 h-32 rounded-full flex items-center justify-center text-6xl',
                    `bg-gradient-to-br ${rarityColors[currentBadge.rarity]}`,
                    `shadow-2xl ${rarityGlow[currentBadge.rarity]}`
                  )}
                >
                  {currentBadge.icon}
                  
                  {/* Pulsing Ring */}
                  <motion.div
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.5, 0, 0.5],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                    className={cn(
                      'absolute inset-0 rounded-full border-4',
                      `border-${currentBadge.rarity === 'legendary' ? 'yellow' : currentBadge.rarity === 'epic' ? 'purple' : currentBadge.rarity === 'rare' ? 'blue' : 'gray'}-500`
                    )}
                  />
                </div>
              </motion.div>

              {/* Badge Name */}
              <div className="space-y-2">
                <h3 className="text-2xl font-bold">{currentBadge.name}</h3>
                <p
                  className={cn(
                    'inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider',
                    `bg-gradient-to-r ${rarityColors[currentBadge.rarity]} text-white`
                  )}
                >
                  {currentBadge.rarity}
                </p>
              </div>

              {/* Progress Indicator */}
              {badges.length > 1 && (
                <div className="flex items-center justify-center gap-2">
                  {badges.map((_, index) => (
                    <div
                      key={index}
                      className={cn(
                        'h-2 rounded-full transition-all',
                        index === currentIndex
                          ? 'w-8 bg-primary'
                          : 'w-2 bg-secondary'
                      )}
                    />
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                {hasMore ? (
                  <button
                    onClick={handleNext}
                    className="flex-1 py-3 px-6 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
                  >
                    {t.next}
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => (window.location.href = `/${locale}/profile?tab=badges`)}
                      className="flex-1 py-3 px-6 rounded-xl border border-white/10 bg-white/5 font-semibold hover:bg-white/10 transition-colors"
                    >
                      {t.viewBadges}
                    </button>
                    <button
                      onClick={onClose}
                      className="flex-1 py-3 px-6 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
                    >
                      {t.close}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
