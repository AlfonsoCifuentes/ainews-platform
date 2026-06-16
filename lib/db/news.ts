import { z } from 'zod';
import type { Locale } from '@/i18n';
import { getSupabaseServerClient } from '@/lib/db/supabase';
import { sampleNewsArticles } from '@/lib/data/sample-news';
import {
  newsArticleArraySchema,
  newsArticleSchema,
  type INewsArticle,
} from '@/lib/types/news';
import { reorderArticlesForHero } from '@/lib/utils/news-quality';

const fetchParamsSchema = z.object({
  limit: z.number().min(1).max(50).default(12),
  category: z.string().min(1).optional(),
  orderBy: z.enum(['published_at', 'importance']).default('published_at'),
  collapseClusters: z.boolean().default(false),
});

export type FetchNewsParams = z.input<typeof fetchParamsSchema> & {
  locale: Locale;
};

const BASE_COLUMNS = `id,
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
  reading_time_minutes`;

const CORROBORATION_COLUMNS = `,
  story_cluster_id,
  corroboration_count,
  importance_score,
  corroborating_sources,
  is_cluster_primary`;

/** PostgREST "undefined column" — thrown when the corroboration migration
 *  hasn't been applied yet. We then retry against the legacy column set. */
const UNDEFINED_COLUMN = '42703';

function getFallbackArticles(limit: number): INewsArticle[] {
  return sampleNewsArticles.slice(0, limit).map((article) =>
    newsArticleSchema.parse(article),
  );
}

export async function fetchLatestNews(
  params: FetchNewsParams,
): Promise<INewsArticle[]> {
  const { limit, category, orderBy, collapseClusters } = fetchParamsSchema.parse(params);

  // Read-only queries work with the public anon key on Vercel.
  const hasSupabaseUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL);
  const hasAnySupabaseKey = Boolean(
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  if (!hasSupabaseUrl || !hasAnySupabaseKey) {
    return getFallbackArticles(limit);
  }

  try {
    const supabase = getSupabaseServerClient();

    const runQuery = async (opts: {
      filterHidden: boolean;
      withCorroboration: boolean;
    }) => {
      const columns = opts.withCorroboration
        ? `${BASE_COLUMNS}${CORROBORATION_COLUMNS}`
        : BASE_COLUMNS;

      let query = supabase.from('news_articles').select(columns);

      if (opts.filterHidden) query = query.eq('is_hidden', false);
      if (category) query = query.eq('category', category);
      if (opts.withCorroboration && collapseClusters) {
        query = query.eq('is_cluster_primary', true);
      }

      if (opts.withCorroboration && orderBy === 'importance') {
        query = query
          .order('importance_score', { ascending: false })
          .order('published_at', { ascending: false });
      } else {
        query = query.order('published_at', { ascending: false });
      }

      return await query.limit(limit);
    };

    const isUndefinedColumn = (err: unknown) =>
      (err as { code?: string } | null)?.code === UNDEFINED_COLUMN;

    // 1) Try full query (corroboration columns + hidden filter).
    let { data, error } = await runQuery({ filterHidden: true, withCorroboration: true });

    // 2) Migration not applied yet → legacy columns, still filtering hidden.
    if (error && isUndefinedColumn(error)) {
      ({ data, error } = await runQuery({ filterHidden: true, withCorroboration: false }));
    }

    // 3) is_hidden column missing too → drop the hidden filter.
    if (error && isUndefinedColumn(error)) {
      ({ data, error } = await runQuery({ filterHidden: false, withCorroboration: false }));
    }

    if (error || !data) {
      throw error ?? new Error('No data returned from Supabase.');
    }

    const articles = newsArticleArraySchema.parse(data);

    // Importance ordering already comes sorted from the DB; preserve it.
    if (orderBy === 'importance') return articles;

    return reorderArticlesForHero(articles, Date.now(), 3);
  } catch (error) {
    console.error('[fetchLatestNews] Falling back to sample data:', error);
    return getFallbackArticles(limit);
  }
}

/**
 * Top stories ranked by multi-source corroboration / importance, collapsing
 * each story cluster to its primary article. Falls back to chronological when
 * the corroboration columns don't exist yet.
 */
export async function fetchTopStories(params: {
  locale: Locale;
  limit?: number;
}): Promise<INewsArticle[]> {
  return fetchLatestNews({
    locale: params.locale,
    limit: params.limit ?? 12,
    orderBy: 'importance',
    collapseClusters: true,
  });
}

export function deriveCategoriesFromArticles(
  articles: INewsArticle[],
): string[] {
  return Array.from(new Set(articles.map((article) => article.category)));
}
