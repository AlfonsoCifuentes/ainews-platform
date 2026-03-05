import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServerClient } from '@/lib/db/supabase';

const paramsSchema = z.object({ id: z.string().uuid() });

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const { id } = paramsSchema.parse(resolvedParams);
    const db = getSupabaseServerClient();
    const { data, error } = await db.from('entities').select('*').eq('id', id).single();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.errors },
        { status: 400 },
      );
    }
    console.error('[kg/entities/id] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch entity' }, { status: 500 });
  }
}
