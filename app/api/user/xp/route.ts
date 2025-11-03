/**
 * XP Award API
 * 
 * POST /api/user/xp - Award XP to user for actions
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/db/supabase-server';
import { z } from 'zod';
import { awardXP } from '@/lib/gamification/xp-server';
import { XP_VALUES } from '@/lib/gamification/xp';

const AwardXPSchema = z.object({
  action: z.enum([
    'ARTICLE_READ',
    'COURSE_ENROLL',
    'MODULE_COMPLETE',
    'COURSE_COMPLETE',
    'COURSE_CREATE',
    'PERFECT_QUIZ',
    'DAILY_LOGIN'
  ]),
  referenceId: z.string().uuid().optional()
});

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Parse and validate request
    const body = await req.json();
    const validationResult = AwardXPSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }
    
    const { action, referenceId } = validationResult.data;
    
    // Award XP
    const result = await awardXP(user.id, action, referenceId);
    
    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to award XP' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: {
        xpAwarded: XP_VALUES[action],
        newXP: result.newXP,
        newLevel: result.newLevel,
        leveledUp: result.leveledUp
      }
    });
    
  } catch (error) {
    console.error('[XP] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
