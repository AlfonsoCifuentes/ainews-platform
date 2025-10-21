import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/db/supabase';
import { z } from 'zod';

const GetSchema = z.object({
  content_type: z.enum(['article', 'course', 'entity']).optional(),
});

const PostSchema = z.object({
  content_type: z.enum(['article', 'course', 'entity']),
  content_id: z.string().min(1),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const DeleteSchema = z.object({
  id: z.string().uuid(),
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

    let query = supabase
      .from('user_bookmarks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (params.content_type) {
      query = query.eq('content_type', params.content_type);
    }

    const { data, error } = await query;

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

    const { data, error } = await supabase
      .from('user_bookmarks')
      .insert({
        user_id: user.id,
        content_type: params.content_type,
        content_id: params.content_id,
        notes: params.notes || null,
        tags: params.tags || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
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

export async function DELETE(req: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();
    
    // Check auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const params = DeleteSchema.parse(body);

    const { error } = await supabase
      .from('user_bookmarks')
      .delete()
      .eq('id', params.id)
      .eq('user_id', user.id); // Ensure user can only delete own bookmarks

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
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
