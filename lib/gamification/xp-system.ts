/**
 * XP System
 * 
 * Manages experience points and leveling system
 * Exponential curve: level = floor(sqrt(xp_total / 100)) + 1
 */

export interface XPAction {
  type: string;
  amount: number;
  description_en: string;
  description_es: string;
}

/**
 * XP amounts for different actions
 */
export const XP_ACTIONS: Record<string, XPAction> = {
  // Course actions
  course_create: {
    type: 'course_create',
    amount: 100,
    description_en: 'Created a course',
    description_es: 'Curso creado'
  },
  course_enroll: {
    type: 'course_enroll',
    amount: 10,
    description_en: 'Enrolled in a course',
    description_es: 'Inscrito en un curso'
  },
  module_complete: {
    type: 'module_complete',
    amount: 50,
    description_en: 'Completed a module',
    description_es: 'Módulo completado'
  },
  course_complete: {
    type: 'course_complete',
    amount: 200,
    description_en: 'Completed a course',
    description_es: 'Curso completado'
  },
  perfect_score: {
    type: 'perfect_score',
    amount: 100,
    description_en: 'Perfect score on quiz',
    description_es: 'Puntuación perfecta en quiz'
  },
  
  // Reading actions
  article_read: {
    type: 'article_read',
    amount: 5,
    description_en: 'Read an article',
    description_es: 'Artículo leído'
  },
  article_bookmark: {
    type: 'article_bookmark',
    amount: 2,
    description_en: 'Bookmarked an article',
    description_es: 'Artículo guardado'
  },
  article_share: {
    type: 'article_share',
    amount: 3,
    description_en: 'Shared an article',
    description_es: 'Artículo compartido'
  },
  
  // Engagement actions
  daily_login: {
    type: 'daily_login',
    amount: 10,
    description_en: 'Daily login',
    description_es: 'Inicio de sesión diario'
  },
  week_streak: {
    type: 'week_streak',
    amount: 50,
    description_en: '7-day streak',
    description_es: 'Racha de 7 días'
  },
  profile_complete: {
    type: 'profile_complete',
    amount: 20,
    description_en: 'Completed profile',
    description_es: 'Perfil completado'
  }
};

/**
 * Calculate level from total XP
 * Formula: level = floor(sqrt(xp_total / 100)) + 1
 */
export function calculateLevel(totalXP: number): number {
  return Math.floor(Math.sqrt(totalXP / 100)) + 1;
}

/**
 * Calculate XP required for a specific level
 */
export function xpForLevel(level: number): number {
  return Math.pow(level - 1, 2) * 100;
}

/**
 * Calculate XP required to reach next level
 */
export function xpToNextLevel(currentXP: number): number {
  const currentLevel = calculateLevel(currentXP);
  const xpForNext = xpForLevel(currentLevel + 1);
  return xpForNext - currentXP;
}

/**
 * Get progress percentage to next level
 */
export function levelProgress(currentXP: number): number {
  const currentLevel = calculateLevel(currentXP);
  const currentLevelXP = xpForLevel(currentLevel);
  const nextLevelXP = xpForLevel(currentLevel + 1);
  const xpIntoCurrentLevel = currentXP - currentLevelXP;
  const xpRequiredForLevel = nextLevelXP - currentLevelXP;
  
  return Math.round((xpIntoCurrentLevel / xpRequiredForLevel) * 100);
}

/**
 * Get level tier (for UI theming)
 */
export function getLevelTier(level: number): {
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  color: string;
} {
  if (level >= 40) {
    return { tier: 'diamond', color: 'hsl(210 100% 70%)' };
  } else if (level >= 30) {
    return { tier: 'platinum', color: 'hsl(0 0% 90%)' };
  } else if (level >= 20) {
    return { tier: 'gold', color: 'hsl(45 100% 60%)' };
  } else if (level >= 10) {
    return { tier: 'silver', color: 'hsl(0 0% 70%)' };
  } else {
    return { tier: 'bronze', color: 'hsl(30 80% 50%)' };
  }
}

/**
 * Format XP number with commas
 */
export function formatXP(xp: number): string {
  return xp.toLocaleString();
}
