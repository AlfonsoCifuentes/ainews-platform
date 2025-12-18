#!/usr/bin/env node
/**
 * Repair/normalize course module markdown in Supabase.
 *
 * - Applies deterministic `normalizeEditorialMarkdown` to content_en/content_es.
 * - Updates only when the normalized output differs (trimmed).
 *
 * Usage:
 * - Dry run (default): `npx tsx scripts/repair-course-modules.ts --course <courseId>`
 * - Write changes:     `npx tsx scripts/repair-course-modules.ts --course <courseId> --write`
 * - All courses:       `npx tsx scripts/repair-course-modules.ts --all --write`
 */

import { config as loadEnv } from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';

const envLocal = resolve(process.cwd(), '.env.local');
if (existsSync(envLocal)) {
  loadEnv({ path: envLocal });
} else {
  loadEnv();
}

import { getSupabaseServerClient } from '../lib/db/supabase';
import { normalizeEditorialMarkdown } from '../lib/courses/editorial-style';

type Args = {
  courseId?: string;
  all?: boolean;
  write?: boolean;
};

function parseArgs(argv: string[]): Args {
  const args: Args = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === '--course') {
      args.courseId = argv[i + 1];
      i += 1;
      continue;
    }
    if (token === '--all') {
      args.all = true;
      continue;
    }
    if (token === '--write') {
      args.write = true;
      continue;
    }
  }
  return args;
}

function normalizeField(value: unknown, title: string, locale: 'en' | 'es'): string {
  const text = typeof value === 'string' ? value : '';
  return normalizeEditorialMarkdown(text, { title, locale });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.all && !args.courseId) {
    console.error('Missing target. Use --course <id> or --all.');
    process.exit(1);
  }

  const db = getSupabaseServerClient();
  const write = Boolean(args.write);

  console.log(`[repair-course-modules] mode=${write ? 'WRITE' : 'DRY_RUN'}`);
  if (args.courseId) console.log(`[repair-course-modules] course=${args.courseId}`);
  if (args.all) console.log('[repair-course-modules] target=ALL_COURSES');

  let query = db
    .from('course_modules')
    .select('id, course_id, order_index, title_en, title_es, content_en, content_es')
    .order('course_id', { ascending: true })
    .order('order_index', { ascending: true });

  if (args.courseId) {
    query = query.eq('course_id', args.courseId);
  }

  const { data: modules, error } = await query;
  if (error) {
    console.error('[repair-course-modules] Failed to fetch modules:', error.message);
    process.exit(1);
  }

  console.log(`[repair-course-modules] modules=${modules?.length ?? 0}`);

  let updated = 0;
  let examined = 0;

  for (const module of modules ?? []) {
    examined += 1;

    const titleEn = typeof module.title_en === 'string' && module.title_en.trim() ? module.title_en : 'Module';
    const titleEs = typeof module.title_es === 'string' && module.title_es.trim() ? module.title_es : 'Módulo';

    const originalEn = typeof module.content_en === 'string' ? module.content_en : '';
    const originalEs = typeof module.content_es === 'string' ? module.content_es : '';

    const normalizedEn = normalizeField(originalEn, titleEn, 'en');
    const normalizedEs = normalizeField(originalEs, titleEs, 'es');

    const updates: Record<string, string> = {};
    if (normalizedEn.trim() !== originalEn.trim()) updates.content_en = normalizedEn;
    if (normalizedEs.trim() !== originalEs.trim()) updates.content_es = normalizedEs;

    if (!Object.keys(updates).length) continue;

    const label = `${module.course_id}#${module.order_index} (${module.id})`;
    console.log(`[repair-course-modules] changed: ${label} -> ${Object.keys(updates).join(', ')}`);

    if (write) {
      const { error: updateError } = await db
        .from('course_modules')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', module.id);

      if (updateError) {
        console.error(`[repair-course-modules] update failed: ${label}:`, updateError.message);
        process.exitCode = 1;
        continue;
      }
      updated += 1;
    }
  }

  console.log(`[repair-course-modules] examined=${examined} updated=${updated}`);
  if (!write) {
    console.log('[repair-course-modules] Dry run complete. Re-run with --write to persist changes.');
  }
}

main().catch((err) => {
  console.error('[repair-course-modules] Fatal error:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});

