/**
 * Achievement System
 * 
 * Defines all available achievements/badges
 * Auto-unlock logic and progression tracking
 */

export interface Achievement {
  id: string;
  name_en: string;
  name_es: string;
  description_en: string;
  description_es: string;
  icon: string; // Emoji or icon name
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  xp_reward: number;
  /** Condition to unlock (checked automatically) */
  condition?: (stats: UserStats) => boolean;
}

export interface UserStats {
  courses_created: number;
  courses_completed: number;
  courses_enrolled: number;
  modules_completed: number;
  articles_read: number;
  perfect_scores: number;
  current_streak: number;
  total_xp: number;
  level: number;
}

/**
 * All available achievements
 */
export const ACHIEVEMENTS: Achievement[] = [
  // Course Creation
  {
    id: 'first_course',
    name_en: 'Course Creator',
    name_es: 'Creador de Cursos',
    description_en: 'Created your first course',
    description_es: 'Creaste tu primer curso',
    icon: '🎓',
    tier: 'bronze',
    xp_reward: 50,
    condition: (stats) => stats.courses_created >= 1
  },
  {
    id: 'educator',
    name_en: 'Educator',
    name_es: 'Educador',
    description_en: 'Created 10 courses',
    description_es: 'Creaste 10 cursos',
    icon: '👨‍🏫',
    tier: 'gold',
    xp_reward: 500,
    condition: (stats) => stats.courses_created >= 10
  },
  {
    id: 'master_educator',
    name_en: 'Master Educator',
    name_es: 'Educador Maestro',
    description_en: 'Created 50 courses',
    description_es: 'Creaste 50 cursos',
    icon: '🏆',
    tier: 'platinum',
    xp_reward: 2000,
    condition: (stats) => stats.courses_created >= 50
  },
  
  // Course Completion
  {
    id: 'first_completion',
    name_en: 'First Steps',
    name_es: 'Primeros Pasos',
    description_en: 'Completed your first course',
    description_es: 'Completaste tu primer curso',
    icon: '🎯',
    tier: 'bronze',
    xp_reward: 100,
    condition: (stats) => stats.courses_completed >= 1
  },
  {
    id: 'knowledge_seeker',
    name_en: 'Knowledge Seeker',
    name_es: 'Buscador de Conocimiento',
    description_en: 'Completed 5 courses',
    description_es: 'Completaste 5 cursos',
    icon: '📚',
    tier: 'silver',
    xp_reward: 300,
    condition: (stats) => stats.courses_completed >= 5
  },
  {
    id: 'course_master',
    name_en: 'Course Master',
    name_es: 'Maestro de Cursos',
    description_en: 'Completed 20 courses',
    description_es: 'Completaste 20 cursos',
    icon: '🌟',
    tier: 'gold',
    xp_reward: 1000,
    condition: (stats) => stats.courses_completed >= 20
  },
  
  // Learning Engagement
  {
    id: 'speed_reader',
    name_en: 'Speed Reader',
    name_es: 'Lector Veloz',
    description_en: 'Read 10 articles in one day',
    description_es: 'Leíste 10 artículos en un día',
    icon: '⚡',
    tier: 'silver',
    xp_reward: 200,
    // Manual unlock via daily check
  },
  {
    id: 'news_junkie',
    name_en: 'News Junkie',
    name_es: 'Adicto a las Noticias',
    description_en: 'Read 100 articles',
    description_es: 'Leíste 100 artículos',
    icon: '📰',
    tier: 'gold',
    xp_reward: 500,
    condition: (stats) => stats.articles_read >= 100
  },
  
  // Perfect Performance
  {
    id: 'perfectionist',
    name_en: 'Perfectionist',
    name_es: 'Perfeccionista',
    description_en: 'Scored 100% on a quiz',
    description_es: 'Obtuviste 100% en un quiz',
    icon: '💯',
    tier: 'silver',
    xp_reward: 150,
    condition: (stats) => stats.perfect_scores >= 1
  },
  {
    id: 'ace_student',
    name_en: 'Ace Student',
    name_es: 'Estudiante Destacado',
    description_en: 'Scored 100% on 10 quizzes',
    description_es: 'Obtuviste 100% en 10 quizzes',
    icon: '🏅',
    tier: 'gold',
    xp_reward: 1000,
    condition: (stats) => stats.perfect_scores >= 10
  },
  
  // Consistency
  {
    id: 'dedicated_learner',
    name_en: 'Dedicated Learner',
    name_es: 'Estudiante Dedicado',
    description_en: '7-day learning streak',
    description_es: 'Racha de aprendizaje de 7 días',
    icon: '🔥',
    tier: 'silver',
    xp_reward: 300,
    condition: (stats) => stats.current_streak >= 7
  },
  {
    id: 'unstoppable',
    name_en: 'Unstoppable',
    name_es: 'Imparable',
    description_en: '30-day learning streak',
    description_es: 'Racha de aprendizaje de 30 días',
    icon: '💪',
    tier: 'gold',
    xp_reward: 1500,
    condition: (stats) => stats.current_streak >= 30
  },
  {
    id: 'legend',
    name_en: 'Legend',
    name_es: 'Leyenda',
    description_en: '100-day learning streak',
    description_es: 'Racha de aprendizaje de 100 días',
    icon: '👑',
    tier: 'platinum',
    xp_reward: 5000,
    condition: (stats) => stats.current_streak >= 100
  },
  
  // Level Milestones
  {
    id: 'level_10',
    name_en: 'Rising Star',
    name_es: 'Estrella Ascendente',
    description_en: 'Reached level 10',
    description_es: 'Alcanzaste el nivel 10',
    icon: '⭐',
    tier: 'silver',
    xp_reward: 500,
    condition: (stats) => stats.level >= 10
  },
  {
    id: 'level_25',
    name_en: 'Elite Learner',
    name_es: 'Estudiante Élite',
    description_en: 'Reached level 25',
    description_es: 'Alcanzaste el nivel 25',
    icon: '💎',
    tier: 'gold',
    xp_reward: 2000,
    condition: (stats) => stats.level >= 25
  },
  {
    id: 'level_50',
    name_en: 'AI Master',
    name_es: 'Maestro de IA',
    description_en: 'Reached level 50',
    description_es: 'Alcanzaste el nivel 50',
    icon: '🚀',
    tier: 'platinum',
    xp_reward: 10000,
    condition: (stats) => stats.level >= 50
  },
  
  // Early Adopter
  {
    id: 'early_adopter',
    name_en: 'Early Adopter',
    name_es: 'Pionero',
    description_en: 'Joined in the first month',
    description_es: 'Te uniste en el primer mes',
    icon: '🌱',
    tier: 'gold',
    xp_reward: 1000,
    // Manual unlock for early users
  },
  
  // Community
  {
    id: 'helpful',
    name_en: 'Helpful',
    name_es: 'Servicial',
    description_en: 'Shared 10 articles',
    description_es: 'Compartiste 10 artículos',
    icon: '🤝',
    tier: 'silver',
    xp_reward: 200,
    // Track via article_share actions
  }
];

/**
 * Get achievement by ID
 */
export function getAchievement(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find(a => a.id === id);
}

/**
 * Get achievements by tier
 */
export function getAchievementsByTier(tier: Achievement['tier']): Achievement[] {
  return ACHIEVEMENTS.filter(a => a.tier === tier);
}

/**
 * Check which achievements user should have unlocked
 */
export function checkUnlockedAchievements(
  stats: UserStats,
  currentAchievements: string[]
): Achievement[] {
  const newUnlocks: Achievement[] = [];
  
  for (const achievement of ACHIEVEMENTS) {
    // Skip if already unlocked
    if (currentAchievements.includes(achievement.id)) {
      continue;
    }
    
    // Check condition
    if (achievement.condition && achievement.condition(stats)) {
      newUnlocks.push(achievement);
    }
  }
  
  return newUnlocks;
}

/**
 * Get achievement tier color
 */
export function getAchievementColor(tier: Achievement['tier']): string {
  switch (tier) {
    case 'bronze':
      return 'hsl(30 80% 50%)';
    case 'silver':
      return 'hsl(0 0% 70%)';
    case 'gold':
      return 'hsl(45 100% 60%)';
    case 'platinum':
      return 'hsl(210 100% 70%)';
  }
}
