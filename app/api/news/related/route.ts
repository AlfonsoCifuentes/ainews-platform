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
    const { data: currentArticle } = await supabase
      .from('news_articles')
      .select('category, tags, title_en, title_es')
      .eq('id', articleId)
      .single();

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
    const { data: relatedArticles } = await supabase
      .from('news_articles')
      .select('id, title_en, title_es, summary_en, summary_es, image_url, published_at, category')
      .neq('id', articleId)
      .eq('category', currentArticle.category)
      .order('published_at', { ascending: false })
      .limit(limit);

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
