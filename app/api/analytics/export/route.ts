import { NextRequest, NextResponse } from 'next/server';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { createClient as createServerSupabaseClient } from '@/lib/db/supabase-server';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

let cachedClient: SupabaseClient | null = null;

function getSupabaseAdminClient(): SupabaseClient | null {
  if (cachedClient) return cachedClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.warn('[Analytics Export] Missing Supabase configuration');
    return null;
  }

  cachedClient = createClient(url, serviceKey);
  return cachedClient;
}

async function getRequestUser(req: NextRequest): Promise<User | null> {
  try {
    const supabaseAuth = await createServerSupabaseClient();
    const { data: userData } = await supabaseAuth.auth.getUser();
    if (userData?.user) return userData.user;
  } catch (error) {
    console.warn('[Analytics Export] Cookie-based auth lookup failed', error);
  }

  const authHeader = req.headers.get('authorization');
  const bearerMatch = authHeader?.match(/^Bearer\s+(.+)$/i);
  const bearerToken = bearerMatch?.[1];

  if (bearerToken) {
    const supabase = getSupabaseAdminClient();
    if (supabase) {
      try {
        const { data } = await supabase.auth.getUser(bearerToken);
        if (data.user) return data.user;
      } catch (error) {
        console.warn('[Analytics Export] Bearer token auth lookup failed', error);
      }
    }
  }

  return null;
}

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function buildCsv(rows: Array<Record<string, unknown>>, headers: string[]): string {
  const headerLine = headers.join(',');
  const body = rows
    .map((row) => headers.map((h) => escapeCsv(row[h])).join(','))
    .join('\n');
  return `${headerLine}\n${body}`;
}

export async function GET(req: NextRequest) {
  try {
    const isPublic = process.env.NEXT_PUBLIC_ANALYTICS_PUBLIC === 'true';
    const adminToken = process.env.ANALYTICS_ACCESS_TOKEN;
    const user = await getRequestUser(req);
    const hasUser = Boolean(user);

    if (!isPublic) {
      const token = req.headers.get('x-analytics-token') ?? req.nextUrl.searchParams.get('token');
      const hasValidAdminToken = Boolean(adminToken && token === adminToken);

      if (!hasValidAdminToken && !hasUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
    }

    const [overviewRes, searchRes, xpRes] = await Promise.all([
      supabase.from('analytics_overview').select('*').single(),
      supabase
        .from('search_queries')
        .select('id,user_id,query,locale,semantic,results_count,created_at')
        .order('created_at', { ascending: false })
        .limit(500),
      supabase
        .from('user_xp_history')
        .select('user_id,total_xp,recorded_at')
        .order('recorded_at', { ascending: false })
        .limit(500),
    ]);

    if (overviewRes.error) throw overviewRes.error;
    if (searchRes.error) throw searchRes.error;
    if (xpRes.error) throw xpRes.error;

    const overviewRows = Object.entries(overviewRes.data ?? {}).map(([metric, value]) => ({
      dataset: 'overview',
      metric,
      value,
    }));

    const searchRows = (searchRes.data ?? []).map((row) => ({
      dataset: 'search_queries',
      metric: row.id,
      value: '',
      user_id: row.user_id,
      query: row.query,
      locale: row.locale,
      semantic: row.semantic,
      results_count: row.results_count,
      created_at: row.created_at,
    }));

    const xpRows = (xpRes.data ?? []).map((row) => ({
      dataset: 'user_xp_history',
      metric: '',
      value: '',
      user_id: row.user_id,
      query: '',
      locale: '',
      semantic: '',
      results_count: '',
      created_at: '',
      recorded_at: row.recorded_at,
      total_xp: row.total_xp,
    }));

    const headers = [
      'dataset',
      'metric',
      'value',
      'user_id',
      'query',
      'locale',
      'semantic',
      'results_count',
      'created_at',
      'recorded_at',
      'total_xp',
    ];

    const csv = buildCsv([...overviewRows, ...searchRows, ...xpRows], headers);

    // Persist copy locally for inspection (best-effort; ignored in serverless)
    try {
      const outDir = join(process.cwd(), 'analyze');
      mkdirSync(outDir, { recursive: true });
      writeFileSync(join(outDir, 'analytics-export.csv'), csv, 'utf8');
    } catch (fileError) {
      console.warn('[Analytics Export] Could not write local CSV:', fileError);
    }

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="analytics-export.csv"',
      },
    });
  } catch (error) {
    console.error('[Analytics Export] Error:', error);
    return NextResponse.json({ error: 'Failed to export analytics' }, { status: 500 });
  }
}
