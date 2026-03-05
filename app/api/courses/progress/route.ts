import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createApiClient } from '@/lib/db/supabase-api';
import { createClient as createServerClient } from '@/lib/db/supabase-server';

const ProgressSchema = z.object({
  courseId: z.string().uuid(),
  moduleId: z.string().uuid(),
  completed: z.boolean(),
  score: z.number().min(0).max(100).optional(),
  timeSpent: z.number().min(0).optional(),
});

/**
 * POST /api/courses/progress
 * Updates module progress for authenticated user
 */
export async function POST(req: NextRequest) {
  try {
    // Create API client from request cookies
    const supabase = createApiClient(req);
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await req.json();

    // Validate with Zod
    const { courseId, moduleId, completed, score, timeSpent } =
      ProgressSchema.parse(body);

    // Use the same client that has the auth context
    const db = supabase;

    // Check if module exists
    const { data: moduleCheck, error: moduleCheckError } = await db
      .from('course_modules')
      .select('id, course_id')
      .eq('id', moduleId)
      .single();
    
    if (moduleCheckError || !moduleCheck) {
      return NextResponse.json({ error: 'Module not found' }, { status: 404 });
    }

    // Check existing progress
    const { data: existing } = await db
      .from('user_progress')
      .select('*')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .eq('module_id', moduleId)
      .maybeSingle();

    let data;
    let error;

    // Insert or Update progress
    if (existing) {
      const updatePayload = {
        completed,
        score: score !== undefined ? score : existing.score,
        time_spent: timeSpent !== undefined ? timeSpent : existing.time_spent,
        completed_at: completed ? new Date().toISOString() : existing.completed_at,
      };
      
      ({ data, error } = await db
        .from('user_progress')
        .update(updatePayload)
        .eq('id', existing.id)
        .select()
        .single());
    } else {
      const insertPayload = {
        user_id: user.id,
        course_id: courseId,
        module_id: moduleId,
        completed,
        score: score || null,
        time_spent: timeSpent || 0,
        completed_at: completed ? new Date().toISOString() : null,
      };
      
      ({ data, error } = await db
        .from('user_progress')
        .insert(insertPayload)
        .select()
        .single());
    }

    if (error) {
      console.error('[PROGRESS API] Database error:', { code: error.code, hint: error.hint });

      return NextResponse.json(
        { error: 'Failed to update progress' },
        { status: 500 }
      );
    }

    // Award XP if this was a transition from uncompleted->completed.
    let awardedXP = 0;
    let updatedProfile: { total_xp?: number; level?: number } | null = null;
    try {
      const serverSupabase = await createServerClient();
      const shouldAward = completed && (!existing || !existing.completed);
      if (shouldAward) {
        const xpAmount = 100;
        const { error: awardError } = await serverSupabase.rpc('award_xp', {
          p_user_id: user.id,
          p_xp_amount: xpAmount,
          p_action_type: 'module_completion',
          p_reference_id: data?.id || null
        });
        if (!awardError) {
          awardedXP = xpAmount;
          const { data: profileData } = await serverSupabase
            .from('user_profiles')
            .select('total_xp, level')
            .eq('id', user.id)
            .single();
          updatedProfile = profileData || null;
        } else {
          console.warn('[PROGRESS API] award_xp RPC error:', awardError.message);
        }
      }
    } catch {
      console.warn('[PROGRESS API] Failed to award XP');
    }

    return NextResponse.json({
      success: true,
      progress: data,
      message: 'Progress updated successfully',
      awardedXP,
      profile: updatedProfile,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      );
    }

    console.error('[PROGRESS API] Unexpected error:', error instanceof Error ? error.message : 'Unknown');
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/courses/progress?courseId=xxx
 * Gets all progress for a course
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = createApiClient(req);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('courseId');

    if (!courseId) {
      return NextResponse.json(
        { error: 'courseId is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Get progress error:', error);
      return NextResponse.json(
        { error: 'Failed to get progress' },
        { status: 500 }
      );
    }

    return NextResponse.json({ progress: data });
  } catch (error) {
    console.error('Get progress API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
