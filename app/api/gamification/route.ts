/**
 * Gamification API - XP, badges, and leaderboards
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/db/supabase';
import { z } from 'zod';

const AwardXPSchema = z.object({
  source: z.enum([
    'article_read',
    'flashcard_reviewed',
    'course_started',
    'course_completed',
    'bookmark_created',
    'comment_posted',
    'badge_earned',
  ]),
  sourceId: z.string().optional(),
  xpAmount: z.number().min(1).max(1000),
  description: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    const supabase = getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user XP stats
    if (action === 'stats') {
      const { data: xpData, error: xpError } = await supabase
        .from('user_xp')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (xpError && xpError.code !== 'PGRST116') {
        throw xpError;
      }

      // Get user badges
      const { data: badges, error: badgesError } = await supabase
        .from('user_badges')
        .select(
          `
          *,
          badge:badges(*)
        `
        )
        .eq('user_id', user.id)
        .order('earned_at', { ascending: false });

      if (badgesError) throw badgesError;

      // Get recent XP transactions
      const { data: transactions, error: txError } = await supabase
        .from('xp_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (txError) throw txError;

      return NextResponse.json({
        xp: xpData || {
          total_xp: 0,
          level: 1,
          current_level_xp: 0,
          xp_to_next_level: 100,
          streak_days: 0,
          longest_streak: 0,
        },
        badges: badges || [],
        recentTransactions: transactions || [],
      });
    }

    // Get leaderboard
    if (action === 'leaderboard') {
      const limit = parseInt(searchParams.get('limit') || '50', 10);
      const { data, error } = await supabase
        .rpc('get_leaderboard', { p_limit: limit })
        .select('*');

      if (error) throw error;

      return NextResponse.json({ leaderboard: data || [] });
    }

    // Get available badges
    if (action === 'badges') {
      const locale = (searchParams.get('locale') || 'en') as 'en' | 'es';

      const { data, error } = await supabase
        .from('badges')
        .select(`id, name_en, name_es, description_en, description_es, icon, category, rarity, xp_reward, criteria`)
        .order('rarity', { ascending: false })
        .order('xp_reward', { ascending: false });

      if (error) throw error;

      // Get user's earned badges
      const { data: earnedBadges } = await supabase
        .from('user_badges')
        .select('badge_id, earned_at')
        .eq('user_id', user.id);

      const earnedBadgeIds = new Set(earnedBadges?.map((b) => b.badge_id));

      const enrichedBadges = data?.map((badge) => ({
        id: badge.id,
        name: locale === 'en' ? badge.name_en : badge.name_es,
        description: locale === 'en' ? badge.description_en : badge.description_es,
        icon: badge.icon,
        category: badge.category,
        rarity: badge.rarity,
        xp_reward: badge.xp_reward,
        criteria: badge.criteria,
        isEarned: earnedBadgeIds.has(badge.id),
        earnedAt: earnedBadges?.find((b) => b.badge_id === badge.id)?.earned_at,
      }));

      return NextResponse.json({ badges: enrichedBadges || [] });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Gamification GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    const supabase = getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Award XP
    if (action === 'award_xp') {
      const body = await req.json();
      const validated = AwardXPSchema.parse(body);

      // Call database function to award XP
      const { data, error } = await supabase.rpc('award_xp', {
        p_user_id: user.id,
        p_xp_amount: validated.xpAmount,
        p_source: validated.source,
        p_source_id: validated.sourceId || null,
        p_description: validated.description || null,
      });

      if (error) throw error;

      // Check for new badges
      await checkAndAwardBadges(user.id, validated.source, supabase);

      return NextResponse.json({ success: true, result: data });
    }

    // Update streak
    if (action === 'update_streak') {
      const { data, error } = await supabase.rpc('update_streak', {
        p_user_id: user.id,
      });

      if (error) throw error;

      // Check for streak badges
      await checkAndAwardBadges(user.id, 'streak', supabase);

      return NextResponse.json({ success: true, result: data });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Gamification POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Check and award badges based on user activity
 */
async function checkAndAwardBadges(
  userId: string,
  activityType: string,
  supabase: ReturnType<typeof getSupabaseServerClient>
) {
  try {
    // Get all badges
    const { data: badges } = await supabase.from('badges').select('*');

    if (!badges) return;

    // Get user's current badges
    const { data: userBadges } = await supabase
      .from('user_badges')
      .select('badge_id')
      .eq('user_id', userId);

    const earnedBadgeIds = new Set(
      userBadges?.map((b: { badge_id: string }) => b.badge_id)
    );

    interface BadgeCriteria {
      type: string;
      count?: number;
      days?: number;
    }

    // Check each badge criteria
    for (const badge of badges) {
      if (earnedBadgeIds.has(badge.id)) continue; // Already earned

      const criteria = badge.criteria as BadgeCriteria;
      let shouldAward = false;

      // Article read badges
      if (criteria.type === 'article_read' && activityType === 'article_read') {
        const { count } = await supabase
          .from('reading_history')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .gte('read_percentage', 80);

        shouldAward = (count ?? 0) >= (criteria.count ?? 0);
      }

      // Flashcard badges
      if (
        criteria.type === 'flashcard_reviewed' &&
        activityType === 'flashcard_reviewed'
      ) {
        const { count } = await supabase
          .from('flashcards')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .gte('repetitions', 1);

        shouldAward = (count ?? 0) >= (criteria.count ?? 0);
      }

      // Streak badges
      if (criteria.type === 'streak' && activityType === 'streak') {
        const { data: xpData } = await supabase
          .from('user_xp')
          .select('streak_days')
          .eq('user_id', userId)
          .single();

        shouldAward = (xpData?.streak_days ?? 0) >= (criteria.days ?? 0);
      }

      // Bookmark badges
      if (criteria.type === 'bookmark' && activityType === 'bookmark_created') {
        const { count } = await supabase
          .from('user_bookmarks')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId);

        shouldAward = (count ?? 0) >= (criteria.count ?? 0);
      }

      // Course badges
      if (criteria.type === 'course_started' && activityType === 'course_started') {
        const { count } = await supabase
          .from('user_progress')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .gte('progress', 1);

        shouldAward = (count ?? 0) >= (criteria.count ?? 0);
      }

      if (
        criteria.type === 'course_completed' &&
        activityType === 'course_completed'
      ) {
        const { count } = await supabase
          .from('user_progress')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .gte('progress', 90);

        shouldAward = (count ?? 0) >= (criteria.count ?? 0);
      }

      // Award badge if criteria met
      if (shouldAward) {
        await supabase.from('user_badges').insert({
          user_id: userId,
          badge_id: badge.id,
        });

        // Award badge XP
        await supabase.rpc('award_xp', {
          p_user_id: userId,
          p_xp_amount: badge.xp_reward,
          p_source: 'badge_earned',
          p_source_id: badge.id,
          p_description: `Earned badge: ${badge.name_en}`,
        });
      }
    }
  } catch (error) {
    console.error('Error checking badges:', error);
  }
}
