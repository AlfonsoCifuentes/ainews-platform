import { UserCourse, UserProgress } from '@/lib/types/user';

/**
 * Calculates overall course progress based on completed modules
 */
export function calculateCourseProgress(
  courseModules: Array<{ id: string }>,
  userProgress: UserProgress[]
): number {
  if (courseModules.length === 0) return 0;

  const completedCount = courseModules.filter((module) =>
    userProgress.some((p) => p.module_id === module.id && p.completed)
  ).length;

  return Math.round((completedCount / courseModules.length) * 100);
}

/**
 * Determines if a course is complete
 */
export function isCourseComplete(
  courseModules: Array<{ id: string }>,
  userProgress: UserProgress[]
): boolean {
  if (courseModules.length === 0) return false;

  return courseModules.every((module) =>
    userProgress.some((p) => p.module_id === module.id && p.completed)
  );
}

/**
 * Gets next incomplete module in a course
 */
export function getNextModule(
  courseModules: Array<{ id: string; order: number }>,
  userProgress: UserProgress[]
): { id: string; order: number } | null {
  const sortedModules = [...courseModules].sort((a, b) => a.order - b.order);

  for (const courseModule of sortedModules) {
    const progress = userProgress.find((p) => p.module_id === courseModule.id);
    if (!progress || !progress.completed) {
      return courseModule;
    }
  }

  return null;
}

/**
 * Calculates average quiz score across all completed modules
 */
export function getAverageQuizScore(userProgress: UserProgress[]): number {
  const scoresWithValues = userProgress
    .map((p) => p.score)
    .filter((score): score is number => score !== null && score !== undefined);

  if (scoresWithValues.length === 0) return 0;

  const sum = scoresWithValues.reduce((acc, score) => acc + score, 0);
  return Math.round(sum / scoresWithValues.length);
}

/**
 * Gets total time spent on a course
 */
export function getTotalTimeSpent(userProgress: UserProgress[]): number {
  return userProgress.reduce((total, p) => total + (p.time_spent || 0), 0);
}

/**
 * Formats time in seconds to human-readable format
 */
export function formatTimeSpent(seconds: number, locale: 'en' | 'es'): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return locale === 'en'
      ? `${hours}h ${minutes}m`
      : `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return locale === 'en' ? `${minutes} min` : `${minutes} min`;
  }

  return locale === 'en' ? `< 1 min` : `< 1 min`;
}

/**
 * Checks if user has perfect score on all quizzes
 */
export function hasPerfectScore(userProgress: UserProgress[]): boolean {
  const scores = userProgress
    .map((p) => p.score)
    .filter((score): score is number => score !== null && score !== undefined);

  if (scores.length === 0) return false;

  return scores.every((score) => score === 100);
}

/**
 * Gets completion date of course
 */
export function getCompletionDate(userCourse: UserCourse): Date | null {
  return userCourse.completed_at ? new Date(userCourse.completed_at) : null;
}

/**
 * Calculates days since course enrollment
 */
export function getDaysSinceEnrollment(userCourse: UserCourse): number {
  const enrolledDate = new Date(userCourse.enrolled_at);
  const now = new Date();
  const diffMs = now.getTime() - enrolledDate.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Checks if course was completed in record time (< 24 hours)
 */
export function wasCompletedInRecordTime(userCourse: UserCourse): boolean {
  if (!userCourse.completed_at) return false;

  const enrolledDate = new Date(userCourse.enrolled_at);
  const completedDate = new Date(userCourse.completed_at);
  const diffMs = completedDate.getTime() - enrolledDate.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  return diffHours < 24;
}
