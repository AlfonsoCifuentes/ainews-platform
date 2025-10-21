import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { detectTrendingTopics } from '@/lib/ai/trending';
import { getSupabaseServerClient } from '@/lib/db/supabase';

const schema = z.object({
  hours: z.coerce.number().min(1).max(168).default(24),
  limit: z.coerce.number().min(1).max(50).default(10),
  skipCache: z.coerce.boolean().default(false),
});

export async function GET(req: NextRequest) {
  try {
    const params = schema.parse(Object.fromEntries(req.nextUrl.searchParams));
    const supabase = getSupabaseServerClient();
    
    // Check cache first (unless skipCache is true)
    if (!params.skipCache) {
      const { data: cachedTopics } = await supabase
        .from('trending_topics')
        .select('*')
        .gt('expires_at', new Date().toISOString())
        .order('momentum', { ascending: false })
        .limit(params.limit);
      
      if (cachedTopics && cachedTopics.length > 0) {
        return NextResponse.json({
          data: cachedTopics.map((t) => ({
            topic: t.topic,
            count: t.count,
            momentum: t.momentum,
            articles: t.article_ids,
          })),
          meta: {
            total: cachedTopics.length,
            lookbackHours: params.hours,
            cached: true,
          },
        });
      }
    }
    
    // Compute trending topics
    const topics = await detectTrendingTopics(params.hours);
    
    // Store in cache (expires in 1 hour)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const topicsToCache = topics.slice(0, params.limit).map((t) => ({
      topic: t.topic,
      count: t.count,
      momentum: t.momentum,
      article_ids: t.articles || [],
      entity_ids: [],
      expires_at: expiresAt,
    }));
    
    await supabase.from('trending_topics').insert(topicsToCache);
    
    return NextResponse.json({
      data: topics.slice(0, params.limit),
      meta: {
        total: topics.length,
        lookbackHours: params.hours,
        cached: false,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.errors },
        { status: 400 }
      );
    }
    const message = error instanceof Error ? error.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

