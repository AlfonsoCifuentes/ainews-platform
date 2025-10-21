import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/db/supabase';
import { z } from 'zod';

const SearchSchema = z.object({
  q: z.string().min(1),
  types: z.string().optional(), // Comma-separated: article,course,entity
  locale: z.enum(['en', 'es']).default('en'),
  limit: z.coerce.number().min(1).max(50).default(10),
});

export async function GET(req: NextRequest) {
  try {
    const params = SearchSchema.parse(
      Object.fromEntries(req.nextUrl.searchParams)
    );

    const supabase = getSupabaseServerClient();
    const searchTypes = params.types ? params.types.split(',') : ['article', 'course', 'entity'];
    const results: Record<string, unknown[]> = {};

    // Search articles
    if (searchTypes.includes('article')) {
      const titleCol = params.locale === 'en' ? 'title_en' : 'title_es';
      const { data } = await supabase
        .from('news_articles')
        .select('id, title_en, title_es, summary_en, summary_es, image_url, created_at')
        .or(`${titleCol}.ilike.%${params.q}%,summary_${params.locale}.ilike.%${params.q}%`)
        .order('created_at', { ascending: false })
        .limit(params.limit);
      
      results.articles = (data || []).map((a) => ({
        id: a.id,
        title: params.locale === 'en' ? a.title_en : a.title_es,
        summary: params.locale === 'en' ? a.summary_en : a.summary_es,
        image: a.image_url,
        type: 'article',
        url: `/${params.locale}/news/${a.id}`,
      }));
    }

    // Search courses
    if (searchTypes.includes('course')) {
      const { data } = await supabase
        .from('courses')
        .select('id, title, description, difficulty, duration_hours')
        .or(`title.ilike.%${params.q}%,description.ilike.%${params.q}%`)
        .order('created_at', { ascending: false })
        .limit(params.limit);
      
      results.courses = (data || []).map((c) => ({
        id: c.id,
        title: c.title,
        description: c.description,
        difficulty: c.difficulty,
        duration: c.duration_hours,
        type: 'course',
        url: `/${params.locale}/courses/${c.id}`,
      }));
    }

    // Search entities
    if (searchTypes.includes('entity')) {
      const { data } = await supabase
        .from('entities')
        .select('id, name, type, description')
        .or(`name.ilike.%${params.q}%,description.ilike.%${params.q}%`)
        .order('name', { ascending: true })
        .limit(params.limit);
      
      results.entities = (data || []).map((e) => ({
        id: e.id,
        name: e.name,
        type: e.type,
        description: e.description,
        entityType: 'entity',
        url: `/${params.locale}/kg/${e.id}`,
      }));
    }

    const totalResults = Object.values(results).reduce((sum, arr) => sum + arr.length, 0);

    return NextResponse.json({
      data: results,
      meta: {
        query: params.q,
        totalResults,
        searchTypes,
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
