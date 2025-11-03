import { getSupabaseServerClient } from '@/lib/db/supabase';

type ActivityType =
  | 'article_read'
  | 'course_started'
  | 'course_completed'
  | 'comment_posted'
  | 'achievement_unlocked'
  | 'level_up';

type ActivityVisibility = 'public' | 'followers' | 'private';

interface CreateActivityParams {
  userId: string;
  activityType: ActivityType;
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
  visibility?: ActivityVisibility;
}

/**
 * Creates a user activity entry
 * Can be called from server actions, API routes, or cron jobs
 */
export async function createActivity(params: CreateActivityParams) {
  const db = getSupabaseServerClient();

  const { error } = await db.from('user_activities').insert({
    user_id: params.userId,
    activity_type: params.activityType,
    title: params.title,
    description: params.description || '',
    metadata: params.metadata || {},
    visibility: params.visibility || 'public',
  });

  if (error) {
    console.error('Create activity error:', error);
    throw new Error('Failed to create activity');
  }
}

/**
 * Logs when a user reads an article
 */
export async function logArticleRead(
  userId: string,
  articleTitle: string,
  articleId: string,
  locale: 'en' | 'es'
) {
  const titles = {
    en: `Read: ${articleTitle}`,
    es: `Leyó: ${articleTitle}`,
  };

  await createActivity({
    userId,
    activityType: 'article_read',
    title: titles[locale],
    metadata: {
      articleId,
      articleTitle,
    },
    visibility: 'public',
  });
}

/**
 * Logs when a user starts a course
 */
export async function logCourseStarted(
  userId: string,
  courseTitle: string,
  courseId: string,
  locale: 'en' | 'es'
) {
  const titles = {
    en: `Started course: ${courseTitle}`,
    es: `Comenzó el curso: ${courseTitle}`,
  };

  await createActivity({
    userId,
    activityType: 'course_started',
    title: titles[locale],
    metadata: {
      courseId,
      courseTitle,
    },
    visibility: 'public',
  });
}

/**
 * Logs when a user completes a course
 */
export async function logCourseCompleted(
  userId: string,
  courseTitle: string,
  courseId: string,
  locale: 'en' | 'es'
) {
  const titles = {
    en: `Completed course: ${courseTitle}`,
    es: `Completó el curso: ${courseTitle}`,
  };

  const descriptions = {
    en: `Successfully completed all modules and quizzes`,
    es: `Completó exitosamente todos los módulos y cuestionarios`,
  };

  await createActivity({
    userId,
    activityType: 'course_completed',
    title: titles[locale],
    description: descriptions[locale],
    metadata: {
      courseId,
      courseTitle,
    },
    visibility: 'public',
  });
}

/**
 * Logs when a user posts a comment
 */
export async function logCommentPosted(
  userId: string,
  commentId: string,
  articleId: string | null,
  courseId: string | null,
  locale: 'en' | 'es'
) {
  const titles = {
    en: 'Posted a comment',
    es: 'Publicó un comentario',
  };

  const contentType = articleId ? 'article' : 'course';

  await createActivity({
    userId,
    activityType: 'comment_posted',
    title: titles[locale],
    metadata: {
      commentId,
      articleId,
      courseId,
      contentType,
    },
    visibility: 'public',
  });
}

/**
 * Logs when a user unlocks an achievement
 */
export async function logAchievementUnlocked(
  userId: string,
  badgeName: string,
  locale: 'en' | 'es'
) {
  const titles = {
    en: `Unlocked achievement: ${badgeName}`,
    es: `Desbloqueó logro: ${badgeName}`,
  };

  await createActivity({
    userId,
    activityType: 'achievement_unlocked',
    title: titles[locale],
    metadata: {
      badgeName,
    },
    visibility: 'public',
  });
}

/**
 * Logs when a user levels up
 */
export async function logLevelUp(
  userId: string,
  newLevel: number,
  locale: 'en' | 'es'
) {
  const titles = {
    en: `Reached level ${newLevel}!`,
    es: `¡Alcanzó el nivel ${newLevel}!`,
  };

  await createActivity({
    userId,
    activityType: 'level_up',
    title: titles[locale],
    metadata: {
      newLevel,
    },
    visibility: 'public',
  });
}
