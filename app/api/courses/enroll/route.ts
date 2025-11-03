import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerAuthUser } from '@/lib/auth/auth-config';
import { getSupabaseServerClient } from '@/lib/db/supabase';

const EnrollSchema = z.object({
  courseId: z.string().uuid(),
});

/**
 * POST /api/courses/enroll
 * Enrolls authenticated user in a course
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getServerAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { courseId } = EnrollSchema.parse(body);

    const db = getSupabaseServerClient();

    // Check if already enrolled
    const { data: existing } = await db
      .from('user_courses')
      .select('id')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .eq('relationship_type', 'enrolled')
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Already enrolled in this course' },
        { status: 400 }
      );
    }

    // Create enrollment
    const { data, error } = await db
      .from('user_courses')
      .insert({
        user_id: user.id,
        course_id: courseId,
        relationship_type: 'enrolled',
        enrolled_at: new Date().toISOString(),
        progress_percentage: 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Enrollment error:', error);
      return NextResponse.json(
        { error: 'Failed to enroll in course' },
        { status: 500 }
      );
    }

    // Award XP for enrollment (will be handled by client-side tracker)
    return NextResponse.json({
      success: true,
      enrollment: data,
      message: 'Successfully enrolled in course',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Enroll API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/courses/enroll
 * Unenrolls user from a course
 */
export async function DELETE(req: NextRequest) {
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

    const { error } = await db
      .from('user_courses')
      .delete()
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .eq('relationship_type', 'enrolled');

    if (error) {
      console.error('Unenroll error:', error);
      return NextResponse.json(
        { error: 'Failed to unenroll from course' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully unenrolled from course',
    });
  } catch (error) {
    console.error('Unenroll API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
