import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/db/supabase';
import { z } from 'zod';

const GetSchema = z.object({
  entity_id: z.string().uuid().optional(),
  relation_id: z.string().uuid().optional(),
  verdict: z.enum(['true', 'false', 'misleading', 'unverified', 'needs-context']).optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export async function GET(req: NextRequest) {
  try {
    const params = GetSchema.parse(
      Object.fromEntries(req.nextUrl.searchParams)
    );

    const supabase = getSupabaseServerClient();

    let query = supabase
      .from('fact_checks')
      .select('*')
      .order('checked_at', { ascending: false })
      .limit(params.limit);

    if (params.entity_id) {
      query = query.eq('entity_id', params.entity_id);
    }

    if (params.relation_id) {
      query = query.eq('relation_id', params.relation_id);
    }

    if (params.verdict) {
      query = query.eq('verdict', params.verdict);
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
    const message = error instanceof Error ? error.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
