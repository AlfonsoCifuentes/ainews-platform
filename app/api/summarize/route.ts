import { NextResponse } from 'next/server';
import { z } from 'zod';
import { smartSummarizer } from '@/lib/ai/smart-summarizer';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from '@/lib/api/rate-limiter';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const GetSchema = z.object({
  contentId: z.string().min(1),
  contentType: z.enum(['article', 'course']),
  level: z.enum(['tldr', 'quick', 'standard']).default('quick'),
});

const PostSchema = z.object({
  contentId: z.string().min(1),
  contentType: z.enum(['article', 'course']),
  content: z.string().min(1),
});

export async function GET(req: Request) {
  try {
    // Rate limit: unauthenticated LLM route
    const rlKey = getRateLimitKey('summarize', null, req);
    const rl = checkRateLimit(rlKey, RATE_LIMITS.LLM_GENERATION.limit, RATE_LIMITS.LLM_GENERATION.windowMs);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { searchParams } = new URL(req.url);
    const params = GetSchema.parse({
      contentId: searchParams.get('contentId'),
      contentType: searchParams.get('contentType'),
      level: searchParams.get('level') || 'quick',
    });

    // Check cache first
    const { data: cached } = await supabase
      .from('article_summaries')
      .select('*')
      .eq('content_id', params.contentId)
      .eq('level', params.level)
      .single();

    if (cached) {
      return NextResponse.json({ summary: cached });
    }

    // Get content
    const table = params.contentType === 'article' ? 'news_articles' : 'courses';
    const { data: content } = await supabase.from(table).select('*').eq('id', params.contentId).single();

    if (!content) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }

    // Generate summary
    const fullContent = content.content_en || content.description_en || '';
    const summary = await smartSummarizer.generateSummary(params.contentId, params.contentType, fullContent, params.level);

    // Cache in database
    await supabase.from('article_summaries').insert({
      content_id: params.contentId,
      content_type: params.contentType,
      level: summary.level,
      summary_text: summary.summary_text,
      key_points: summary.key_points,
      reading_time_seconds: summary.reading_time_seconds
    });

    return NextResponse.json({ summary });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.errors },
        { status: 400 }
      );
    }
    console.error('[Summarize API] Error:', error);
    return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    // Rate limit: unauthenticated LLM route
    const rlKey = getRateLimitKey('summarize-all', null, req);
    const rl = checkRateLimit(rlKey, RATE_LIMITS.LLM_GENERATION.limit, RATE_LIMITS.LLM_GENERATION.windowMs);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await req.json();
    const params = PostSchema.parse(body);

    // Generate all summary levels
    const summaries = await smartSummarizer.generateAllLevels(params.contentId, params.contentType, params.content);

    // Cache all summaries
    await supabase.from('article_summaries').insert(
      summaries.map((s) => ({
        content_id: params.contentId,
        content_type: params.contentType,
        level: s.level,
        summary_text: s.summary_text,
        key_points: s.key_points,
        reading_time_seconds: s.reading_time_seconds
      }))
    );

    return NextResponse.json({ summaries });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.errors },
        { status: 400 }
      );
    }
    console.error('[Summarize API] Error generating all levels:', error);
    return NextResponse.json({ error: 'Failed to generate summaries' }, { status: 500 });
  }
}
