'use client';

import { useEffect } from 'react';
import confetti from 'canvas-confetti';

interface ConfettiExplosionProps {
  trigger: boolean;
}

export function ConfettiExplosion({ trigger }: ConfettiExplosionProps) {
  useEffect(() => {
    if (!trigger) return;

    // Trigger confetti explosion
    const duration = 3 * 1000; // 3 seconds
    const animationEnd = Date.now() + duration;

    const randomInRange = (min: number, max: number) => {
      return Math.random() * (max - min) + min;
    };

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        clearInterval(interval);
        return;
      }

      // Burst from center
      confetti({
        particleCount: 30,
        angle: randomInRange(55, 125),
        spread: randomInRange(50, 70),
        origin: { x: 0.5, y: 0.5 },
        startVelocity: randomInRange(35, 65),
        decay: randomInRange(0.8, 0.95),
        gravity: 1,
      });
    }, 250);

    return () => clearInterval(interval);
  }, [trigger]);

  return null;
}
