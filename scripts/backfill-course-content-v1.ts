#!/usr/bin/env tsx
/**
 * Backfill course module content:
 * - Re-normalize markdown with the latest editorial normalization
 * - Fix missing/duplicated translations (EN==ES) using translator fallback (Google -> OpenAI)
 *
 * Usage:
 * - Limit latest courses: `tsx scripts/backfill-course-content-v1.ts --limit=10`
 * - Single course:       `tsx scripts/backfill-course-content-v1.ts --course=<uuid>`
 * - Dry run:             `tsx scripts/backfill-course-content-v1.ts --dry-run`
 */

import path from 'node:path';
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { normalizeEditorialMarkdown } from '@/lib/courses/editorial-style';
import { detectLanguage, translateMarkdown, translateText } from '@/lib/ai/translator';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

type Locale = 'en' | 'es';

type CourseRow = {
  id: string;
  title_en: string | null;
  title_es: string | null;
  description_en: string | null;
  description_es: string | null;
};

type ModuleRow = {
  id: string;
  course_id: string;
  order_index: number | null;
  title_en: string | null;
  title_es: string | null;
  content_en: string | null;
  content_es: string | null;
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
  global: { headers: { 'X-Client-Info': 'ThotNet-CourseContentBackfillV1' } },
});

const argv = process.argv.slice(2);
const courseFilter = getArgValue('course');
const limit = Math.max(1, parseInt(getArgValue('limit') ?? '10', 10));
const dryRun = argv.includes('--dry-run');

function getArgValue(key: string): string | undefined {
  const prefix = `--${key}=`;
  const match = argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : undefined;
}

function collapseWs(text: string): string {
  return String(text ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\s+/g, ' ').trim();
}

function isLikelyDuplicatedTranslation(en: string, es: string): boolean {
  const a = collapseWs(en);
  const b = collapseWs(es);
  if (!a || !b) return false;
  if (a === b) return true;
  // Very high overlap often indicates "translation failed, duplicated content".
  if (a.length >= 240 && b.length >= 240) {
    const aWords = new Set(a.toLowerCase().split(' ').filter(Boolean));
    const bWords = new Set(b.toLowerCase().split(' ').filter(Boolean));
    const intersection = [...aWords].filter((w) => bWords.has(w)).length;
    const overlap = intersection / Math.max(1, Math.min(aWords.size, bWords.size));
    return overlap >= 0.94;
  }
  return false;
}

async function fetchCourses(): Promise<CourseRow[]> {
  let query = supabase
    .from('courses')
    .select('id, title_en, title_es, description_en, description_es')
    .order('created_at', { ascending: false });

  if (courseFilter) {
    query = query.eq('id', courseFilter);
  } else {
    query = query.limit(limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as CourseRow[];
}

async function fetchModules(courseId: string): Promise<ModuleRow[]> {
  const { data, error } = await supabase
    .from('course_modules')
    .select('id, course_id, order_index, title_en, title_es, content_en, content_es')
    .eq('course_id', courseId)
    .order('order_index', { ascending: true });

  if (error) throw error;
  return (data ?? []) as ModuleRow[];
}

async function maybeBackfillCourseTranslations(course: CourseRow) {
  const titleEn = (course.title_en ?? '').trim();
  const titleEs = (course.title_es ?? '').trim();
  const descEn = (course.description_en ?? '').trim();
  const descEs = (course.description_es ?? '').trim();

  const patch: Partial<CourseRow> = {};

  if (titleEn && !titleEs) {
    patch.title_es = await translateText(titleEn, 'en', 'es');
  } else if (titleEs && !titleEn) {
    patch.title_en = await translateText(titleEs, 'es', 'en');
  }

  if (descEn && !descEs) {
    patch.description_es = await translateText(descEn, 'en', 'es');
  } else if (descEs && !descEn) {
    patch.description_en = await translateText(descEs, 'es', 'en');
  }

  if (!Object.keys(patch).length) return;

  console.log(`  - Course translations: ${Object.keys(patch).join(', ')}`);
  if (dryRun) return;

  const { error } = await supabase.from('courses').update(patch).eq('id', course.id);
  if (error) throw error;
}

async function maybeFixModule(moduleRow: ModuleRow) {
  const titleEn = (moduleRow.title_en ?? '').trim();
  const titleEs = (moduleRow.title_es ?? '').trim();
  const contentEnRaw = String(moduleRow.content_en ?? '');
  const contentEsRaw = String(moduleRow.content_es ?? '');

  let contentEn = contentEnRaw;
  let contentEs = contentEsRaw;

  // If one locale is missing or clearly duplicated, re-translate from the detected source language.
  const duplicated = isLikelyDuplicatedTranslation(contentEnRaw, contentEsRaw);
  const missingEn = !contentEnRaw.trim();
  const missingEs = !contentEsRaw.trim();

  if (duplicated || missingEn || missingEs) {
    const sourceText = (contentEnRaw.trim() || contentEsRaw.trim());
    if (sourceText) {
      const detected = await detectLanguage(sourceText);
      const from = detected;
      const to: Locale = detected === 'es' ? 'en' : 'es';

      console.log(`  - Module ${moduleRow.id} translation fix: detected=${from}, generating ${to}...`);

      const translated = await translateMarkdown(sourceText, from, to);
      if (to === 'en') contentEn = translated;
      else contentEs = translated;

      // Titles: fill missing title for the translated locale if needed.
      if (to === 'en' && !titleEn && titleEs) {
        const nextTitle = await translateText(titleEs, 'es', 'en');
        moduleRow.title_en = nextTitle;
      }
      if (to === 'es' && !titleEs && titleEn) {
        const nextTitle = await translateText(titleEn, 'en', 'es');
        moduleRow.title_es = nextTitle;
      }
    }
  }

  const normalizedEn = normalizeEditorialMarkdown(contentEn, {
    title: (moduleRow.title_en ?? titleEn ?? titleEs ?? 'Module').trim(),
    locale: 'en',
  });
  const normalizedEs = normalizeEditorialMarkdown(contentEs, {
    title: (moduleRow.title_es ?? titleEs ?? titleEn ?? 'Módulo').trim(),
    locale: 'es',
  });

  const patch: Partial<ModuleRow> = {};

  if (moduleRow.title_en && moduleRow.title_en !== titleEn) patch.title_en = moduleRow.title_en;
  if (moduleRow.title_es && moduleRow.title_es !== titleEs) patch.title_es = moduleRow.title_es;

  if (normalizedEn.trim() && normalizedEn !== contentEnRaw) patch.content_en = normalizedEn;
  if (normalizedEs.trim() && normalizedEs !== contentEsRaw) patch.content_es = normalizedEs;

  if (!Object.keys(patch).length) return false;

  console.log(`  - Module ${moduleRow.order_index ?? 0}: update ${Object.keys(patch).join(', ')}`);
  if (dryRun) return true;

  const { error } = await supabase.from('course_modules').update(patch).eq('id', moduleRow.id);
  if (error) throw error;
  return true;
}

async function main() {
  console.log('📚 Backfill course content (v1)');
  console.log(`- Mode: ${dryRun ? 'DRY RUN' : 'WRITE'}`);
  console.log(`- Course filter: ${courseFilter ?? 'None'}`);
  console.log(`- Limit: ${courseFilter ? 'N/A' : limit}`);

  const courses = await fetchCourses();
  console.log(`- Courses selected: ${courses.length}`);

  for (const course of courses) {
    const title = (course.title_en ?? course.title_es ?? course.id).trim();
    console.log(`\n🧩 ${title}`);
    console.log(`- course_id: ${course.id}`);

    await maybeBackfillCourseTranslations(course);

    const modules = await fetchModules(course.id);
    let changed = 0;

    for (const moduleRow of modules) {
      const didChange = await maybeFixModule(moduleRow);
      if (didChange) changed += 1;
    }

    console.log(`- Modules updated: ${changed}/${modules.length}`);
  }
}

main().catch((err) => {
  console.error('❌ Backfill failed:', err);
  process.exit(1);
});

