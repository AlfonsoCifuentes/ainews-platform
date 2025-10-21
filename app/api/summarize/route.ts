import { NextResponse } from 'next/server';
import { smartSummarizer } from '@/lib/ai/smart-summarizer';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const contentId = searchParams.get('contentId');
    const contentType = searchParams.get('contentType') as 'article' | 'course';
    const level = searchParams.get('level') as 'tldr' | 'quick' | 'standard' || 'quick';

    if (!contentId || !contentType) {
      return NextResponse.json({ error: 'Content ID and type required' }, { status: 400 });
    }

    // Check cache first
    const { data: cached } = await supabase
      .from('article_summaries')
      .select('*')
      .eq('content_id', contentId)
      .eq('level', level)
      .single();

    if (cached) {
      return NextResponse.json({ summary: cached });
    }

    // Get content
    const table = contentType === 'article' ? 'news_articles' : 'courses';
    const { data: content } = await supabase.from(table).select('*').eq('id', contentId).single();

    if (!content) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }

    // Generate summary
    const fullContent = content.content_en || content.description_en || '';
    const summary = await smartSummarizer.generateSummary(contentId, contentType, fullContent, level);

    // Cache in database
    await supabase.from('article_summaries').insert({
      content_id: contentId,
      content_type: contentType,
      level: summary.level,
      summary_text: summary.summary_text,
      key_points: summary.key_points,
      reading_time_seconds: summary.reading_time_seconds
    });

    return NextResponse.json({ summary });
  } catch (error) {
    console.error('[Summarize API] Error:', error);
    return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { contentId, contentType, content } = body;

    if (!contentId || !contentType || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Generate all summary levels
    const summaries = await smartSummarizer.generateAllLevels(contentId, contentType, content);

    // Cache all summaries
    await supabase.from('article_summaries').insert(
      summaries.map((s) => ({
        content_id: contentId,
        content_type: contentType,
        level: s.level,
        summary_text: s.summary_text,
        key_points: s.key_points,
        reading_time_seconds: s.reading_time_seconds
      }))
    );

    return NextResponse.json({ summaries });
  } catch (error) {
    console.error('[Summarize API] Error generating all levels:', error);
    return NextResponse.json({ error: 'Failed to generate summaries' }, { status: 500 });
  }
}
