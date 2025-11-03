/**
 * Server-side Gamification Functions
 * XP awards and achievement checking (requires server-side Supabase client)
 */

import { createClient } from '@/lib/db/supabase-server';
import { XP_VALUES, calculateLevel } from './xp';

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
  
  // Import ACHIEVEMENTS here to avoid circular dependency
  const { ACHIEVEMENTS } = await import('./xp');
  
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
