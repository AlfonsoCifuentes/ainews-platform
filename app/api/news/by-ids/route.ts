import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServerClient } from '@/lib/db/supabase';

const ByIdsSchema = z.object({
  ids: z.array(z.string()).min(1).max(100),
  locale: z.enum(['en', 'es']).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const params = ByIdsSchema.parse(body);
    
    const supabase = getSupabaseServerClient();

    const runQuery = async (opts: { filterHidden: boolean }) => {
      let query = supabase
        .from('news_articles')
        .select('*')
        .in('id', params.ids)
        .order('published_at', { ascending: false });

      if (opts.filterHidden) {
        query = query.eq('is_hidden', false);
      }

      return await query;
    };

    let { data, error } = await runQuery({ filterHidden: true });
    if (error && (error as { code?: string }).code === '42703') {
      ({ data, error } = await runQuery({ filterHidden: false }));
    }

    if (error) {
      console.error('Error fetching articles by IDs:', error);
      return NextResponse.json(
        { error: 'Failed to fetch articles' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      data: data || [],
      count: data?.length || 0 
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error in by-ids endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
