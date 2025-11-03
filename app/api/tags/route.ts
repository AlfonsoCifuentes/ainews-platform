import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/db/supabase';

/**
 * GET /api/tags
 * Gets all available tags with optional category filter
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');

    const db = getSupabaseServerClient();

    let query = db.from('tags').select('*').order('name', { ascending: true });

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Get tags error:', error);
      return NextResponse.json(
        { error: 'Failed to get tags' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      tags: data || [],
    });
  } catch (error) {
    console.error('Get tags API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
