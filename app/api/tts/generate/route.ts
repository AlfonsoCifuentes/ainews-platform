import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/db/supabase-server';

const GenerateSchema = z.object({
  contentId: z.string().uuid(),
  contentType: z.enum(['article', 'course']),
  locale: z.enum(['en', 'es']),
  voice: z.enum(['default', 'alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']).default('default'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { contentId, contentType, locale, voice } = GenerateSchema.parse(body);

    const supabase = await createClient();

    // Check if audio already exists
    const { data: existing } = await supabase
      .from('audio_files')
      .select('audio_url')
      .eq('content_id', contentId)
      .eq('locale', locale)
      .eq('voice', voice)
      .single();

    if (existing?.audio_url) {
      return NextResponse.json({ audioUrl: existing.audio_url });
    }

    // Fetch content
    let text = '';
    if (contentType === 'article') {
      const { data: article } = await supabase
        .from('news_articles')
        .select('title_en, title_es, content_en, content_es')
        .eq('id', contentId)
        .single();

      if (article) {
        const title = locale === 'en' ? article.title_en : article.title_es;
        const content = locale === 'en' ? article.content_en : article.content_es;
        text = `${title}\n\n${content}`;
      }
    } else {
      const { data: course } = await supabase
        .from('courses')
        .select('title_en, title_es, description_en, description_es')
        .eq('id', contentId)
        .single();

      if (course) {
        const title = locale === 'en' ? course.title_en : course.title_es;
        const description = locale === 'en' ? course.description_en : course.description_es;
        text = `${title}\n\n${description}`;
      }
    }

    if (!text) {
      return NextResponse.json(
        { error: 'Content not found' },
        { status: 404 }
      );
    }

    // Generate audio using OpenAI TTS (or alternative)
    // For now, we'll use a placeholder implementation
    // In production, you would call OpenAI TTS API or ElevenLabs
    
    // PLACEHOLDER: In real implementation, call OpenAI TTS:
    // const response = await fetch('https://api.openai.com/v1/audio/speech', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     model: 'tts-1',
    //     voice: voice === 'default' ? 'alloy' : voice,
    //     input: text.slice(0, 4096), // TTS has character limits
    //   }),
    // });
    // 
    // const audioBuffer = await response.arrayBuffer();
    // 
    // // Upload to Supabase Storage
    // const fileName = `audio/${contentId}-${locale}-${voice}.mp3`;
    // const { data: upload, error: uploadError } = await supabase.storage
    //   .from('audio')
    //   .upload(fileName, audioBuffer, {
    //     contentType: 'audio/mpeg',
    //     upsert: true,
    //   });
    //
    // const { data: { publicUrl } } = supabase.storage
    //   .from('audio')
    //   .getPublicUrl(fileName);

    // For demo purposes, return a placeholder
    const audioUrl = `https://demo.ainews.com/audio/${contentId}.mp3`;

    // Store in database
    await supabase.from('audio_files').insert({
      content_id: contentId,
      content_type: contentType,
      locale,
      voice,
      audio_url: audioUrl,
      duration_seconds: 0, // Would be calculated from actual audio
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({ audioUrl });
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
