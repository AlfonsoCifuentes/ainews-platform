/**
 * Normalize existing course module markdown to better match the THOTNET editorial spec.
 *
 * This script is deterministic (no LLM). It will:
 * - Ensure a consistent hook structure (H1 + standfirst/hero + ---)
 * - Convert simple "- Key: value" lists into Editorial List style when safe
 *
 * Usage:
 *   npx tsx scripts/normalize-editorial-style.ts --limit=50
 *   npx tsx scripts/normalize-editorial-style.ts --limit=50 --apply=true
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { auditEditorialMarkdown, normalizeEditorialMarkdown } from '@/lib/courses/editorial-style';

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

function toBool(value: string | undefined): boolean {
  if (!value) return false;
  return ['1', 'true', 'yes', 'y', 'on'].includes(value.trim().toLowerCase());
}

async function main() {
  const limit = Number(getArg('limit') ?? '25');
  const effectiveLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 500) : 25;
  const apply = toBool(getArg('apply'));

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

  let changed = 0;
  let updated = 0;
  const issueTotalsBefore: Record<string, number> = {};
  const issueTotalsAfter: Record<string, number> = {};

  const samples: Array<{ id: string; locale: 'en' | 'es'; title: string; before: string[]; after: string[]; changed: boolean }> = [];

  for (const row of rows) {
    const id = String(row.id);

    const en = typeof row.content_en === 'string' ? row.content_en : '';
    const es = typeof row.content_es === 'string' ? row.content_es : '';

    const enBeforeIssues = en ? auditEditorialMarkdown(en) : [];
    const esBeforeIssues = es ? auditEditorialMarkdown(es) : [];

    for (const issue of [...enBeforeIssues, ...esBeforeIssues]) {
      issueTotalsBefore[issue.code] = (issueTotalsBefore[issue.code] ?? 0) + 1;
    }

    const enNormalized = en
      ? normalizeEditorialMarkdown(en, { title: String(row.title_en ?? row.title_es ?? ''), locale: 'en' })
      : '';
    const esNormalized = es
      ? normalizeEditorialMarkdown(es, { title: String(row.title_es ?? row.title_en ?? ''), locale: 'es' })
      : '';

    const enAfterIssues = enNormalized ? auditEditorialMarkdown(enNormalized) : [];
    const esAfterIssues = esNormalized ? auditEditorialMarkdown(esNormalized) : [];

    for (const issue of [...enAfterIssues, ...esAfterIssues]) {
      issueTotalsAfter[issue.code] = (issueTotalsAfter[issue.code] ?? 0) + 1;
    }

    const enChanged = en && enNormalized.trim() !== en.trim();
    const esChanged = es && esNormalized.trim() !== es.trim();

    if (enChanged || esChanged) {
      changed += 1;
    }

    if (samples.length < 8) {
      if (en) {
        samples.push({
          id,
          locale: 'en',
          title: String(row.title_en ?? row.title_es ?? id),
          before: enBeforeIssues.map((i) => i.code),
          after: enAfterIssues.map((i) => i.code),
          changed: enChanged,
        });
      }
      if (samples.length < 8 && es) {
        samples.push({
          id,
          locale: 'es',
          title: String(row.title_es ?? row.title_en ?? id),
          before: esBeforeIssues.map((i) => i.code),
          after: esAfterIssues.map((i) => i.code),
          changed: esChanged,
        });
      }
    }

    if (!apply) continue;
    if (!enChanged && !esChanged) continue;

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (enChanged) updatePayload.content_en = enNormalized;
    if (esChanged) updatePayload.content_es = esNormalized;

    const { error: updateError } = await supabase
      .from('course_modules')
      .update(updatePayload)
      .eq('id', id);

    if (updateError) {
      console.error(`Failed to update module ${id}:`, updateError.message);
      continue;
    }

    updated += 1;
  }

  console.log(`\nNormalized ${rows.length} module(s).`);
  console.log(`Changed (would update): ${changed}`);
  console.log(`Updated in DB: ${apply ? updated : 0} ${apply ? '' : '(dry-run)'}`);

  console.log('\nIssue counts BEFORE (sample set):');
  console.table(
    Object.entries(issueTotalsBefore)
      .sort((a, b) => b[1] - a[1])
      .map(([code, count]) => ({ code, count }))
  );

  console.log('\nIssue counts AFTER (sample set):');
  console.table(
    Object.entries(issueTotalsAfter)
      .sort((a, b) => b[1] - a[1])
      .map(([code, count]) => ({ code, count }))
  );

  if (samples.length > 0) {
    console.log('\nSamples (first 8 locale entries):');
    console.table(
      samples.map((s) => ({
        id: s.id,
        locale: s.locale,
        title: s.title.slice(0, 55),
        changed: s.changed,
        before: s.before.join(', '),
        after: s.after.join(', '),
      }))
    );
  }

  if (!apply) {
    console.log('\nTip: re-run with --apply=true to persist updates to Supabase.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
