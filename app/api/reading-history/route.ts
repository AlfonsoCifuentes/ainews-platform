import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/db/supabase';
import { z } from 'zod';

const GetSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
});

const PostSchema = z.object({
  article_id: z.string().min(1),
  read_percentage: z.number().min(0).max(100),
  time_spent_seconds: z.number().min(0),
});

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();
    
    // Check auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = GetSchema.parse(
      Object.fromEntries(req.nextUrl.searchParams)
    );

    const { data, error } = await supabase
      .from('reading_history')
      .select('*')
      .eq('user_id', user.id)
      .order('last_read_at', { ascending: false })
      .limit(params.limit);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
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

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();
    
    // Check auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const params = PostSchema.parse(body);

    // Upsert: update if exists, insert if not
    const { data, error } = await supabase
      .from('reading_history')
      .upsert({
        user_id: user.id,
        article_id: params.article_id,
        read_percentage: params.read_percentage,
        time_spent_seconds: params.time_spent_seconds,
        last_read_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,article_id',
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
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
