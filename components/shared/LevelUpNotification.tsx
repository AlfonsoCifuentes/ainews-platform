'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

interface LevelUpNotificationProps {
  show: boolean;
  newLevel: number;
  onClose: () => void;
  locale: 'en' | 'es';
}

export function LevelUpNotification({ show, newLevel, onClose, locale }: LevelUpNotificationProps) {
  const [visible, setVisible] = useState(show);

  useEffect(() => {
    setVisible(show);
    if (show) {
      const timer = setTimeout(() => {
        setVisible(false);
        onClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [show, onClose]);

  const translations = {
    en: {
      levelUp: 'Level Up!',
      message: `You've reached level ${newLevel}!`,
      congrats: 'Congratulations!'
    },
    es: {
      levelUp: '¡Subiste de Nivel!',
      message: `¡Has alcanzado el nivel ${newLevel}!`,
      congrats: '¡Felicitaciones!'
    }
  }[locale];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 50 }}
          className="fixed bottom-8 right-8 z-50 max-w-sm"
        >
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 p-6 shadow-2xl">
            {/* Animated background */}
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-300/50 via-orange-400/50 to-red-400/50 animate-pulse" />
            
            {/* Particles */}
            <div className="absolute inset-0">
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 1, y: 0, x: 0 }}
                  animate={{
                    opacity: 0,
                    y: -100 - Math.random() * 50,
                    x: (Math.random() - 0.5) * 100
                  }}
                  transition={{
                    duration: 2,
                    delay: Math.random() * 0.5,
                    repeat: Infinity
                  }}
                  className="absolute bottom-0 left-1/2 w-2 h-2 bg-white rounded-full"
                  style={{
                    left: `${Math.random() * 100}%`
                  }}
                />
              ))}
            </div>

            {/* Content */}
            <div className="relative text-center text-white">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.5 }}
                className="text-6xl mb-2"
              >
                🎉
              </motion.div>

              <h3 className="text-2xl font-bold mb-1 drop-shadow-lg">
                {translations.levelUp}
              </h3>

              <p className="text-lg mb-2 drop-shadow-lg">
                {translations.message}
              </p>

              <p className="text-sm opacity-90 drop-shadow-lg">
                {translations.congrats}
              </p>
            </div>

            {/* Close button */}
            <button
              onClick={() => {
                setVisible(false);
                onClose();
              }}
              className="absolute top-2 right-2 text-white/80 hover:text-white transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
