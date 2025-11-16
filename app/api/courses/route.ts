import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    
    console.log('[Courses API] GET request received');
    
    // Create Supabase client with proper error handling
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl) {
      console.error('[Courses API] NEXT_PUBLIC_SUPABASE_URL is missing');
      return NextResponse.json(
        { success: false, error: 'Database configuration error' },
        { status: 500 }
      );
    }
    
    // If we have service role key, use it; otherwise use anon key
    const apiKey = serviceRoleKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!apiKey) {
      console.error('[Courses API] Neither SUPABASE_SERVICE_ROLE_KEY nor NEXT_PUBLIC_SUPABASE_ANON_KEY is available');
      return NextResponse.json(
        { success: false, error: 'Authentication configuration error' },
        { status: 500 }
      );
    }
    
    const db = createClient(supabaseUrl, apiKey, {
      auth: { persistSession: false }
    });
    
    // Parse query parameters
    const category = searchParams.get('category');
    const difficulty = searchParams.get('difficulty');
    const search = searchParams.get('search');
    const locale = searchParams.get('locale') || 'en';
    const sort = searchParams.get('sort') || 'newest'; // newest, popular, rating
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    console.log('[Courses API] Query params:', { category, difficulty, search, locale, sort, limit, offset });
    
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
        { success: false, error: 'Failed to fetch courses', details: error },
        { status: 500 }
      );
    }
    
    console.log('[Courses API] Fetched courses:', { count: courses?.length || 0 });
    
    // Get total count for pagination
    const { count: totalCount, error: countError } = await db
      .from('courses')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'published');
    
    if (countError) {
      console.error('[Courses API] Error counting courses:', countError);
    }
    
    console.log('[Courses API] Total courses:', totalCount);
    
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
