import { NextRequest, NextResponse } from 'next/server';
import { checkAndAwardBadges, type TriggerType } from '@/lib/gamification/badge-awards';
import { createApiClient } from '@/lib/db/supabase-api';

export async function POST(req: NextRequest) {
  try {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const { userId, triggerType, triggerData } = await req.json();

    if (!triggerType) {
      return NextResponse.json(
        { error: 'Missing triggerType' },
        { status: 400 }
      );
    }

    const supabase = createApiClient(req);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    // Server-side debug logging
    console.log(`[BADGES API] [${requestId}] Incoming badge check: trigger=${triggerType} userId=${userId || 'N/A'}`);
    const cookieHeaderForDebug = req.headers.get('cookie') || '';
    console.log(`[BADGES API] [${requestId}] Cookie header present: ${cookieHeaderForDebug.length > 0}, contains sb-: ${cookieHeaderForDebug.includes('sb-')}, keys: ${cookieHeaderForDebug.split(';').map(s => s.split('=')[0].trim()).filter(Boolean).join(',')}`);

    // Collect request header summary for debug purposes
    const cookieHeader = req.headers.get('cookie') || '';
    const cookieKeys = cookieHeader.split(';').map(s => s.split('=')[0]?.trim()).filter(Boolean);
    const headerSummary = {
      userAgent: req.headers.get('user-agent') || 'unknown',
      hasCookieHeader: !!cookieHeader,
      hasSbCookies: cookieHeader.includes('sb-') || cookieHeader.includes('supabase'),
      cookieKeys,
      trace: requestId,
    };

    if (authError || !user) {
      console.warn(`[BADGES API] [${requestId}] Unauthorized request - no user session found`);
      return NextResponse.json(
        { error: 'Unauthorized', details: authError?.message, debug: { requestId, headers: headerSummary } },
        { status: 401, headers: { 'X-AINEWS-DEBUG-ID': requestId } }
      );
    }

    if (userId && userId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Check and award badges
    const awardedBadges = await checkAndAwardBadges(
      user.id,
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
