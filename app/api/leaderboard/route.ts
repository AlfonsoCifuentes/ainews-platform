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
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const db = getSupabaseServerClient();
    const user = await getServerAuthUser();

    // Build date filter for period
    let dateFilter: Date | null = null;
    if (period === 'week') {
      dateFilter = new Date();
      dateFilter.setDate(dateFilter.getDate() - 7);
    } else if (period === 'month') {
      dateFilter = new Date();
      dateFilter.setMonth(dateFilter.getMonth() - 1);
    }

    // Get top users by total XP
    const { data: topUsers, error } = await db
      .from('user_profiles')
      .select('id, display_name, avatar_url, total_xp, level, streak_days')
      .order('total_xp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Leaderboard error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch leaderboard' },
        { status: 500 }
      );
    }

    // Get current user's rank if authenticated
    let currentUserRank = null;
    if (user) {
      const { data: userProfile } = await db
        .from('user_profiles')
        .select('total_xp')
        .eq('id', user.id)
        .single();

      if (userProfile) {
        const { count } = await db
          .from('user_profiles')
          .select('*', { count: 'exact', head: true })
          .gt('total_xp', userProfile.total_xp);

        currentUserRank = (count || 0) + 1;
      }
    }

    // Add rankings to users
    const rankedUsers = topUsers?.map((u, index) => ({
      ...u,
      rank: index + 1,
    }));

    return NextResponse.json({
      leaderboard: rankedUsers || [],
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
