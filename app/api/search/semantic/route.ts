import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { searchArticles } from '@/lib/ai/embeddings';

const SearchSchema = z.object({
  q: z.string().min(3).max(500),
  limit: z.number().min(1).max(50).default(10),
  threshold: z.number().min(0).max(1).default(0.75),
  category: z.string().optional(),
  locale: z.enum(['en', 'es']).default('en')
});

export async function GET(req: NextRequest) {
  try {
    const searchParams = Object.fromEntries(req.nextUrl.searchParams);
    
    const params = SearchSchema.parse({
      q: searchParams.q,
      limit: searchParams.limit ? parseInt(searchParams.limit) : 10,
      threshold: searchParams.threshold ? parseFloat(searchParams.threshold) : 0.75,
      category: searchParams.category,
      locale: searchParams.locale || 'en'
    });
    
    console.log(`[Search API] Semantic search for: "${params.q}"`);
    
    const results = await searchArticles(params.q, {
      limit: params.limit,
      threshold: params.threshold,
      category: params.category
    });
    
    // Format results for locale
    const formattedResults = results.map(article => ({
      id: article.id,
      title: params.locale === 'en' ? article.title_en : article.title_es,
      content: params.locale === 'en' ? article.content_en : article.content_es,
      category: article.category,
      published_at: article.published_at,
      similarity: article.similarity
    }));
    
    return NextResponse.json({
      success: true,
      data: {
        query: params.q,
        results: formattedResults,
        count: formattedResults.length
      }
    });
    
  } catch (error) {
    console.error('[Search API] Error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid search parameters',
          details: error.errors
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      {
        success: false,
        error: 'Search failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
