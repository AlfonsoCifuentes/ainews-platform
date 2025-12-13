import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { createClient as createServerSupabaseClient } from '@/lib/db/supabase-server';

let cachedClient: SupabaseClient | null = null;

function getSupabaseAdminClient(): SupabaseClient | null {
  if (cachedClient) return cachedClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.warn('[Analytics API] Missing Supabase configuration');
    return null;
  }

  cachedClient = createSupabaseClient(url, serviceKey);
  return cachedClient;
}

function aggregateByDay<T extends Record<string, string | number | Date>>(rows: T[], key: keyof T) {
  const counts = new Map<string, number>();

  rows.forEach((row) => {
    const raw = row[key];
    const date = new Date(raw as string).toISOString().split('T')[0];
    counts.set(date, (counts.get(date) ?? 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

type OverviewRow = Record<string, unknown>;

function isMissingRelationError(err: unknown): boolean {
  const anyErr = err as { code?: string; message?: string; details?: string };
  const msg = `${anyErr?.message ?? ''} ${anyErr?.details ?? ''}`.toLowerCase();
  return anyErr?.code === '42P01' || (msg.includes('relation') && msg.includes('does not exist'));
}

function normalizeOverview(rows: OverviewRow[] | null | undefined): Record<string, number> {
  const defaults = {
    total_users: 0,
    active_users_week: 0,
    active_users_month: 0,
    total_articles: 0,
    articles_week: 0,
    total_courses: 0,
    total_enrollments: 0,
    completed_enrollments: 0,
    avg_quiz_score: 0,
    searches_week: 0,
    users_with_saved_articles: 0,
    avg_streak_days: 0,
  };

  if (!rows || rows.length === 0) return defaults;

  const first = rows[0] as Record<string, unknown>;
  const readString = (row: Record<string, unknown>, key: string): string => {
    const v = row[key];
    if (typeof v === 'string') return v;
    if (v === null || v === undefined) return '';
    return String(v);
  };
  const readNumber = (row: Record<string, unknown>, key: string): number => {
    const v = row[key];
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  // Table form: { metric_name, metric_value, ... }
  if ('metric_name' in first) {
    const mapped: Record<string, number> = { ...defaults };
    for (const row of rows) {
      const metric = readString(row, 'metric_name').trim();
      if (!metric) continue;
      mapped[metric] = readNumber(row, 'metric_value');
    }
    return mapped;
  }

  // View form: single row with numeric columns
  const mapped: Record<string, number> = { ...defaults };
  for (const key of Object.keys(defaults)) {
    mapped[key] = readNumber(first, key);
  }
  return mapped;
}

async function getRequestUser(req: NextRequest): Promise<User | null> {
  try {
    const supabaseAuth = await createServerSupabaseClient();
    const { data: userData } = await supabaseAuth.auth.getUser();
    if (userData?.user) return userData.user;
  } catch (error) {
    console.warn('[Analytics API] Cookie-based auth lookup failed', error);
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
        console.warn('[Analytics API] Bearer token auth lookup failed', error);
      }
    }
  }

  return null;
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

    // analytics_overview can be a VIEW (single row) or a TABLE (metric rows) depending on migrations.
    const overviewRes = await supabase.from('analytics_overview').select('*').limit(2000);
    if (overviewRes.error) {
      if (isMissingRelationError(overviewRes.error)) {
        return NextResponse.json({
          data: normalizeOverview([]),
          searchTrends: [],
          xpTrends: [],
          timestamp: new Date().toISOString(),
        });
      }
      throw overviewRes.error;
    }

    const data = normalizeOverview(overviewRes.data as OverviewRow[] | null | undefined);

    // Lightweight trend samples for ML-ish insights
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [{ data: searchRows }, { data: xpRows }] = await Promise.all([
      supabase
        .from('search_queries')
        .select('created_at')
        .gte('created_at', sevenDaysAgo)
        .order('created_at', { ascending: true })
        .limit(2000),
      supabase
        .from('user_xp_history')
        .select('recorded_at, total_xp')
        .gte('recorded_at', thirtyDaysAgo)
        .order('recorded_at', { ascending: true })
        .limit(2000),
    ]);

    const searchTrends = searchRows ? aggregateByDay(searchRows, 'created_at') : [];
    const xpTrends = xpRows
      ? aggregateByDay(xpRows, 'recorded_at').map((entry, idx, arr) => {
          const prev = arr[idx - 1]?.count ?? entry.count;
          const delta = entry.count - prev;
          return { ...entry, delta };
        })
      : [];

    return NextResponse.json({
      data,
      searchTrends,
      xpTrends,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Analytics API] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
