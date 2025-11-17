import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/db/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const db = getSupabaseServerClient();
    const { searchParams } = req.nextUrl;
    
    // Parse query parameters
    const category = searchParams.get('category');
    const difficulty = searchParams.get('difficulty');
    const search = searchParams.get('search');
    const locale = searchParams.get('locale') || 'en';
    const sort = searchParams.get('sort') || 'newest'; // newest, popular, rating
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    // Build query
    let query = db
      .from('courses')
      .select(`
        id,
        title_en,
        title_es,
        description_en,
        description_es,
        category,
        difficulty,
        duration_minutes,
        topics,
        enrollment_count,
        rating_avg,
        completion_rate,
        view_count,
        status,
        created_at,
        published_at
      `)
      .eq('status', 'published');
    
    // Apply filters
    if (category && category !== 'all') {
      query = query.eq('category', category);
    }
    
    if (difficulty && difficulty !== 'all') {
      query = query.eq('difficulty', difficulty);
    }
    
    // Apply search
    if (search && search.trim()) {
      const searchColumn = locale === 'es' ? 'title_es' : 'title_en';
      query = query.ilike(searchColumn, `%${search.trim()}%`);
    }
    
    // Apply sorting
    switch (sort) {
      case 'popular':
        query = query.order('view_count', { ascending: false });
        break;
      case 'rating':
        query = query.order('rating_avg', { ascending: false });
        break;
      case 'oldest':
        query = query.order('created_at', { ascending: true });
        break;
      case 'newest':
      default:
        query = query.order('created_at', { ascending: false });
        break;
    }
    
    // Apply pagination
    query = query.range(offset, offset + limit - 1);
    
    const { data: courses, error } = await query;
    
    if (error) {
      console.error('[Courses API] Error fetching courses:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch courses' },
        { status: 500 }
      );
    }
    
    // Get total count for pagination
    const { count: totalCount } = await db
      .from('courses')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'published');
    
    return NextResponse.json({
      success: true,
      data: courses || [],
      pagination: {
        total: totalCount || 0,
        limit,
        offset,
        hasMore: (offset + limit) < (totalCount || 0)
      }
    });
    
  } catch (error) {
    console.error('[Courses API] Unexpected error:', error);
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

