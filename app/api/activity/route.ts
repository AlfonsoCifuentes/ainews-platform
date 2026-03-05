import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServerClient } from '@/lib/db/supabase';
import { getServerAuthUser } from '@/lib/auth/auth-config';

const GetSchema = z.object({
  type: z.enum(['own', 'following']).default('following'),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

/**
 * GET /api/activity
 * Gets activity feed (user's own or their following feed)
 */
export async function GET(req: NextRequest) {
  try {
    const params = GetSchema.parse(
      Object.fromEntries(req.nextUrl.searchParams)
    );

    const user = await getServerAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getSupabaseServerClient();

    if (params.type === 'own') {
      // Get user's own activities
      const { data, error, count } = await db
        .from('user_activities')
        .select('*, user_profiles!inner(display_name, avatar_url)', { count: 'exact' })
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(params.offset, params.offset + params.limit - 1);

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
        hasMore: (count || 0) > params.offset + params.limit,
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
      .range(params.offset, params.offset + params.limit - 1);

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
      hasMore: (count || 0) > params.offset + params.limit,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Activity feed API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
