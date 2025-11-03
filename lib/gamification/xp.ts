/**
 * Gamification Logic
 * XP awards, level calculation, and achievement definitions
 */

import { createClient } from '@/lib/db/supabase-server';

// XP values for different actions
export const XP_VALUES = {
  ARTICLE_READ: 5,
  COURSE_ENROLL: 10,
  MODULE_COMPLETE: 20,
  COURSE_COMPLETE: 100,
  COURSE_CREATE: 50,
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

// Award XP to user
export async function awardXP(
  userId: string,
  action: keyof typeof XP_VALUES,
  referenceId?: string
): Promise<{ success: boolean; newXP: number; newLevel: number; leveledUp: boolean }> {
  const supabase = await createClient();
  const xpAmount = XP_VALUES[action];
  
  try {
    // Call the database function
    const { error } = await supabase.rpc('award_xp', {
      p_user_id: userId,
      p_xp_amount: xpAmount,
      p_action_type: action.toLowerCase(),
      p_reference_id: referenceId || null
    });
    
    if (error) {
      console.error('[Gamification] Error awarding XP:', error);
      return { success: false, newXP: 0, newLevel: 0, leveledUp: false };
    }
    
    // Get updated profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('total_xp, level')
      .eq('id', userId)
      .single();
    
    if (!profile) {
      return { success: false, newXP: 0, newLevel: 0, leveledUp: false };
    }
    
    const previousLevel = calculateLevel(profile.total_xp - xpAmount);
    const leveledUp = profile.level > previousLevel;
    
    // Trigger XP awarded event for badge checking
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('xp-awarded', {
          detail: { amount: xpAmount, source: action },
        })
      );
    }
    
    return {
      success: true,
      newXP: profile.total_xp,
      newLevel: profile.level,
      leveledUp
    };
    
  } catch (error) {
    console.error('[Gamification] Unexpected error:', error);
    return { success: false, newXP: 0, newLevel: 0, leveledUp: false };
  }
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

// Check and award achievements
export async function checkAchievements(userId: string) {
  const supabase = await createClient();
  
  // Get user stats
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('streak_days')
    .eq('id', userId)
    .single();
  
  const { data: courses } = await supabase
    .from('user_courses')
    .select('relationship_type')
    .eq('user_id', userId);
  
  const createdCount = courses?.filter(c => c.relationship_type === 'created').length || 0;
  const streakDays = profile?.streak_days || 0;
  
  const stats = { createdCount, streakDays };
  
  // Check each achievement
  const newAchievements: string[] = [];
  
  for (const [key, achievement] of Object.entries(ACHIEVEMENTS)) {
    if (achievement.condition(stats)) {
      // Try to insert achievement (will fail silently if already exists due to UNIQUE constraint)
      const { error } = await supabase
        .from('user_achievements')
        .insert({
          user_id: userId,
          achievement_id: key
        });
      
      if (!error) {
        newAchievements.push(key);
      }
    }
  }
  
  return newAchievements;
}
