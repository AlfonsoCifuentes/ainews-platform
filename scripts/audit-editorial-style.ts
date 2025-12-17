/**
 * Audit existing course module markdown against the magazine/editorial style guide.
 *
 * Usage:
 *   npx tsx scripts/audit-editorial-style.ts
 *   npx tsx scripts/audit-editorial-style.ts --limit=50
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { auditEditorialMarkdown } from '@/lib/courses/editorial-style';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing Supabase configuration (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)');
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

function getArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const arg = process.argv.find((a) => a.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : undefined;
}

async function main() {
  const limit = Number(getArg('limit') ?? '25');
  const effectiveLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 200) : 25;

  const { data, error } = await supabase
    .from('course_modules')
    .select('id, course_id, title_en, title_es, content_en, content_es, created_at')
    .order('created_at', { ascending: false })
    .limit(effectiveLimit);

  if (error) {
    console.error('Error fetching course modules:', error.message);
    process.exitCode = 1;
    return;
  }

  const rows = data ?? [];
  const totals: Record<string, number> = {};

  const failures: Array<{ id: string; locale: 'en' | 'es'; codes: string[]; title: string }> = [];

  for (const row of rows) {
    const en = typeof row.content_en === 'string' ? row.content_en : '';
    const es = typeof row.content_es === 'string' ? row.content_es : '';

    const enIssues = en ? auditEditorialMarkdown(en) : [];
    const esIssues = es ? auditEditorialMarkdown(es) : [];

    for (const issue of [...enIssues, ...esIssues]) {
      totals[issue.code] = (totals[issue.code] ?? 0) + 1;
    }

    if (enIssues.length > 0) {
      failures.push({
        id: String(row.id),
        locale: 'en',
        codes: enIssues.map((i) => i.code),
        title: String(row.title_en ?? row.title_es ?? row.id),
      });
    }

    if (esIssues.length > 0) {
      failures.push({
        id: String(row.id),
        locale: 'es',
        codes: esIssues.map((i) => i.code),
        title: String(row.title_es ?? row.title_en ?? row.id),
      });
    }
  }

  console.log(`\nAudited ${rows.length} module(s).`);
  console.log('Issue counts (higher = more non-compliance):');
  console.table(
    Object.entries(totals)
      .sort((a, b) => b[1] - a[1])
      .map(([code, count]) => ({ code, count }))
  );

  if (failures.length > 0) {
    console.log('\nSample failures (first 12):');
    console.table(
      failures.slice(0, 12).map((f) => ({
        id: f.id,
        locale: f.locale,
        title: f.title.slice(0, 60),
        issues: f.codes.join(', '),
      }))
    );
  } else {
    console.log('\nNo issues found in the audited set.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
