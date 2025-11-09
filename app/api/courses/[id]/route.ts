import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/db/supabase';
import { normalizeCourseRecord } from '@/lib/courses/normalize';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const db = getSupabaseServerClient();
    const { id } = await context.params;
    const { searchParams } = req.nextUrl;
    const userId = searchParams.get('userId'); // Optional for progress tracking
    
    // Fetch course with modules
    const { data: rawCourse, error: courseError } = await db
      .from('courses')
      .select(`
        *,
        course_modules (*)
      `)
      .eq('id', id)
      .single();
    
    if (courseError || !rawCourse) {
      return NextResponse.json(
        { success: false, error: 'Course not found' },
        { status: 404 }
      );
    }

    const course = normalizeCourseRecord(rawCourse);
    
    // Fetch user progress if userId provided
    let userProgress = null;
    if (userId) {
      const { data: progress } = await db
        .from('course_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('course_id', id);
      
      userProgress = progress || [];
    }
    
    // Increment view count
    await db
      .from('courses')
      .update({ view_count: course.view_count + 1 })
      .eq('id', id);
    
    return NextResponse.json({
      success: true,
      data: {
        ...course,
        view_count: course.view_count + 1,
        user_progress: userProgress
      }
    });
    
  } catch (error) {
    console.error('[Course Detail API] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Update course status (admin only in future)
export async function PATCH(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const db = getSupabaseServerClient();
    const { id } = await context.params;
    const body = await req.json();
    
    const { status, rating_avg, completion_rate } = body;
    
    const updates: Record<string, unknown> = {};
    if (status) updates.status = status;
    if (rating_avg !== undefined) updates.rating_avg = rating_avg;
    if (completion_rate !== undefined) updates.completion_rate = completion_rate;
    
    const { data, error } = await db
      .from('courses')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      return NextResponse.json(
        { success: false, error: 'Failed to update course' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true, data });
    
  } catch (error) {
    console.error('[Course Update API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
