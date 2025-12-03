import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthUser } from '@/lib/auth/auth-config';
import { getSupabaseServerClient } from '@/lib/db/supabase';

/**
 * GET /api/leaderboard?period=all|week|month&limit=50
 * Returns top users by XP for a given period
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || 'all';
    const requestedLimit = parseInt(searchParams.get('limit') || '50', 10);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), 100)
      : 50;

    const db = getSupabaseServerClient();
    const user = await getServerAuthUser();

    // Build date filter for period (only used outside the weekly materialized view)
    let dateFilterIso: string | null = null;
    if (period === 'week') {
      const date = new Date();
      date.setDate(date.getDate() - 7);
      dateFilterIso = date.toISOString();
    } else if (period === 'month') {
      const date = new Date();
      date.setMonth(date.getMonth() - 1);
      dateFilterIso = date.toISOString();
    }

    if (period === 'week') {
      const { data, error } = await db
        .from('leaderboard_weekly')
        .select(
          'id, display_name, avatar_url, total_xp, level, rank, courses_completed, badges_earned'
        )
        .order('rank', { ascending: true })
        .limit(limit);

      if (error) {
        console.error('Weekly leaderboard error:', error);
        return NextResponse.json(
          { error: 'Failed to fetch leaderboard' },
          { status: 500 }
        );
      }

      let currentUserRank = null;
      if (user) {
        const { data: weeklyEntry } = await db
          .from('leaderboard_weekly')
          .select('rank')
          .eq('id', user.id)
          .single();
        currentUserRank = weeklyEntry?.rank ?? null;
      }

      const leaderboard = data?.map((entry) => ({
        ...entry,
        streak_days: null,
      }));

      return NextResponse.json({
        leaderboard: leaderboard || [],
        currentUserRank,
        period,
      });
    }

    let query = db
      .from('user_profiles')
      .select('id, display_name, avatar_url, total_xp, level, streak_days, last_activity_at')
      .order('total_xp', { ascending: false })
      .limit(limit);

    if (dateFilterIso) {
      query = query.gte('last_activity_at', dateFilterIso);
    }

    const { data: topUsers, error } = await query;

    if (error) {
      console.error('Leaderboard error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch leaderboard' },
        { status: 500 }
      );
    }

    let currentUserRank = null;
    if (user) {
      const { data: userProfile } = await db
        .from('user_profiles')
        .select('total_xp, last_activity_at')
        .eq('id', user.id)
        .single();

      if (userProfile) {
        let rankQuery = db
          .from('user_profiles')
          .select('*', { count: 'exact', head: true })
          .gt('total_xp', userProfile.total_xp);

        if (dateFilterIso) {
          rankQuery = rankQuery.gte('last_activity_at', dateFilterIso);
        }

        const { count } = await rankQuery;
        currentUserRank = (count || 0) + 1;
      }
    }

    const leaderboard = topUsers?.map((u, index) => ({
      id: u.id,
      display_name: u.display_name,
      avatar_url: u.avatar_url,
      total_xp: u.total_xp,
      level: u.level,
      streak_days: u.streak_days,
      rank: index + 1,
    }));

    return NextResponse.json({
      leaderboard: leaderboard || [],
      currentUserRank,
      period,
    });
  } catch (error) {
    console.error('Leaderboard API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
