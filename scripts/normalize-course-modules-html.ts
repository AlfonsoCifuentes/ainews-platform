/* eslint-disable no-console */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { normalizeEditorialMarkdown } from '../lib/courses/editorial-style';

type CourseModuleRow = {
  id: string;
  title_en: string | null;
  title_es: string | null;
  content_en: string | null;
  content_es: string | null;
};

function looksLikeHtmlLeak(text: string): boolean {
  // Avoid triggering on code fences that legitimately include HTML.
  // We just want obvious tag leakage in prose.
  if (!text) return false;
  if (!/[<>]/.test(text)) return false;
  return /<\s*\/?\s*[a-z][^>]*>/i.test(text);
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const apply = args.has('--apply');
  const dryRun = !apply;

  const limitArg = process.argv.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? Math.max(1, Number(limitArg.split('=')[1] || '0')) : undefined;

  const onlyIfHtml = args.has('--only-if-html');

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY');
  }

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  console.log('═'.repeat(80));
  console.log('🧽 Normalize course module HTML leakage');
  console.log('Mode:', dryRun ? 'DRY RUN (add --apply to write)' : 'APPLY');
  console.log('Filter:', onlyIfHtml ? 'only modules with HTML-like tags' : 'all modules');
  console.log('Limit:', limit ?? 'none');
  console.log('═'.repeat(80));

  const pageSize = 200;
  let offset = 0;
  let scanned = 0;
  let changed = 0;
  let updated = 0;
  let skipped = 0;

  while (true) {
    let query = supabase
      .from('course_modules')
      .select('id,title_en,title_es,content_en,content_es')
      .order('created_at', { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (limit) {
      const remaining = limit - scanned;
      if (remaining <= 0) break;
      const take = Math.min(pageSize, remaining);
      query = supabase
        .from('course_modules')
        .select('id,title_en,title_es,content_en,content_es')
        .order('created_at', { ascending: true })
        .range(offset, offset + take - 1);
    }

    const { data, error } = await query;
    if (error) throw error;

    const rows = (data ?? []) as CourseModuleRow[];
    if (rows.length === 0) break;

    for (const row of rows) {
      scanned += 1;

      const titleEn = row.title_en || undefined;
      const titleEs = row.title_es || undefined;
      const originalEn = row.content_en || '';
      const originalEs = row.content_es || '';

      const shouldProcess =
        !onlyIfHtml || looksLikeHtmlLeak(originalEn) || looksLikeHtmlLeak(originalEs);

      if (!shouldProcess) {
        skipped += 1;
        continue;
      }

      const normalizedEn = normalizeEditorialMarkdown(originalEn, {
        title: titleEn,
        locale: 'en',
      });
      const normalizedEs = normalizeEditorialMarkdown(originalEs, {
        title: titleEs,
        locale: 'es',
      });

      const needsUpdate = normalizedEn !== (originalEn || '') || normalizedEs !== (originalEs || '');
      if (!needsUpdate) {
        skipped += 1;
        continue;
      }

      changed += 1;

      if (dryRun) {
        if (changed <= 10) {
          console.log(`• Would update module ${row.id} (${row.title_en || row.title_es || 'untitled'})`);
        }
        continue;
      }

      const { error: updateError } = await supabase
        .from('course_modules')
        .update({
          content_en: normalizedEn,
          content_es: normalizedEs,
        })
        .eq('id', row.id);

      if (updateError) {
        console.warn(`⚠️ Failed update ${row.id}:`, updateError.message);
        continue;
      }

      updated += 1;
      if (updated % 25 === 0) {
        console.log(`✅ Updated ${updated} modules (scanned ${scanned})`);
      }
    }

    offset += rows.length;
  }

  console.log('─'.repeat(80));
  console.log(`Scanned:  ${scanned}`);
  console.log(`Changed:  ${changed}`);
  console.log(`Updated:  ${updated}`);
  console.log(`Skipped:  ${skipped}`);
  console.log('Done.');
  console.log('─'.repeat(80));

  if (dryRun) {
    console.log('Run with: npx tsx scripts/normalize-course-modules-html.ts --apply --only-if-html');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
