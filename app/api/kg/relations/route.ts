import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServerClient } from '@/lib/db/supabase';

const listSchema = z.object({
  source_id: z.string().uuid().optional(),
  target_id: z.string().uuid().optional(),
  rel_type: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
});

const createSchema = z.object({
  source_id: z.string().uuid(),
  target_id: z.string().uuid(),
  rel_type: z.string().min(1),
  weight: z.number().min(0).max(100).optional(),
  evidence: z.array(z.record(z.unknown())).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const params = listSchema.parse(
      Object.fromEntries(req.nextUrl.searchParams),
    );
    const db = getSupabaseServerClient();
    let query = db.from('entity_relations').select('*').limit(params.limit);
    if (params.source_id) query = query.eq('source_id', params.source_id);
    if (params.target_id) query = query.eq('target_id', params.target_id);
    if (params.rel_type) query = query.eq('rel_type', params.rel_type);
    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ data });
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

export async function POST(req: NextRequest) {
  try {
    const adminHeader = req.headers.get('x-admin-token') ?? '';
    const adminToken = process.env.ADMIN_TOKEN ?? '';
    if (!adminToken || adminHeader !== adminToken) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const body = await req.json();
    const input = createSchema.parse(body);
    const db = getSupabaseServerClient();
    const { data, error } = await db
      .from('entity_relations')
      .insert({ ...input })
      .select('*')
      .single();
    if (error) throw error;
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid body', details: error.errors },
        { status: 400 },
      );
    }
    const message = error instanceof Error ? error.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
