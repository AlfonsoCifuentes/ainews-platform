import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/db/supabase';
import { getServerAuthUser } from '@/lib/auth/auth-config';

/**
 * GET /api/activity
 * Gets activity feed (user's own or their following feed)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'following'; // 'own' | 'following'
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const user = await getServerAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getSupabaseServerClient();

    if (type === 'own') {
      // Get user's own activities
      const { data, error, count } = await db
        .from('user_activities')
        .select('*, user_profiles!inner(display_name, avatar_url)', { count: 'exact' })
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Get own activities error:', error);
        return NextResponse.json(
          { error: 'Failed to get activities' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        activities: data || [],
        count: count || 0,
        hasMore: (count || 0) > offset + limit,
      });
    }

    // Get following feed (activities from users I follow + public activities)
    const { data: following } = await db
      .from('user_follows')
      .select('following_id')
      .eq('follower_id', user.id);

    const followingIds = following?.map((f) => f.following_id) || [];
    
    const { data, error, count } = await db
      .from('user_activities')
      .select('*, user_profiles!inner(display_name, avatar_url)', { count: 'exact' })
      .or(`user_id.in.(${followingIds.join(',')}),visibility.eq.public`)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Get following feed error:', error);
      return NextResponse.json(
        { error: 'Failed to get activity feed' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      activities: data || [],
      count: count || 0,
      hasMore: (count || 0) > offset + limit,
    });
  } catch (error) {
    console.error('Activity feed API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
