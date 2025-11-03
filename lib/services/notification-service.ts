import { getSupabaseServerClient } from '@/lib/db/supabase';

interface CreateNotificationParams {
  userId: string;
  type: 'achievement' | 'level_up' | 'course_complete' | 'comment_reply' | 'comment_like';
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

/**
 * Creates a notification for a user
 * Can be called from server actions, API routes, or cron jobs
 */
export async function createNotification(params: CreateNotificationParams) {
  const db = getSupabaseServerClient();

  const { error } = await db.from('notifications').insert({
    user_id: params.userId,
    type: params.type,
    title: params.title,
    message: params.message,
    data: params.data || {},
    read: false,
  });

  if (error) {
    console.error('Create notification error:', error);
    throw new Error('Failed to create notification');
  }
}

/**
 * Notifies user when they unlock an achievement
 */
export async function notifyAchievementUnlock(
  userId: string,
  badgeName: string,
  locale: 'en' | 'es'
) {
  const titles = {
    en: '🏆 Achievement Unlocked!',
    es: '🏆 ¡Logro Desbloqueado!',
  };

  const messages = {
    en: `You've unlocked the "${badgeName}" badge!`,
    es: `¡Has desbloqueado la insignia "${badgeName}"!`,
  };

  await createNotification({
    userId,
    type: 'achievement',
    title: titles[locale],
    message: messages[locale],
    data: {
      badgeName,
      url: '/profile',
    },
  });
}

/**
 * Notifies user when they level up
 */
export async function notifyLevelUp(
  userId: string,
  newLevel: number,
  locale: 'en' | 'es'
) {
  const titles = {
    en: '📈 Level Up!',
    es: '📈 ¡Subiste de Nivel!',
  };

  const messages = {
    en: `Congratulations! You've reached level ${newLevel}!`,
    es: `¡Felicitaciones! ¡Alcanzaste el nivel ${newLevel}!`,
  };

  await createNotification({
    userId,
    type: 'level_up',
    title: titles[locale],
    message: messages[locale],
    data: {
      newLevel,
      url: '/profile',
    },
  });
}

/**
 * Notifies user when they complete a course
 */
export async function notifyCourseComplete(
  userId: string,
  courseTitle: string,
  courseId: string,
  locale: 'en' | 'es'
) {
  const titles = {
    en: '🎓 Course Completed!',
    es: '🎓 ¡Curso Completado!',
  };

  const messages = {
    en: `You've completed "${courseTitle}"! Great job!`,
    es: `¡Completaste "${courseTitle}"! ¡Excelente trabajo!`,
  };

  await createNotification({
    userId,
    type: 'course_complete',
    title: titles[locale],
    message: messages[locale],
    data: {
      courseId,
      url: `/courses/${courseId}`,
    },
  });
}

/**
 * Notifies user when someone replies to their comment
 */
export async function notifyCommentReply(
  userId: string,
  replierName: string,
  commentId: string,
  articleId: string | null,
  courseId: string | null,
  locale: 'en' | 'es'
) {
  const titles = {
    en: '💬 New Reply',
    es: '💬 Nueva Respuesta',
  };

  const messages = {
    en: `${replierName} replied to your comment`,
    es: `${replierName} respondió a tu comentario`,
  };

  const url = articleId
    ? `/news/${articleId}#comment-${commentId}`
    : `/courses/${courseId}#comment-${commentId}`;

  await createNotification({
    userId,
    type: 'comment_reply',
    title: titles[locale],
    message: messages[locale],
    data: {
      replierName,
      commentId,
      url,
    },
  });
}

/**
 * Notifies user when someone likes their comment
 */
export async function notifyCommentLike(
  userId: string,
  likerName: string,
  commentId: string,
  articleId: string | null,
  courseId: string | null,
  locale: 'en' | 'es'
) {
  const titles = {
    en: '❤️ Comment Liked',
    es: '❤️ Me Gusta en tu Comentario',
  };

  const messages = {
    en: `${likerName} liked your comment`,
    es: `A ${likerName} le gustó tu comentario`,
  };

  const url = articleId
    ? `/news/${articleId}#comment-${commentId}`
    : `/courses/${courseId}#comment-${commentId}`;

  await createNotification({
    userId,
    type: 'comment_like',
    title: titles[locale],
    message: messages[locale],
    data: {
      likerName,
      commentId,
      url,
    },
  });
}
