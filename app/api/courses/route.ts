import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/db/supabase';

// Logger utility (inline for API routes)
const logger = {
  info: (label: string, data: unknown): void => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [COURSES-API] ${label}`, JSON.stringify(data, null, 2));
  },
  error: (label: string, error: unknown): void => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] [COURSES-API] ERROR: ${label}`, error);
  },
  debug: (label: string, data: unknown): void => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [COURSES-API-DEBUG] ${label}`, JSON.stringify(data, null, 2));
  }
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    logger.info('GET request received', { url: req.url });
    
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
    
    logger.info('Query parameters parsed', {
      category,
      difficulty,
      search,
      locale,
      sort,
      limit,
      offset
    });
    
    // Build query
    logger.info('Building database query', { baseStatus: 'published' });
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
    logger.info('Applying filters', {
      hasCategoryFilter: !!category && category !== 'all',
      hasDifficultyFilter: !!difficulty && difficulty !== 'all',
      hasSearchFilter: !!search && search.trim()
    });
    
    if (category && category !== 'all') {
      query = query.eq('category', category);
      logger.debug('Category filter applied', { category });
    }
    
    if (difficulty && difficulty !== 'all') {
      query = query.eq('difficulty', difficulty);
      logger.debug('Difficulty filter applied', { difficulty });
    }
    
    // Apply search
    if (search && search.trim()) {
      const searchColumn = locale === 'es' ? 'title_es' : 'title_en';
      query = query.ilike(searchColumn, `%${search.trim()}%`);
      logger.debug('Search filter applied', { searchColumn, searchTerm: search });
    }
    
    // Apply sorting
    switch (sort) {
      case 'popular':
        query = query.order('view_count', { ascending: false });
        logger.debug('Sorting applied', { sort: 'popular by view_count' });
        break;
      case 'rating':
        query = query.order('rating_avg', { ascending: false });
        logger.debug('Sorting applied', { sort: 'rating' });
        break;
      case 'oldest':
        query = query.order('created_at', { ascending: true });
        logger.debug('Sorting applied', { sort: 'oldest' });
        break;
      case 'newest':
      default:
        query = query.order('created_at', { ascending: false });
        logger.debug('Sorting applied', { sort: 'newest' });
        break;
    }
    
    // Apply pagination
    query = query.range(offset, offset + limit - 1);
    logger.info('Pagination applied', { offset, limit, range: `${offset}-${offset + limit - 1}` });
    
    logger.info('Executing query to Supabase', { timestamp: new Date().toISOString() });
    const { data: courses, error } = await query;
    
    logger.info('Query executed', {
      coursesCount: courses?.length || 0,
      hasError: !!error,
      timestamp: new Date().toISOString()
    });
    
    if (error) {
      const typedError = error as { code?: string; message?: string; details?: string };
      logger.error('Database error', {
        code: typedError.code,
        message: typedError.message,
        details: typedError.details
      });
      return NextResponse.json(
        { success: false, error: 'Failed to fetch courses' },
        { status: 500 }
      );
    }
    
    // Get total count for pagination
    logger.info('Fetching total count', { timestamp: new Date().toISOString() });
    const { count: totalCount } = await db
      .from('courses')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'published');
    
    logger.info('Total count retrieved', {
      totalCount,
      currentBatchCount: courses?.length || 0,
      hasMore: (offset + limit) < (totalCount || 0)
    });
    
    const responseData = {
      success: true,
      data: courses || [],
      pagination: {
        total: totalCount || 0,
        limit,
        offset,
        hasMore: (offset + limit) < (totalCount || 0)
      }
    };
    
    logger.info('Returning response', {
      success: true,
      coursesCount: responseData.data.length,
      totalCount: responseData.pagination.total
    });
    
    return NextResponse.json(responseData);
    
  } catch (error) {
    logger.error('Unexpected exception', {
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
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

