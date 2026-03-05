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
      console.error('[fact-checks] DB error:', error.message);
      return NextResponse.json({ error: 'Failed to fetch fact checks' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.errors },
        { status: 400 }
      );
    }
    console.error('[fact-checks] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
