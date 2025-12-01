'use client';

import { useEffect } from 'react';
import { useUser } from '@/lib/hooks/useUser';
import { loggers } from '@/lib/utils/logger';
import { showBadges } from './BadgeNotificationProvider';

/**
 * Client-side hook to trigger badge checks after user actions
 * Call this after awarding XP, completing courses, etc.
 */
export function useBadgeCheck() {
  const { profile } = useUser();

  const checkBadges = async (
    triggerType: string,
    triggerData: Record<string, unknown> = {}
  ) => {
    if (!profile) return;

      try {
        // If user profile exists but no Supabase cookies are present, skip the call and surface a debug message
        try {
          const cookieString = typeof document !== 'undefined' ? document.cookie : '';
          const hasSupabaseCookie = cookieString.includes('sb-') || cookieString.includes('supabase');
          if (!hasSupabaseCookie) {
            loggers.warn('badges', 'Profile exists but Supabase cookies not present, skipping badge check', { profileId: profile.id });
            window.dispatchEvent(new CustomEvent('server-debug', {
              detail: {
                route: '/api/badges/check',
                status: 0,
                statusText: 'No Supabase cookie present on client',
                body: { message: 'Skipping badge check because no Supabase cookies were found on client - check CookieNorm settings or SameSite attributes' },
                triggerType,
              }
            }));
            return;
          }
        } catch (cookieErr) {
          loggers.warn('badges', 'Failed to inspect cookies before calling badge check', cookieErr);
        }
        // Log client cookie state before making the request for diagnosis
        try {
          const allCookies = typeof document !== 'undefined' ? document.cookie : '';
          loggers.user('Badges check - client cookie state', { cookieSummary: allCookies ? allCookies.split(';').map(c => c.split('=')[0].trim()) : [], hasSupabaseCookie: (allCookies || '').includes('sb-') || (allCookies || '').includes('supabase') });
        } catch (cookieErr) {
          loggers.warn('badges', 'Failed to read document.cookie for badge check', cookieErr);
        }

        const response = await fetch('/api/badges/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId: profile.id,
          triggerType,
          triggerData,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        loggers.error('badges', 'Badge check request failed', {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
          triggerType,
          triggerData,
        });

        // Emit a server-debug event so UI can show the response details
        // Try to extract debug messages from JSON responses
        let parsedBody: unknown = errorText;
        try { parsedBody = JSON.parse(errorText); } catch {}
        window.dispatchEvent(new CustomEvent('server-debug', {
          detail: {
            route: '/api/badges/check',
            status: response.status,
            statusText: response.statusText,
            body: parsedBody,
            triggerType,
            headers: {
              'x-ainews-debug-id': response.headers.get('x-ainews-debug-id') ?? null,
            }
          },
        }));

        return;
      }

      const data = await response.json();

      if (data.badges && data.badges.length > 0) {
        loggers.success('badges', 'New badges awarded', {
          count: data.badges.length,
          triggerType,
        });
        // Show badge unlock notification
        showBadges(
          data.badges.map((badge: {
            badge_id: string;
            badge_name: string;
            badge_icon: string;
          }) => ({
            id: badge.badge_id,
            name: badge.badge_name,
            icon: badge.badge_icon,
            rarity: 'rare', // TODO: Get from badge data
          }))
        );
      }
    } catch (error) {
      loggers.error('badges', 'Unexpected badge check error', error);
    }
  };

  return { checkBadges };
}

/**
 * Auto-check badges component
 * Automatically checks badges when XP is awarded via events
 */
export function AutoBadgeChecker() {
  const { checkBadges } = useBadgeCheck();

  useEffect(() => {
    // Listen for XP award events
    const handleXPAwarded = (event: Event) => {
      const customEvent = event as CustomEvent<{
        amount: number;
        source: string;
      }>;
      void checkBadges('xp_threshold', {
        amount: customEvent.detail.amount,
        source: customEvent.detail.source,
      });
    };

    // Listen for article read events
    const handleArticleRead = () => {
      void checkBadges('article_read');
    };

    // Listen for course completion events
    const handleCourseComplete = () => {
      void checkBadges('course_complete');
    };

    // Listen for comment posted events
    const handleCommentPosted = () => {
      void checkBadges('comment_count');
    };

    // Listen for rating given events
    const handleRatingGiven = () => {
      void checkBadges('rating_given');
    };

    // Listen for bookmark events
    const handleBookmarkAdded = () => {
      void checkBadges('bookmark_count');
    };

    window.addEventListener('xp-awarded', handleXPAwarded);
    window.addEventListener('article-read', handleArticleRead);
    window.addEventListener('course-complete', handleCourseComplete);
    window.addEventListener('comment-posted', handleCommentPosted);
    window.addEventListener('rating-given', handleRatingGiven);
    window.addEventListener('bookmark-added', handleBookmarkAdded);

    return () => {
      window.removeEventListener('xp-awarded', handleXPAwarded);
      window.removeEventListener('article-read', handleArticleRead);
      window.removeEventListener('course-complete', handleCourseComplete);
      window.removeEventListener('comment-posted', handleCommentPosted);
      window.removeEventListener('rating-given', handleRatingGiven);
      window.removeEventListener('bookmark-added', handleBookmarkAdded);
    };
  }, [checkBadges]);

  return null;
}
