"use client";

import { useEffect, useRef, useState } from 'react';

export interface SwipeConfig {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number; // Minimum distance for swipe
  velocity?: number;   // Minimum velocity for swipe
}

export function useSwipeGesture(config: SwipeConfig) {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    threshold = 50,
    velocity = 0.3
  } = config;

  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);
  const [startTime, setStartTime] = useState<number>(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    });
    setStartTime(Date.now());
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    });
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const deltaX = touchStart.x - touchEnd.x;
    const deltaY = touchStart.y - touchEnd.y;
    const deltaTime = Date.now() - startTime;
    const velocityX = Math.abs(deltaX) / deltaTime;
    const velocityY = Math.abs(deltaY) / deltaTime;

    // Horizontal swipe
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (Math.abs(deltaX) > threshold && velocityX > velocity) {
        if (deltaX > 0) {
          onSwipeLeft?.();
        } else {
          onSwipeRight?.();
        }
      }
    }
    // Vertical swipe
    else {
      if (Math.abs(deltaY) > threshold && velocityY > velocity) {
        if (deltaY > 0) {
          onSwipeUp?.();
        } else {
          onSwipeDown?.();
        }
      }
    }

    // Reset
    setTouchStart(null);
    setTouchEnd(null);
  };

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd
  };
}

// Hook for pull-to-refresh
export function usePullToRefresh(onRefresh: () => void | Promise<void>, threshold = 80) {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const scrollTop = useRef(0);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      scrollTop.current = window.scrollY || document.documentElement.scrollTop;
      if (scrollTop.current === 0) {
        startY.current = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (scrollTop.current > 0 || isRefreshing) return;

      const currentY = e.touches[0].clientY;
      const distance = currentY - startY.current;

      if (distance > 0) {
        setIsPulling(true);
        // Apply diminishing returns for pull distance
        const dampedDistance = Math.min(distance * 0.5, threshold * 1.5);
        setPullDistance(dampedDistance);
      }
    };

    const handleTouchEnd = async () => {
      if (pullDistance >= threshold && !isRefreshing) {
        setIsRefreshing(true);
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
        }
      }
      setIsPulling(false);
      setPullDistance(0);
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [pullDistance, threshold, onRefresh, isRefreshing]);

  return { isPulling, pullDistance, isRefreshing };
}

// Hook for haptic feedback (Vibration API)
export function useHapticFeedback() {
  const vibrate = (pattern: number | number[] = 10) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  };

  const light = () => vibrate(10);
  const medium = () => vibrate(20);
  const heavy = () => vibrate([10, 20, 10]);
  const success = () => vibrate([10, 30, 10]);
  const error = () => vibrate([20, 50, 20]);

  return { vibrate, light, medium, heavy, success, error };
}
