/**
 * Normalize course module markdown in the database (code fences, prose separation, etc.).
 *
 * Usage:
 *   npx tsx scripts/fix-course-module-markdown.ts
 *   npx tsx scripts/fix-course-module-markdown.ts --execute
 *   npx tsx scripts/fix-course-module-markdown.ts --limit=50 --execute
 *   npx tsx scripts/fix-course-module-markdown.ts --courseId=UUID --execute
 *   npx tsx scripts/fix-course-module-markdown.ts --moduleId=UUID --execute
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import { normalizeEditorialMarkdown } from '@/lib/courses/editorial-style';

dotenv.config({ path: path.join(__dirname, '../.env.local') });
dotenv.config();

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

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

async function main() {
  const execute = hasFlag('execute');
  const limit = Number(getArg('limit') ?? '0');
  const batchSize = Number(getArg('batch') ?? '200');
  const courseId = getArg('courseId');
  const moduleId = getArg('moduleId');

  const effectiveBatch = Number.isFinite(batchSize) && batchSize > 0 ? Math.min(batchSize, 500) : 200;
  const effectiveLimit = Number.isFinite(limit) && limit > 0 ? limit : 0;

  let offset = 0;
  let processed = 0;
  let updated = 0;
  let skipped = 0;
  const sampleChanges: Array<{ id: string; title: string; locales: string[] }> = [];

  console.log(`[FixModuleMarkdown] mode=${execute ? 'execute' : 'dry-run'} batch=${effectiveBatch} limit=${effectiveLimit || 'none'}`);

  while (true) {
    let query = supabase
      .from('course_modules')
      .select('id, course_id, order_index, title_en, title_es, content_en, content_es, created_at')
      .order('created_at', { ascending: true })
      .range(offset, offset + effectiveBatch - 1);

    if (courseId) query = query.eq('course_id', courseId);
    if (moduleId) query = query.eq('id', moduleId);

    const { data, error } = await query;
    if (error) {
      console.error('[FixModuleMarkdown] Error fetching modules:', error.message);
      process.exitCode = 1;
      return;
    }

    const rows = data ?? [];
    if (!rows.length) break;

    for (const row of rows) {
      if (effectiveLimit && processed >= effectiveLimit) break;
      processed += 1;

      const titleEn = String(row.title_en ?? '');
      const titleEs = String(row.title_es ?? '');
      const contentEn = String(row.content_en ?? '');
      const contentEs = String(row.content_es ?? '');

      const normalizedEn = contentEn
        ? normalizeEditorialMarkdown(contentEn, { title: titleEn, locale: 'en' })
        : contentEn;
      const normalizedEs = contentEs
        ? normalizeEditorialMarkdown(contentEs, { title: titleEs, locale: 'es' })
        : contentEs;

      const enChanged = normalizedEn.trim() !== contentEn.trim();
      const esChanged = normalizedEs.trim() !== contentEs.trim();

      if (!enChanged && !esChanged) {
        skipped += 1;
        continue;
      }

      if (sampleChanges.length < 12) {
        sampleChanges.push({
          id: String(row.id),
          title: titleEn || titleEs || String(row.id),
          locales: [enChanged ? 'en' : '', esChanged ? 'es' : ''].filter(Boolean),
        });
      }

      if (execute) {
        const payload: Record<string, string> = {};
        if (enChanged) payload.content_en = normalizedEn;
        if (esChanged) payload.content_es = normalizedEs;

        const { error: updateError } = await supabase.from('course_modules').update(payload).eq('id', row.id);
        if (updateError) {
          console.error(`[FixModuleMarkdown] Update failed for ${row.id}:`, updateError.message);
          continue;
        }
      }

      updated += 1;
    }

    if (effectiveLimit && processed >= effectiveLimit) break;
    offset += effectiveBatch;
  }

  console.log(`[FixModuleMarkdown] Processed: ${processed}`);
  console.log(`[FixModuleMarkdown] Updated: ${updated}`);
  console.log(`[FixModuleMarkdown] Unchanged: ${skipped}`);

  if (sampleChanges.length) {
    console.log('\nSample updates:');
    sampleChanges.forEach((item) => {
      console.log(`- ${item.id} (${item.locales.join(', ')}): ${item.title.slice(0, 60)}`);
    });
  }

  if (!execute) {
    console.log('\nDry-run mode: re-run with --execute to persist changes.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
