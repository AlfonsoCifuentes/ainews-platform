/**
 * Analytics Hook
 * Phase 5.1 - Category I: Observability
 * 
 * Client-side analytics tracking with automatic batching
 */

'use client';

import { useCallback, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

interface AnalyticsEvent {
  event: string;
  properties?: Record<string, unknown>;
  userId?: string;
  sessionId?: string;
  timestamp?: string;
}

// Session ID for tracking user sessions
let sessionId: string | null = null;

function getSessionId(): string {
  if (sessionId) return sessionId;

  // Try to get from sessionStorage
  if (typeof window !== 'undefined') {
    sessionId = sessionStorage.getItem('analytics-session-id');
    
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      sessionStorage.setItem('analytics-session-id', sessionId);
    }
  }

  return sessionId || 'unknown';
}

export function useAnalytics() {
  const pathname = usePathname();
  const eventQueue = useRef<AnalyticsEvent[]>([]);
  const flushTimeout = useRef<NodeJS.Timeout | null>(null);

  // Flush events to server
  const flushEvents = useCallback(async () => {
    if (eventQueue.current.length === 0) return;

    const eventsToSend = [...eventQueue.current];
    eventQueue.current = [];

    try {
      await fetch('/api/analytics', {
        method: 'PUT', // Batch endpoint
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: eventsToSend }),
      });
    } catch (error) {
      console.error('Failed to send analytics events:', error);
      // Re-queue events on failure
      eventQueue.current = [...eventsToSend, ...eventQueue.current];
    }
  }, []);

  // Track event
  const track = useCallback((event: string, properties?: Record<string, unknown>) => {
    const analyticsEvent: AnalyticsEvent = {
      event,
      properties,
      sessionId: getSessionId(),
      timestamp: new Date().toISOString(),
    };

    eventQueue.current.push(analyticsEvent);

    // Schedule flush (batch events within 5 seconds)
    if (flushTimeout.current) {
      clearTimeout(flushTimeout.current);
    }

    flushTimeout.current = setTimeout(() => {
      flushEvents();
    }, 5000);

    // Flush immediately if queue is large (>10 events)
    if (eventQueue.current.length >= 10) {
      if (flushTimeout.current) {
        clearTimeout(flushTimeout.current);
      }
      flushEvents();
    }
  }, [flushEvents]);

  // Track page view
  const trackPageView = useCallback((path?: string) => {
    track('page_view', {
      path: path || pathname,
      referrer: document.referrer,
      title: document.title,
    });
  }, [pathname, track]);

  // Track click
  const trackClick = useCallback((element: string, properties?: Record<string, unknown>) => {
    track('click', {
      element,
      ...properties,
    });
  }, [track]);

  // Track conversion
  const trackConversion = useCallback((goal: string, value?: number) => {
    track('conversion', {
      goal,
      value,
    });
  }, [track]);

  // Track error
  const trackError = useCallback((error: Error, context?: Record<string, unknown>) => {
    track('error', {
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack,
      ...context,
    });
  }, [track]);

  // Auto-track page views on route change
  useEffect(() => {
    trackPageView();
  }, [pathname, trackPageView]);

  // Flush events on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (eventQueue.current.length > 0) {
        // Use sendBeacon for reliable delivery
        if (navigator.sendBeacon) {
          navigator.sendBeacon(
            '/api/analytics',
            JSON.stringify({ events: eventQueue.current })
          );
        } else {
          // Fallback to synchronous fetch
          flushEvents();
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [flushEvents]);

  return {
    track,
    trackPageView,
    trackClick,
    trackConversion,
    trackError,
  };
}

// Standalone functions for use outside React components
export const analytics = {
  track: (event: string, properties?: Record<string, unknown>) => {
    fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event,
        properties,
        sessionId: getSessionId(),
      }),
    }).catch((error) => {
      console.error('Failed to track event:', error);
    });
  },

  pageView: (path: string) => {
    analytics.track('page_view', {
      path,
      referrer: typeof document !== 'undefined' ? document.referrer : undefined,
      title: typeof document !== 'undefined' ? document.title : undefined,
    });
  },

  conversion: (goal: string, value?: number) => {
    analytics.track('conversion', { goal, value });
  },
};
