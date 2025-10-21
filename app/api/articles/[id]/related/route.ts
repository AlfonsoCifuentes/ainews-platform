import { NextRequest, NextResponse } from 'next/server';
import { findRelatedArticles } from '@/lib/ai/embeddings';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const limitParam = req.nextUrl.searchParams.get('limit');
    const localeParam = req.nextUrl.searchParams.get('locale') || 'en';
    
    const limit = limitParam ? parseInt(limitParam) : 5;
    const locale = localeParam as 'en' | 'es';
    
    console.log(`[Related API] Finding related articles for ${id}`);
    
    const results = await findRelatedArticles(id, limit);
    
    // Format results for locale
    const formattedResults = results.map(article => ({
      id: article.id,
      title: locale === 'en' ? article.title_en : article.title_es,
      summary: locale === 'en' ? article.summary_en : article.summary_es,
      category: article.category,
      image_url: article.image_url,
      published_at: article.published_at,
      similarity: article.similarity
    }));
    
    return NextResponse.json({
      success: true,
      data: {
        article_id: id,
        related: formattedResults,
        count: formattedResults.length
      }
    });
    
  } catch (error) {
    console.error('[Related API] Error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to find related articles',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
