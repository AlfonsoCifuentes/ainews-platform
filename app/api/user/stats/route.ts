/**
 * User Stats API
 * 
 * GET /api/user/stats - Get user statistics and gamification data
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/db/supabase-server';

export async function GET(_req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get profile with XP and level
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (profileError) {
      return NextResponse.json(
        { error: 'Failed to fetch profile' },
        { status: 500 }
      );
    }
    
    // Get course enrollments
    const { data: enrollments } = await supabase
      .from('user_courses')
      .select('relationship_type, completed_at')
      .eq('user_id', user.id);
    
    const enrolledCount = enrollments?.filter(e => e.relationship_type === 'enrolled').length || 0;
    const createdCount = enrollments?.filter(e => e.relationship_type === 'created').length || 0;
    const completedCount = enrollments?.filter(e => e.completed_at !== null).length || 0;
    
    // Get badges
    const { data: badges } = await supabase
      .from('user_badges')
      .select('*')
      .eq('user_id', user.id)
      .order('earned_at', { ascending: false });
    
    // Get recent XP activity
    const { data: recentXP } = await supabase
      .from('user_xp_log')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);
    
    return NextResponse.json({
      data: {
        profile,
        stats: {
          enrolledCount,
          createdCount,
          completedCount
        },
        badges: badges || [],
        recentXP: recentXP || []
      }
    });
    
  } catch (error) {
    console.error('[Stats] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
