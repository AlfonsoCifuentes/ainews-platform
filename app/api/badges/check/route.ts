import { NextRequest, NextResponse } from 'next/server';
import { checkAndAwardBadges, type TriggerType } from '@/lib/gamification/badge-awards';
import { getSupabaseServerClient } from '@/lib/db/supabase';

export async function POST(req: NextRequest) {
  try {
    const { userId, triggerType, triggerData } = await req.json();

    if (!userId || !triggerType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify user is authenticated
    const supabase = getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.id !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check and award badges
    const awardedBadges = await checkAndAwardBadges(
      userId,
      triggerType as TriggerType,
      triggerData
    );

    return NextResponse.json({
      success: true,
      badges: awardedBadges,
      count: awardedBadges.length,
    });
  } catch (error) {
    console.error('Error in badge check API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
