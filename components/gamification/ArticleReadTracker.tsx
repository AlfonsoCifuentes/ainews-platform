"use client";

import { useEffect } from 'react';
import { useXPAward } from '@/components/gamification/XPAwardWrapper';

interface ArticleReadTrackerProps {
  articleId: string;
  userId: string;
}

/**
 * Tracks article reading and awards XP when user finishes reading
 * Place this component in article detail pages
 */
export function ArticleReadTracker({ articleId, userId }: ArticleReadTrackerProps) {
  const { awardXP } = useXPAward();

  useEffect(() => {
    if (!articleId || !userId) return;

    let scrollTimeout: NodeJS.Timeout;
    let hasAwarded = false;

    const handleScroll = () => {
      clearTimeout(scrollTimeout);

      scrollTimeout = setTimeout(() => {
        // Check if user scrolled to bottom 80% of the article
        const scrollPercentage =
          (window.scrollY + window.innerHeight) / document.documentElement.scrollHeight;

        if (scrollPercentage > 0.8 && !hasAwarded) {
          hasAwarded = true;
          
          // Check if we've already awarded XP for this article today
          const key = `article_read_${articleId}`;
          const lastRead = localStorage.getItem(key);
          const today = new Date().toDateString();

          if (lastRead !== today) {
            awardXP('ARTICLE_READ', articleId)
              .then(() => {
                localStorage.setItem(key, today);
              })
              .catch((error) => {
                console.error('Failed to award article read XP:', error);
              });
          }
        }
      }, 500);
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      clearTimeout(scrollTimeout);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [articleId, userId, awardXP]);

  return null;
}
