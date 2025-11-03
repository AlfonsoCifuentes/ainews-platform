'use client';

import { useEffect } from 'react';
import { useUser } from '@/lib/hooks/useUser';
import { showBadges } from './BadgeNotificationProvider';

/**
 * Client-side hook to trigger badge checks after user actions
 * Call this after awarding XP, completing courses, etc.
 */
export function useBadgeCheck() {
  const { user } = useUser();

  const checkBadges = async (
    triggerType: string,
    triggerData: Record<string, unknown> = {}
  ) => {
    if (!user) return;

    try {
      const response = await fetch('/api/badges/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          triggerType,
          triggerData,
        }),
      });

      if (!response.ok) {
        console.error('Failed to check badges:', await response.text());
        return;
      }

      const data = await response.json();

      if (data.badges && data.badges.length > 0) {
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
      console.error('Error checking badges:', error);
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
