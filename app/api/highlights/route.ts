import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/db/supabase-server';

const CreateSchema = z.object({
  contentId: z.string().uuid(),
  text: z.string().min(1).max(5000),
  note: z.string().max(2000).optional(),
  color: z.enum(['yellow', 'blue', 'green', 'pink', 'purple']),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = CreateSchema.parse(body);

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data, error } = await supabase
      .from('user_highlights')
      .insert({
        user_id: user.id,
        content_id: validated.contentId,
        selection: validated.text,
        note: validated.note || '',
        color: validated.color,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to create highlight' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const contentId = req.nextUrl.searchParams.get('contentId');
    
    if (!contentId) {
      return NextResponse.json(
        { error: 'contentId required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data, error } = await supabase
      .from('user_highlights')
      .select('*')
      .eq('content_id', contentId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch highlights' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
