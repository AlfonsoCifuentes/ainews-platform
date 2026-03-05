import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServerClient } from '@/lib/db/supabase';
import { sanitizeSearchQuery } from '@/lib/api/sanitize-search';

const listSchema = z.object({
  q: z.string().optional(),
  type: z.string().optional(),
  ids: z
    .string()
    .transform((v) => (v ? v.split(',').map((s) => s.trim()) : undefined))
    .optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
  offset: z.coerce.number().min(0).max(1000).default(0),
});

const createSchema = z.object({
  type: z.string().min(1),
  name: z.string().min(1),
  aliases: z.array(z.string()).optional(),
  description: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const params = listSchema.parse(
      Object.fromEntries(req.nextUrl.searchParams),
    );
    const db = getSupabaseServerClient();

  let query = db.from('entities').select('*').range(params.offset, params.offset + params.limit - 1);
    if (params.ids && params.ids.length) {
      query = query.in('id', params.ids as string[]);
    }
    if (params.type) query = query.eq('type', params.type);
    if (params.q) query = query.ilike('name', `%${sanitizeSearchQuery(params.q)}%`);

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
    console.error('[kg/entities] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch entities' }, { status: 500 });
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
      .from('entities')
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
    console.error('[kg/entities] POST error:', error);
    return NextResponse.json({ error: 'Failed to create entity' }, { status: 500 });
  }
}
