/**
 * User Progress API
 * 
 * GET /api/user/progress?course_id=xxx - Get progress for a course
 * POST /api/user/progress - Update progress for a module
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/db/supabase-server';
import { z } from 'zod';

const UpdateProgressSchema = z.object({
  course_id: z.string().uuid(),
  module_id: z.string().uuid(),
  completed: z.boolean(),
  score: z.number().min(0).max(100).optional(),
  time_spent: z.number().min(0).optional(), // seconds
  notes: z.string().max(1000).optional()
});

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { searchParams } = new URL(req.url);
    const course_id = searchParams.get('course_id');
    
    if (!course_id) {
      return NextResponse.json(
        { error: 'course_id is required' },
        { status: 400 }
      );
    }
    
    // Get progress for course
    const { data: progress, error: progressError } = await supabase
      .from('user_progress')
      .select(`
        *,
        module:course_modules(
          id,
          title_en,
          title_es,
          order_index,
          estimated_minutes
        )
      `)
      .eq('user_id', user.id)
      .eq('course_id', course_id)
      .order('created_at', { ascending: true });
    
    if (progressError) {
      console.error('[User Progress] Error fetching progress:', progressError);
      return NextResponse.json(
        { error: 'Failed to fetch progress' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ data: progress || [] });
    
  } catch (error) {
    console.error('[User Progress] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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
    
    // Parse and validate request body
    const body = await req.json();
    const validationResult = UpdateProgressSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }
    
    const { course_id, module_id, completed, score, time_spent, notes } = validationResult.data;
    
    // Check if module exists
    const { data: module, error: moduleError } = await supabase
      .from('course_modules')
      .select('id')
      .eq('id', module_id)
      .eq('course_id', course_id)
      .single();
    
    if (moduleError || !module) {
      return NextResponse.json(
        { error: 'Module not found' },
        { status: 404 }
      );
    }
    
    // Upsert progress
    const { data: progress, error: progressError } = await supabase
      .from('user_progress')
      .upsert({
        user_id: user.id,
        course_id,
        module_id,
        completed,
        score,
        time_spent,
        notes,
        completed_at: completed ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,course_id,module_id'
      })
      .select()
      .single();
    
    if (progressError) {
      console.error('[User Progress] Error updating progress:', progressError);
      return NextResponse.json(
        { error: 'Failed to update progress' },
        { status: 500 }
      );
    }
    
    // Award XP if module completed
    if (completed) {
      await supabase.rpc('award_xp', {
        p_user_id: user.id,
        p_xp_amount: 50,
        p_action_type: 'module_complete',
        p_reference_id: module_id
      });
      
      // Check for achievements
      await checkAndUnlockAchievements(supabase, user.id, course_id);
    }
    
    return NextResponse.json({ 
      success: true,
      data: progress 
    });
    
  } catch (error) {
    console.error('[User Progress] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to check and unlock achievements
async function checkAndUnlockAchievements(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  courseId: string
) {
  try {
    // Check if user completed first course
    const { data: completedCourses } = await supabase
      .from('user_courses')
      .select('id')
      .eq('user_id', userId)
      .eq('completed_at', null)
      .eq('progress_percentage', 100);
    
    if (completedCourses && completedCourses.length === 1) {
      // First course completion
      await supabase
        .from('user_achievements')
        .upsert({
          user_id: userId,
          achievement_id: 'first_completion'
        }, {
          onConflict: 'user_id,achievement_id',
          ignoreDuplicates: true
        });
    }
    
    // Check if user completed all modules in this course
    const { data: courseProgress } = await supabase
      .from('user_courses')
      .select('progress_percentage')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .eq('relationship_type', 'enrolled')
      .single();
    
    if (courseProgress && courseProgress.progress_percentage === 100) {
      // Course completed
      await supabase
        .from('user_achievements')
        .upsert({
          user_id: userId,
          achievement_id: 'course_master'
        }, {
          onConflict: 'user_id,achievement_id',
          ignoreDuplicates: true
        });
    }
  } catch (error) {
    console.error('[Achievements] Error checking achievements:', error);
    // Don't fail the request if achievements fail
  }
}
