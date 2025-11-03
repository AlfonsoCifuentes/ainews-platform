import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/db/supabase';

/**
 * GET /api/news/:id
 * Gets a single article by ID
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const db = getSupabaseServerClient();

    const { data, error } = await db
      .from('news_articles')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Get article error:', error);
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ article: data });
  } catch (error) {
    console.error('Get article API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
