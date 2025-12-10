import { Buffer } from 'node:buffer';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import OpenAI from 'openai';
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

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY is not configured' },
        { status: 500 }
      );
    }

    const openai = new OpenAI({ apiKey });
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

    // Generate audio using OpenAI TTS (streamed)
    const input = text.slice(0, 4800);
    const voiceMap: Record<string, string> = {
      default: 'alloy',
      alloy: 'alloy',
      echo: 'echo',
      fable: 'fable',
      onyx: 'onyx',
      nova: 'nova',
      shimmer: 'shimmer',
    };

    const speech = await openai.audio.speech.create({
      model: 'gpt-4o-mini-tts',
      voice: voiceMap[voice] ?? 'alloy',
      input,
    });

    const audioBuffer = Buffer.from(await speech.arrayBuffer());

    let audioUrl: string | null = null;

    // Try to persist to Supabase Storage; fall back to data URL on failure
    try {
      const fileName = `audio/${contentId}-${locale}-${voice}.mp3`;
      const { error: uploadError } = await supabase.storage
        .from('audio')
        .upload(fileName, audioBuffer, {
          contentType: 'audio/mpeg',
          upsert: true,
        });

      if (uploadError) {
        console.warn('[tts] Storage upload failed, using data URL fallback', uploadError.message);
      } else {
        const { data: publicUrlData } = supabase.storage.from('audio').getPublicUrl(fileName);
        audioUrl = publicUrlData.publicUrl;
      }
    } catch (storageError) {
      console.warn('[tts] Storage error, using data URL fallback', storageError);
    }

    if (!audioUrl) {
      const base64 = audioBuffer.toString('base64');
      audioUrl = `data:audio/mpeg;base64,${base64}`;
    }

    await supabase.from('audio_files').upsert({
      content_id: contentId,
      content_type: contentType,
      locale,
      voice,
      audio_url: audioUrl,
      duration_seconds: Math.round((speech as { duration?: number }).duration ?? 0),
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
