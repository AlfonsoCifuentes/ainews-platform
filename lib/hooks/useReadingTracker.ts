"use client";

import { useEffect, useState } from 'react';

interface UseReadingTrackerOptions {
  articleId: string;
  enabled?: boolean;
}

export function useReadingTracker({ articleId, enabled = true }: UseReadingTrackerOptions) {
  const [startTime] = useState(Date.now());
  const [scrollDepth, setScrollDepth] = useState(0);
  const [hasRecorded, setHasRecorded] = useState(false);

  useEffect(() => {
    if (!enabled || !articleId) return;

    const handleScroll = () => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY;
      const scrollPercent = Math.round(
        ((scrollTop + windowHeight) / documentHeight) * 100
      );
      setScrollDepth(Math.max(scrollDepth, Math.min(scrollPercent, 100)));
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [enabled, articleId, scrollDepth]);

  useEffect(() => {
    if (!enabled || !articleId || hasRecorded) return;

    // Record reading when user has read 50%+ or spent 30+ seconds
    const checkAndRecord = () => {
      const timeSpent = Math.floor((Date.now() - startTime) / 1000);
      
      if (scrollDepth >= 50 || timeSpent >= 30) {
        recordReading();
        setHasRecorded(true);
      }
    };

    const interval = setInterval(checkAndRecord, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [enabled, articleId, scrollDepth, startTime, hasRecorded]);

  const recordReading = async () => {
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);

    try {
      await fetch('/api/reading-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId,
          timeSpent,
          scrollDepth,
        }),
      });
    } catch (error) {
      console.error('Failed to record reading:', error);
    }
  };

  return { scrollDepth, timeSpent: Math.floor((Date.now() - startTime) / 1000) };
}
