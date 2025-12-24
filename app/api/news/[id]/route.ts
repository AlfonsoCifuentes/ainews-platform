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

    const runQuery = async (opts: { filterHidden: boolean }) => {
      let query = db
        .from('news_articles')
        .select('*')
        .eq('id', id);

      if (opts.filterHidden) {
        query = query.eq('is_hidden', false);
      }

      return await query.single();
    };

    let { data, error } = await runQuery({ filterHidden: true });
    if (error && (error as { code?: string }).code === '42703') {
      ({ data, error } = await runQuery({ filterHidden: false }));
    }

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
