import { createClient } from '@supabase/supabase-js';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

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

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.error('Missing Supabase envs: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey);

  const [overviewRes, searchRes, xpRes] = await Promise.all([
    supabase.from('analytics_overview').select('*').single(),
    supabase
      .from('search_queries')
      .select('id,user_id,query,locale,semantic,results_count,created_at')
      .order('created_at', { ascending: false })
      .limit(1000),
    supabase
      .from('user_xp_history')
      .select('user_id,total_xp,recorded_at')
      .order('recorded_at', { ascending: false })
      .limit(1000),
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
  const outDir = join(process.cwd(), 'analyze');
  mkdirSync(outDir, { recursive: true });
  const outFile = join(outDir, 'analytics-export.csv');
  writeFileSync(outFile, csv, 'utf8');
  console.log(`Exported analytics to ${outFile}`);
}

main().catch((err) => {
  console.error('Failed to export analytics:', err);
  process.exit(1);
});
