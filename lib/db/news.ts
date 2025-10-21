import { z } from 'zod';
import type { Locale } from '@/i18n';
import { getSupabaseServerClient } from '@/lib/db/supabase';
import { sampleNewsArticles } from '@/lib/data/sample-news';
import {
  newsArticleArraySchema,
  newsArticleSchema,
  type INewsArticle,
} from '@/lib/types/news';

const fetchParamsSchema = z.object({
  limit: z.number().min(1).max(50).default(12),
  category: z.string().min(1).optional(),
});

export type FetchNewsParams = z.infer<typeof fetchParamsSchema> & {
  locale: Locale;
};

function getFallbackArticles(limit: number): INewsArticle[] {
  return sampleNewsArticles.slice(0, limit).map((article) =>
    newsArticleSchema.parse(article),
  );
}

export async function fetchLatestNews(
  params: FetchNewsParams,
): Promise<INewsArticle[]> {
  const { limit, category } = fetchParamsSchema.parse(params);

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return getFallbackArticles(limit);
  }

  try {
    const supabase = getSupabaseServerClient();
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
      .limit(limit);

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error || !data) {
      throw error ?? new Error('No data returned from Supabase.');
    }

    return newsArticleArraySchema.parse(data);
  } catch (error) {
    console.error('[fetchLatestNews] Falling back to sample data:', error);
    return getFallbackArticles(limit);
  }
}

export function deriveCategoriesFromArticles(
  articles: INewsArticle[],
): string[] {
  return Array.from(new Set(articles.map((article) => article.category)));
}
