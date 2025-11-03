import { useCallback } from 'react';

type EventData = Record<string, string | number | boolean>;

declare global {
  interface Window {
    umami?: {
      track: (eventName: string, eventData?: EventData) => void;
    };
  }
}

export function useUmamiTracking() {
  const trackEvent = useCallback((eventName: string, eventData?: EventData) => {
    if (typeof window !== 'undefined' && window.umami) {
      window.umami.track(eventName, eventData);
    }
  }, []);

  const trackArticleView = useCallback((articleId: string, title: string, category: string) => {
    trackEvent('article-view', { articleId, title, category });
  }, [trackEvent]);

  const trackArticleBookmark = useCallback((articleId: string, action: 'add' | 'remove') => {
    trackEvent('article-bookmark', { articleId, action });
  }, [trackEvent]);

  const trackArticleShare = useCallback((articleId: string, platform: string) => {
    trackEvent('article-share', { articleId, platform });
  }, [trackEvent]);

  const trackCourseEnroll = useCallback((courseId: string, title: string) => {
    trackEvent('course-enroll', { courseId, title });
  }, [trackEvent]);

  const trackCourseComplete = useCallback((courseId: string, title: string, duration: number) => {
    trackEvent('course-complete', { courseId, title, duration });
  }, [trackEvent]);

  const trackModuleComplete = useCallback((moduleId: string, courseId: string) => {
    trackEvent('module-complete', { moduleId, courseId });
  }, [trackEvent]);

  const trackQuizSubmit = useCallback((quizId: string, score: number, passed: boolean) => {
    trackEvent('quiz-submit', { quizId, score, passed });
  }, [trackEvent]);

  const trackSearch = useCallback((query: string, resultsCount: number) => {
    trackEvent('search', { query, resultsCount });
  }, [trackEvent]);

  const trackNewsletterSubscribe = useCallback((locale: string) => {
    trackEvent('newsletter-subscribe', { locale });
  }, [trackEvent]);

  const trackLevelUp = useCallback((newLevel: number, xp: number) => {
    trackEvent('level-up', { newLevel, xp });
  }, [trackEvent]);

  const trackAchievementUnlock = useCallback((achievementId: string, achievementName: string) => {
    trackEvent('achievement-unlock', { achievementId, achievementName });
  }, [trackEvent]);

  return {
    trackEvent,
    trackArticleView,
    trackArticleBookmark,
    trackArticleShare,
    trackCourseEnroll,
    trackCourseComplete,
    trackModuleComplete,
    trackQuizSubmit,
    trackSearch,
    trackNewsletterSubscribe,
    trackLevelUp,
    trackAchievementUnlock,
  };
}
