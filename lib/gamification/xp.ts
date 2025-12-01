/**
 * Gamification Logic
 * XP awards, level calculation, and achievement definitions
 * Client-safe constants and pure functions only
 */

// XP values for different actions
export const XP_VALUES = {
  ARTICLE_READ: 5,
  COURSE_ENROLL: 10,
  MODULE_COMPLETE: 20,
  COURSE_COMPLETE: 100,
  COURSE_CREATE: 50,
  EXERCISE_PASS: 25,
  PERFECT_QUIZ: 30,
  DAILY_LOGIN: 5,
  WEEK_STREAK: 50,
  MONTH_STREAK: 200,
} as const;

// Level thresholds (exponential curve)
export function calculateLevel(totalXP: number): number {
  return Math.floor(Math.sqrt(totalXP / 100)) + 1;
}

export function xpForLevel(level: number): number {
  return Math.pow(level - 1, 2) * 100;
}

export function xpForNextLevel(currentXP: number): number {
  const currentLevel = calculateLevel(currentXP);
  return xpForLevel(currentLevel + 1) - currentXP;
}

// Achievement definitions
export const ACHIEVEMENTS = {
  first_course: {
    id: 'first_course',
    name: { en: 'First Course', es: 'Primer Curso' },
    description: { en: 'Created your first course', es: 'Creaste tu primer curso' },
    icon: '📚',
    condition: (stats: { createdCount: number }) => stats.createdCount >= 1
  },
  course_master: {
    id: 'course_master',
    name: { en: 'Course Master', es: 'Maestro de Cursos' },
    description: { en: 'Created 10 courses', es: 'Creaste 10 cursos' },
    icon: '🎓',
    condition: (stats: { createdCount: number }) => stats.createdCount >= 10
  },
  speed_learner: {
    id: 'speed_learner',
    name: { en: 'Speed Learner', es: 'Aprendiz Rápido' },
    description: { en: 'Completed a course in under 24 hours', es: 'Completaste un curso en menos de 24 horas' },
    icon: '⚡',
    condition: () => false // Checked separately
  },
  perfect_score: {
    id: 'perfect_score',
    name: { en: 'Perfectionist', es: 'Perfeccionista' },
    description: { en: 'Scored 100% on a quiz', es: 'Obtuviste 100% en un quiz' },
    icon: '💯',
    condition: () => false // Checked separately
  },
  week_streak: {
    id: 'week_streak',
    name: { en: '7-Day Streak', es: 'Racha de 7 Días' },
    description: { en: 'Logged in for 7 consecutive days', es: 'Iniciaste sesión 7 días consecutivos' },
    icon: '🔥',
    condition: (stats: { streakDays: number }) => stats.streakDays >= 7
  },
  month_streak: {
    id: 'month_streak',
    name: { en: '30-Day Streak', es: 'Racha de 30 Días' },
    description: { en: 'Logged in for 30 consecutive days', es: 'Iniciaste sesión 30 días consecutivos' },
    icon: '🌟',
    condition: (stats: { streakDays: number }) => stats.streakDays >= 30
  },
  early_adopter: {
    id: 'early_adopter',
    name: { en: 'Early Adopter', es: 'Adoptador Temprano' },
    description: { en: 'Joined in the first month', es: 'Te uniste en el primer mes' },
    icon: '🚀',
    condition: () => false // Checked on signup
  },
  news_reader: {
    id: 'news_reader',
    name: { en: 'News Junkie', es: 'Adicto a las Noticias' },
    description: { en: 'Read 50 articles', es: 'Leíste 50 artículos' },
    icon: '📰',
    condition: () => false // Checked separately
  }
} as const;
