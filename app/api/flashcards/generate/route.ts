import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/db/supabase-server';
import { createLLMClientWithFallback } from '@/lib/ai/llm-client';

const GenerateSchema = z.object({
  contentId: z.string().uuid(),
  contentType: z.enum(['article', 'course']),
  locale: z.enum(['en', 'es']),
  count: z.number().min(3).max(20).default(10),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { contentId, contentType, locale, count } = GenerateSchema.parse(body);

    const supabase = await createClient();

    // Fetch content
    let content = '';
    let category = '';

    if (contentType === 'article') {
      const { data } = await supabase
        .from('news_articles')
        .select('title_en, title_es, content_en, content_es, category')
        .eq('id', contentId)
        .single();

      if (data) {
        content = locale === 'en' 
          ? `${data.title_en}\n\n${data.content_en}` 
          : `${data.title_es}\n\n${data.content_es}`;
        category = data.category;
      }
    } else {
      const { data } = await supabase
        .from('courses')
        .select('title_en, title_es, description_en, description_es, category')
        .eq('id', contentId)
        .single();

      if (data) {
        content = locale === 'en'
          ? `${data.title_en}\n\n${data.description_en}`
          : `${data.title_es}\n\n${data.description_es}`;
        category = data.category;
      }
    }

    if (!content) {
      return NextResponse.json(
        { error: 'Content not found' },
        { status: 404 }
      );
    }

    // Generate flashcards using LLM
    const llm = await createLLMClientWithFallback();

    const prompt = locale === 'en'
      ? `Generate ${count} flashcards for learning from this content. Each flashcard should have:
- front: A concise question or concept (max 100 chars)
- back: A clear, detailed answer (max 300 chars)

Format as JSON array:
[{"front": "...", "back": "..."}, ...]

Content:
${content.slice(0, 3000)}`
      : `Genera ${count} tarjetas de estudio para aprender de este contenido. Cada tarjeta debe tener:
- front: Una pregunta o concepto conciso (máx 100 caracteres)
- back: Una respuesta clara y detallada (máx 300 caracteres)

Formato JSON array:
[{"front": "...", "back": "..."}, ...]

Contenido:
${content.slice(0, 3000)}`;

    const llmResponse = await llm.generate(prompt, {
      temperature: 0.7,
      maxTokens: 2000,
    });

    // Parse JSON response from LLM content
    let flashcards: Array<{ front: string; back: string }> = [];
    try {
      const jsonMatch = llmResponse.content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        flashcards = JSON.parse(jsonMatch[0]);
      }
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse LLM response' },
        { status: 500 }
      );
    }

    // Insert flashcards into database
    const { data: userId } = await supabase.auth.getUser();
    
    const cardsToInsert = flashcards.map(card => ({
      user_id: userId?.user?.id || null,
      content_id: contentId,
      content_type: contentType,
      front: card.front,
      back: card.back,
      category,
      interval: 0,
      repetitions: 0,
      ease_factor: 2.5,
      due_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    }));

    const { data, error } = await supabase
      .from('flashcards')
      .insert(cardsToInsert)
      .select();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to save flashcards' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data, count: data.length });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
