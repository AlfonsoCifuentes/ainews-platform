import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerAuthUser } from '@/lib/auth/auth-config';
import { getSupabaseServerClient } from '@/lib/db/supabase';

const ProgressSchema = z.object({
  courseId: z.string().uuid(),
  moduleId: z.string().uuid(),
  completed: z.boolean(),
  score: z.number().min(0).max(100).optional(),
  timeSpent: z.number().min(0).optional(),
  notes: z.string().optional(),
});

/**
 * POST /api/courses/progress
 * Updates module progress for authenticated user
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getServerAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { courseId, moduleId, completed, score, timeSpent, notes } =
      ProgressSchema.parse(body);

    const db = getSupabaseServerClient();

    // Check if progress record exists
    const { data: existing } = await db
      .from('user_progress')
      .select('*')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .eq('module_id', moduleId)
      .single();

    let data;
    let error;

    if (existing) {
      // Update existing progress
      ({ data, error } = await db
        .from('user_progress')
        .update({
          completed,
          score: score !== undefined ? score : existing.score,
          time_spent: timeSpent !== undefined ? timeSpent : existing.time_spent,
          notes: notes !== undefined ? notes : existing.notes,
          completed_at: completed ? new Date().toISOString() : existing.completed_at,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single());
    } else {
      // Create new progress record
      ({ data, error } = await db
        .from('user_progress')
        .insert({
          user_id: user.id,
          course_id: courseId,
          module_id: moduleId,
          completed,
          score: score || null,
          time_spent: timeSpent || 0,
          notes: notes || null,
          completed_at: completed ? new Date().toISOString() : null,
        })
        .select()
        .single());
    }

    if (error) {
      console.error('Progress update error:', error);
      return NextResponse.json(
        { error: 'Failed to update progress' },
        { status: 500 }
      );
    }

    // The database trigger will automatically:
    // - Update course progress percentage
    // - Award XP for module completion
    // - Check for achievements

    return NextResponse.json({
      success: true,
      progress: data,
      message: 'Progress updated successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Progress API error:', error);
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
    const user = await getServerAuthUser();
    if (!user) {
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

    const db = getSupabaseServerClient();

    const { data, error } = await db
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
