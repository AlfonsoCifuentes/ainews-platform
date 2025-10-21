import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServerClient } from '@/lib/db/supabase';

const SearchQuerySchema = z.object({
  q: z.string().min(1).max(200),
  locale: z.enum(['en', 'es']).optional(),
  category: z.enum(['machinelearning', 'nlp', 'computervision', 'ethics', 'industry', 'research']).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  minQuality: z.number().min(0).max(1).optional(),
  sortBy: z.enum(['relevance', 'date', 'quality']).default('relevance'),
  limit: z.number().min(1).max(50).default(20),
  offset: z.number().min(0).default(0),
  semantic: z.boolean().default(false) // Use semantic search with embeddings
});

export async function GET(req: NextRequest) {
  try {
    const searchParams = Object.fromEntries(req.nextUrl.searchParams);
    const params = SearchQuerySchema.parse({
      ...searchParams,
      limit: searchParams.limit ? parseInt(searchParams.limit) : 20,
      offset: searchParams.offset ? parseInt(searchParams.offset) : 0,
      minQuality: searchParams.minQuality ? parseFloat(searchParams.minQuality) : undefined,
      semantic: searchParams.semantic === 'true'
    });

    const db = getSupabaseServerClient();

    let articles;
    let totalCount = 0;

    if (params.semantic) {
      // Semantic search using embeddings
      const embedding = await generateQueryEmbedding(params.q);
      
      const { data, error, count } = await db.rpc('search_articles_semantic', {
        query_embedding: embedding,
        p_locale: params.locale,
        p_category: params.category,
        p_date_from: params.dateFrom,
        p_date_to: params.dateTo,
        p_min_quality: params.minQuality || 0,
        p_limit: params.limit,
        p_offset: params.offset
      });

      if (error) throw error;
      articles = data;
      totalCount = count || 0;

    } else {
      // Full-text search
      let query = db
        .from('news_articles')
        .select('*', { count: 'exact' });

      // Build search query
      if (params.locale) {
        const searchColumn = params.locale === 'en' ? 'title_en' : 'title_es';
        const contentColumn = params.locale === 'en' ? 'content_en' : 'content_es';
        
        query = query.or(`${searchColumn}.ilike.%${params.q}%,${contentColumn}.ilike.%${params.q}%`);
      } else {
        query = query.or(
          `title_en.ilike.%${params.q}%,title_es.ilike.%${params.q}%,` +
          `content_en.ilike.%${params.q}%,content_es.ilike.%${params.q}%`
        );
      }

      // Apply filters
      if (params.category) {
        query = query.eq('category', params.category);
      }

      if (params.dateFrom) {
        query = query.gte('published_at', params.dateFrom);
      }

      if (params.dateTo) {
        query = query.lte('published_at', params.dateTo);
      }

      if (params.minQuality) {
        query = query.gte('quality_score', params.minQuality);
      }

      // Apply sorting
      switch (params.sortBy) {
        case 'date':
          query = query.order('published_at', { ascending: false });
          break;
        case 'quality':
          query = query.order('quality_score', { ascending: false });
          break;
        default:
          // For relevance, we'll use a combination of quality and recency
          query = query.order('quality_score', { ascending: false });
          query = query.order('published_at', { ascending: false });
      }

      // Apply pagination
      query = query.range(params.offset, params.offset + params.limit - 1);

      const { data, error, count } = await query;

      if (error) throw error;
      articles = data;
      totalCount = count || 0;
    }

    // Log search query for analytics (silent fail)
    try {
      await db.from('search_queries').insert({
        query: params.q,
        locale: params.locale,
        category: params.category,
        semantic: params.semantic,
        results_count: articles?.length || 0
      });
    } catch {
      // Ignore analytics errors
    }

    return NextResponse.json({
      success: true,
      data: {
        articles,
        pagination: {
          total: totalCount,
          limit: params.limit,
          offset: params.offset,
          hasMore: params.offset + params.limit < totalCount
        },
        query: params
      }
    });

  } catch (error) {
    console.error('[Search API] Error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid search parameters', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Search failed', message: String(error) },
      { status: 500 }
    );
  }
}

async function generateQueryEmbedding(query: string): Promise<number[]> {
  const response = await fetch('https://openrouter.ai/api/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'openai/text-embedding-ada-002',
      input: query
    })
  });

  const data = await response.json();
  return data.data[0].embedding;
}
