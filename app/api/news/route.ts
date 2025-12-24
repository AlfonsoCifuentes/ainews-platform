import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { defaultLocale, locales } from '@/i18n';
import { getSupabaseServerClient } from '@/lib/db/supabase';
import { newsArticleArraySchema } from '@/lib/types/news';

const QuerySchema = z.object({
  locale: z.enum(locales).default(defaultLocale),
  limit: z.coerce.number().min(1).max(50).default(20),
  offset: z.coerce.number().min(0).default(0),
  category: z.string().min(1).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const parsed = QuerySchema.parse({
      locale: searchParams.get('locale') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
      offset: searchParams.get('offset') ?? undefined,
      category: searchParams.get('category') ?? undefined,
    });

    const { limit, offset, category } = parsed;

    const supabase = getSupabaseServerClient();

    const runQuery = async (opts: { filterHidden: boolean }) => {
      let query = supabase
        .from('news_articles')
        .select(
          `id,
        title_en,
        title_es,
        summary_en,
        summary_es,
        content_en,
        content_es,
        category,
        tags,
        source_url,
        image_url,
        published_at,
        ai_generated,
        quality_score,
        reading_time_minutes`
        )
        .order('published_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (opts.filterHidden) {
        query = query.eq('is_hidden', false);
      }

      if (category) {
        query = query.eq('category', category);
      }

      return await query;
    };

    let { data, error } = await runQuery({ filterHidden: true });
    if (error && (error as { code?: string; message?: string }).code === '42703') {
      // Backward compatibility: column doesn't exist yet.
      ({ data, error } = await runQuery({ filterHidden: false }));
    }

    if (error) {
      console.error('[API /api/news] Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch articles', details: error.message },
        { status: 500 }
      );
    }

    const articles = newsArticleArraySchema.parse(data || []);

    return NextResponse.json({
      data: articles,
      hasMore: articles.length === limit,
      nextOffset: offset + articles.length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.flatten() },
        { status: 400 },
      );
    }

    console.error('[API /api/news] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
