import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { defaultLocale, locales } from '@/i18n';
import { getSupabaseServerClient } from '@/lib/db/supabase';
import { newsArticleSchema, newsArticleArraySchema } from '@/lib/types/news';

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
      // PostgREST 416 (range not satisfiable) — offset is beyond total rows → empty page, not error
      const errCode = (error as { code?: string }).code;
      if (errCode === 'PGRST103' || errCode === '416') {
        return NextResponse.json({ data: [], hasMore: false, nextOffset: offset });
      }
      console.error('[API /api/news] Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch articles' },
        { status: 500 }
      );
    }

    // Use safeParse so individual bad rows are skipped instead of killing the whole response
    const rows = data ?? [];
    const parseResult = newsArticleArraySchema.safeParse(rows);
    let articles: z.infer<typeof newsArticleSchema>[];
    if (parseResult.success) {
      articles = parseResult.data;
    } else {
      console.warn(
        `[API /api/news] Array schema failed at offset=${offset}, falling back to per-row parse:`,
        parseResult.error.issues.slice(0, 3),
      );
      articles = rows.reduce<z.infer<typeof newsArticleSchema>[]>((acc, row) => {
        const r = newsArticleSchema.safeParse(row);
        if (r.success) {
          acc.push(r.data);
        } else {
          console.warn('[API /api/news] Skipped invalid row:', (row as { id?: string })?.id, r.error.issues[0]);
        }
        return acc;
      }, []);
    }

    return NextResponse.json({
      data: articles,
      hasMore: rows.length === limit,
      nextOffset: offset + rows.length,
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
