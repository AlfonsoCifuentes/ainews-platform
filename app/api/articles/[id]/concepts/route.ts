/**
 * API endpoint to extract and explain concepts from articles
 * Uses LLM to identify technical terms and fetch KG entities
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/db/supabase';
import { LLMClient } from '@/lib/ai/llm-client';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: articleId } = await params;
    const { searchParams } = new URL(req.url);
    const locale = (searchParams.get('locale') || 'en') as 'en' | 'es';

    const supabase = getSupabaseServerClient();

    // Fetch article content
    const contentField = `content_${locale}` as 'content_en' | 'content_es';
    const { data: article, error } = await supabase
      .from('news_articles')
      .select('id, content_en, content_es')
      .eq('id', articleId)
      .single();

    if (error || !article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    const content = article[contentField] as string;

    // Use LLM to extract technical concepts
    const llm = new LLMClient(
      process.env.OPENROUTER_API_KEY || '',
      'https://openrouter.ai/api/v1',
      'openai/gpt-4o-mini'
    );

    const isSpanish = locale === 'es';
    const prompt = `${
      isSpanish
        ? 'Identifica los términos técnicos más importantes en este artículo de IA y proporciona definiciones breves.'
        : 'Identify the most important technical terms in this AI article and provide brief definitions.'
    }

${isSpanish ? 'Artículo:' : 'Article:'}
${content.slice(0, 3000)} ${content.length > 3000 ? '...' : ''}

${
  isSpanish
    ? 'Responde SOLO con JSON en este formato:'
    : 'Respond ONLY with JSON in this format:'
}
{
  "concepts": [
    {
      "term": "${isSpanish ? 'término técnico' : 'technical term'}",
      "definition": "${isSpanish ? 'definición clara y concisa' : 'clear and concise definition'}",
      "examples": ["${isSpanish ? 'ejemplo 1' : 'example 1'}"]
    }
  ]
}

${
  isSpanish
    ? 'Limita a los 5-8 términos más relevantes.'
    : 'Limit to the 5-8 most relevant terms.'
}`;

    const response = await llm.generate(prompt, {
      temperature: 0.3,
      maxTokens: 1500,
    });

    // Parse LLM response
    interface ExtractedConcept {
      term: string;
      definition: string;
      examples?: string[];
    }
    
    let concepts: ExtractedConcept[] = [];
    try {
      const jsonMatch =
        response.content.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [
          '',
          response.content,
        ];
      const jsonStr = jsonMatch[1] || response.content;
      const parsed = JSON.parse(jsonStr);
      concepts = parsed.concepts || [];
    } catch (parseError) {
      console.error('Failed to parse LLM response:', parseError);
      return NextResponse.json({ concepts: [] });
    }

    // Enrich concepts with related KG entities
    const enrichedConcepts = await Promise.all(
      concepts.map(async (concept) => {
        // Search for related entities in Knowledge Graph
        const { data: entities } = await supabase
          .from('entities')
          .select('id, name_en, name_es, type')
          .or(
            `name_${locale}.ilike.%${concept.term}%,name_${locale}.ilike.%${concept.term.toLowerCase()}%`
          )
          .limit(3);

        return {
          ...concept,
          relatedEntities:
            entities?.map((e) => ({
              id: e.id,
              name: locale === 'en' ? e.name_en : e.name_es,
              type: e.type,
            })) || [],
        };
      })
    );

    return NextResponse.json({ concepts: enrichedConcepts });
  } catch (error) {
    console.error('Failed to extract concepts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
