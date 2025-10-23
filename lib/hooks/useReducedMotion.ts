/**
 * Custom hook for respecting user's motion preferences
 * Provides both Framer Motion's useReducedMotion and a general flag
 */

import { useReducedMotion as useFramerReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';

/**
 * Hook that respects prefers-reduced-motion media query
 * Returns true if user prefers reduced motion
 */
export function useReducedMotion(): boolean {
  const framerReducedMotion = useFramerReducedMotion();
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check media query
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches || framerReducedMotion || false);

    // Listen for changes
    const handler = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [framerReducedMotion]);

  return prefersReducedMotion;
}

/**
 * Get animation variants that respect reduced motion preference
 */
export function getMotionProps(shouldReduceMotion: boolean) {
  if (shouldReduceMotion) {
    return {
      initial: {},
      animate: {},
      exit: {},
      transition: { duration: 0 }
    };
  }

  return {
    // Return null to use component's default animations
    initial: undefined,
    animate: undefined,
    exit: undefined,
    transition: undefined
  };
}

/**
 * Get transition duration based on motion preference
 */
export function getTransitionDuration(
  shouldReduceMotion: boolean,
  defaultDuration: number = 0.3
): number {
  return shouldReduceMotion ? 0 : defaultDuration;
}
