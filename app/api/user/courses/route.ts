/**
 * User Courses API
 * 
 * GET /api/user/courses - Get user's enrolled and created courses
 * POST /api/user/courses - Enroll in a course
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/db/supabase-server';
import { z } from 'zod';

const EnrollSchema = z.object({
  course_id: z.string().uuid()
});

const QuerySchema = z.object({
  type: z.enum(['enrolled', 'created', 'all']).optional().default('all'),
  include_progress: z.boolean().optional().default(true)
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
    
    // Parse query params
    const { searchParams } = new URL(req.url);
    const query = QuerySchema.parse({
      type: searchParams.get('type') || 'all',
      include_progress: searchParams.get('include_progress') !== 'false'
    });
    
    // Build query
    let dbQuery = supabase
      .from('user_courses')
      .select(`
        *,
        course:courses(
          id,
          title_en,
          title_es,
          description_en,
          description_es,
          category,
          difficulty,
          estimated_hours,
          created_at,
          thumbnail_url
        )
      `)
      .eq('user_id', user.id);
    
    // Filter by type
    if (query.type !== 'all') {
      dbQuery = dbQuery.eq('relationship_type', query.type);
    }
    
    const { data: userCourses, error: coursesError } = await dbQuery
      .order('last_accessed_at', { ascending: false });
    
    if (coursesError) {
      console.error('[User Courses] Error fetching courses:', coursesError);
      return NextResponse.json(
        { error: 'Failed to fetch courses' },
        { status: 500 }
      );
    }
    
    // Optionally include progress details
    if (query.include_progress && userCourses) {
      const coursesWithProgress = await Promise.all(
        userCourses.map(async (uc) => {
          if (!uc.course_id) return uc;
          
          const { data: modules } = await supabase
            .from('user_progress')
            .select('*')
            .eq('user_id', user.id)
            .eq('course_id', uc.course_id);
          
          return {
            ...uc,
            modules_progress: modules || []
          };
        })
      );
      
      return NextResponse.json({ data: coursesWithProgress });
    }
    
    return NextResponse.json({ data: userCourses });
    
  } catch (error) {
    console.error('[User Courses] Unexpected error:', error);
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
    const validationResult = EnrollSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }
    
    const { course_id } = validationResult.data;
    
    // Check if course exists
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id')
      .eq('id', course_id)
      .single();
    
    if (courseError || !course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }
    
    // Check if already enrolled
    const { data: existing } = await supabase
      .from('user_courses')
      .select('id')
      .eq('user_id', user.id)
      .eq('course_id', course_id)
      .eq('relationship_type', 'enrolled')
      .single();
    
    if (existing) {
      return NextResponse.json(
        { error: 'Already enrolled in this course' },
        { status: 409 }
      );
    }
    
    // Enroll user
    const { data: enrollment, error: enrollError } = await supabase
      .from('user_courses')
      .insert({
        user_id: user.id,
        course_id,
        relationship_type: 'enrolled'
      })
      .select()
      .single();
    
    if (enrollError) {
      console.error('[User Courses] Error enrolling:', enrollError);
      return NextResponse.json(
        { error: 'Failed to enroll in course' },
        { status: 500 }
      );
    }
    
    // Award XP for enrolling
    await supabase.rpc('award_xp', {
      p_user_id: user.id,
      p_xp_amount: 10,
      p_action_type: 'course_enroll',
      p_reference_id: course_id
    });
    
    return NextResponse.json({ 
      success: true,
      data: enrollment 
    });
    
  } catch (error) {
    console.error('[User Courses] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
