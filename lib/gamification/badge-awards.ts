import { getSupabaseServerClient } from '@/lib/db/supabase';

interface BadgeCheckResult {
  badge_id: string;
  badge_name: string;
  badge_icon: string;
}

export type TriggerType = 
  | 'xp_threshold'
  | 'streak_days'
  | 'article_read'
  | 'course_complete'
  | 'comment_count'
  | 'rating_given'
  | 'bookmark_count';

/**
 * Check and automatically award badges to a user based on their actions
 * This function should be called after significant user actions
 */
export async function checkAndAwardBadges(
  userId: string,
  triggerType: TriggerType,
  triggerData: Record<string, unknown> = {}
): Promise<BadgeCheckResult[]> {
  const supabase = getSupabaseServerClient();

  try {
    const { data, error } = await supabase.rpc('check_and_award_badges', {
      p_user_id: userId,
      p_trigger_type: triggerType,
      p_trigger_data: triggerData,
    });

    if (error) {
      console.error('Error checking badges:', error);
      return [];
    }

    return (data as BadgeCheckResult[]) || [];
  } catch (error) {
    console.error('Exception in checkAndAwardBadges:', error);
    return [];
  }
}

/**
 * Get all badge triggers for display purposes (showing requirements)
 */
export async function getBadgeTriggers() {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from('badge_triggers')
    .select(`
      id,
      badge_id,
      trigger_type,
      trigger_condition,
      is_active,
      badges (
        id,
        name_en,
        name_es,
        description_en,
        description_es,
        icon,
        rarity
      )
    `)
    .eq('is_active', true)
    .order('badge_id');

  if (error) {
    console.error('Error fetching badge triggers:', error);
    return [];
  }

  return data || [];
}

/**
 * Get badge award history for a user
 */
export async function getUserBadgeAwardLog(userId: string) {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from('badge_award_log')
    .select(`
      id,
      badge_id,
      awarded_at,
      trigger_type,
      trigger_data,
      auto_awarded,
      badges (
        name_en,
        name_es,
        icon,
        rarity
      )
    `)
    .eq('user_id', userId)
    .order('awarded_at', { ascending: false });

  if (error) {
    console.error('Error fetching badge award log:', error);
    return [];
  }

  return data || [];
}

/**
 * Helper function to format trigger condition for display
 */
export function formatTriggerCondition(
  triggerType: TriggerType,
  condition: Record<string, unknown>,
  locale: 'en' | 'es' = 'en'
): string {
  const t = locale === 'en' ? {
    xp: 'Earn {{value}} XP',
    streak: 'Maintain a {{value}}-day streak',
    articles: 'Read {{value}} articles',
    modules: 'Complete {{value}} course modules',
    comments: 'Post {{value}} comments',
    ratings: 'Give {{value}} ratings',
    bookmarks: 'Save {{value}} bookmarks',
  } : {
    xp: 'Gana {{value}} XP',
    streak: 'Mantén una racha de {{value}} días',
    articles: 'Lee {{value}} artículos',
    modules: 'Completa {{value}} módulos de curso',
    comments: 'Publica {{value}} comentarios',
    ratings: 'Da {{value}} calificaciones',
    bookmarks: 'Guarda {{value}} marcadores',
  };

  switch (triggerType) {
    case 'xp_threshold':
      return t.xp.replace('{{value}}', condition.threshold?.toString() || '0');
    case 'streak_days':
      return t.streak.replace('{{value}}', condition.days?.toString() || '0');
    case 'article_read':
      return t.articles.replace('{{value}}', condition.count?.toString() || '0');
    case 'course_complete':
      return t.modules.replace('{{value}}', condition.modules?.toString() || '0');
    case 'comment_count':
      return t.comments.replace('{{value}}', condition.count?.toString() || '0');
    case 'rating_given':
      return t.ratings.replace('{{value}}', condition.count?.toString() || '0');
    case 'bookmark_count':
      return t.bookmarks.replace('{{value}}', condition.count?.toString() || '0');
    default:
      return 'Unknown condition';
  }
}
