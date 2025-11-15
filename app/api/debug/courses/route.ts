import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/db/supabase';

interface CourseStatus {
  status: string;
}

export async function GET(_req: NextRequest) {
  try {
    const db = getSupabaseServerClient();
    
    console.log('[Debug Courses] Checking database...');

    // Check total courses
    const { count: totalCourses, error: totalError } = await db
      .from('courses')
      .select('*', { count: 'exact', head: true });

    if (totalError) {
      console.error('[Debug Courses] Error counting total:', totalError);
    }

    // Check published courses
    const { count: publishedCourses, error: pubError } = await db
      .from('courses')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'published');

    if (pubError) {
      console.error('[Debug Courses] Error counting published:', pubError);
    }

    // Get first 3 courses
    const { data: sampleCourses, error: sampleError } = await db
      .from('courses')
      .select('id, title_en, title_es, status, created_at')
      .limit(3);

    if (sampleError) {
      console.error('[Debug Courses] Error fetching sample:', sampleError);
    }

    // Get status distribution
    const { data: allCourses, error: allError } = await db
      .from('courses')
      .select('status')
      .limit(100);

    const statusDist: Record<string, number> = {};
    if (!allError && allCourses) {
      (allCourses as CourseStatus[]).forEach((course) => {
        statusDist[course.status] = (statusDist[course.status] || 0) + 1;
      });
    }

    return NextResponse.json({
      success: true,
      summary: {
        totalCourses: totalCourses || 0,
        publishedCourses: publishedCourses || 0
      },
      statusDistribution: statusDist,
      sampleCourses: sampleCourses || [],
      errors: {
        totalError: totalError?.message,
        pubError: pubError?.message,
        sampleError: sampleError?.message,
        allError: allError?.message
      }
    });

  } catch (error) {
    console.error('[Debug Courses] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
