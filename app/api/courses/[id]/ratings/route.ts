import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/db/supabase';
import { z } from 'zod';

interface CourseRating {
  id: string;
  course_id: string;
  user_id: string;
  rating: number;
  review_en?: string;
  review_es?: string;
  created_at: string;
  updated_at: string;
}

const RatingSchema = z.object({
  userId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  review_en: z.string().optional(),
  review_es: z.string().optional(),
});

// GET /api/courses/[id]/ratings - Get all ratings for a course
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabaseServerClient();

    const { data: ratings, error } = await supabase
      .from('course_ratings')
      .select('*')
      .eq('course_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching ratings:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch ratings' },
        { status: 500 }
      );
    }

    const typedRatings = ratings as CourseRating[];

    // Get average and count
    const avgRating = typedRatings.length > 0
      ? typedRatings.reduce((sum: number, r: CourseRating) => sum + r.rating, 0) / typedRatings.length
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        ratings: typedRatings,
        stats: {
          average: Math.round(avgRating * 10) / 10,
          count: typedRatings.length,
          distribution: {
            5: typedRatings.filter((r: CourseRating) => r.rating === 5).length,
            4: typedRatings.filter((r: CourseRating) => r.rating === 4).length,
            3: typedRatings.filter((r: CourseRating) => r.rating === 3).length,
            2: typedRatings.filter((r: CourseRating) => r.rating === 2).length,
            1: typedRatings.filter((r: CourseRating) => r.rating === 1).length,
          }
        }
      }
    });

  } catch (error) {
    console.error('Error in GET /api/courses/[id]/ratings:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/courses/[id]/ratings - Add or update a rating
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const validation = RatingSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { userId, rating, review_en, review_es } = validation.data;
    const supabase = getSupabaseServerClient();

    // Upsert (insert or update) rating
    const { data, error } = await supabase
      .from('course_ratings')
      .upsert({
        course_id: id,
        user_id: userId,
        rating,
        review_en,
        review_es,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'course_id,user_id'
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving rating:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to save rating' },
        { status: 500 }
      );
    }

    // Get updated course stats
    const { data: course } = await supabase
      .from('courses')
      .select('rating_avg')
      .eq('id', id)
      .single();

    return NextResponse.json({
      success: true,
      data: {
        rating: data,
        courseRatingAvg: course?.rating_avg || 0
      }
    });

  } catch (error) {
    console.error('Error in POST /api/courses/[id]/ratings:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/courses/[id]/ratings - Delete a rating
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();

    const { error } = await supabase
      .from('course_ratings')
      .delete()
      .eq('course_id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting rating:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to delete rating' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Rating deleted successfully'
    });

  } catch (error) {
    console.error('Error in DELETE /api/courses/[id]/ratings:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
