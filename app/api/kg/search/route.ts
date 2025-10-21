import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServerClient } from '@/lib/db/supabase';

const schema = z.object({
  q: z.string().min(1),
  type: z.string().optional(),
  limit: z.coerce.number().min(1).max(25).default(10),
});

export async function GET(req: NextRequest) {
  try {
    const params = schema.parse(Object.fromEntries(req.nextUrl.searchParams));
    const db = getSupabaseServerClient();

    // Simple ilike search on name and aliases; vector search can be added later
    const { data, error } = await db
      .from('entities')
      .select('*')
      .ilike('name', `%${params.q}%`)
      .limit(params.limit);

    if (error) throw error;

    const filtered = params.type
      ? (data ?? []).filter((e) => e.type === params.type)
      : data ?? [];

    return NextResponse.json({ data: filtered });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.errors },
        { status: 400 },
      );
    }
    const message = error instanceof Error ? error.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
