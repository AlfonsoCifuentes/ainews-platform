import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServerClient } from '@/lib/db/supabase';

const QuerySchema = z.object({
  articleId: z.string().uuid(),
  locale: z.enum(['en', 'es']),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(10)).default('3'),
});

export async function GET(req: NextRequest) {
  try {
    const params = Object.fromEntries(req.nextUrl.searchParams);
    const { articleId, limit } = QuerySchema.parse(params);

    const supabase = getSupabaseServerClient();

    // Get the current article to find similar ones
    const fetchCurrent = async (opts: { filterHidden: boolean }) => {
      let query = supabase
        .from('news_articles')
        .select('category, tags, title_en, title_es')
        .eq('id', articleId);

      if (opts.filterHidden) {
        query = query.eq('is_hidden', false);
      }

      return await query.single();
    };

    let { data: currentArticle, error: currentError } = await fetchCurrent({ filterHidden: true });
    if (currentError && (currentError as { code?: string }).code === '42703') {
      ({ data: currentArticle, error: currentError } = await fetchCurrent({ filterHidden: false }));
    }

    if (!currentArticle) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      );
    }

    // Find related articles by:
    // 1. Same category
    // 2. Overlapping tags
    // 3. Exclude current article
    const fetchRelated = async (opts: { filterHidden: boolean }) => {
      let query = supabase
        .from('news_articles')
        .select('id, title_en, title_es, summary_en, summary_es, image_url, published_at, category')
        .neq('id', articleId)
        .eq('category', currentArticle.category)
        .order('published_at', { ascending: false })
        .limit(limit);

      if (opts.filterHidden) {
        query = query.eq('is_hidden', false);
      }

      return await query;
    };

    let { data: relatedArticles, error: relatedError } = await fetchRelated({ filterHidden: true });
    if (relatedError && (relatedError as { code?: string }).code === '42703') {
      ({ data: relatedArticles, error: relatedError } = await fetchRelated({ filterHidden: false }));
    }

    return NextResponse.json({
      data: relatedArticles || [],
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error fetching related articles:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
