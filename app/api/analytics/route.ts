import { NextRequest, NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cachedClient: SupabaseClient | null = null;

function getSupabaseAdminClient(): SupabaseClient | null {
  if (cachedClient) return cachedClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.warn('[Analytics API] Missing Supabase configuration');
    return null;
  }

  cachedClient = createClient(url, serviceKey);
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

export async function GET(req: NextRequest) {
  try {
    const isPublic = process.env.NEXT_PUBLIC_ANALYTICS_PUBLIC === 'true';
    const adminToken = process.env.ANALYTICS_ACCESS_TOKEN;

    if (!isPublic) {
      const token = req.headers.get('x-analytics-token') ?? req.nextUrl.searchParams.get('token');
      if (!adminToken || token !== adminToken) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
    }

    // Get analytics overview from the view
    const { data, error } = await supabase.from('analytics_overview').select('*').single();

    if (error) throw error;

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
