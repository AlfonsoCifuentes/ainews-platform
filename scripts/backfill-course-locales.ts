#!/usr/bin/env node
/**
 * Backfill bilingual course/module fields in Supabase.
 *
 * Fixes cases where `*_en` and `*_es` were saved identical (usually EN copied into ES)
 * by translating the missing side and normalizing markdown with the editorial pipeline.
 *
 * Usage:
 * - Dry run (default): `tsx scripts/backfill-course-locales.ts`
 * - Write changes:     `tsx scripts/backfill-course-locales.ts --write`
 * - Single course:     `tsx scripts/backfill-course-locales.ts --course=<uuid> --write`
 * - Limit courses:     `tsx scripts/backfill-course-locales.ts --limit=5 --write`
 */

import path from 'node:path';
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { normalizeEditorialMarkdown } from '@/lib/courses/editorial-style';
import { detectLanguage, translateMarkdown, translateText } from '@/lib/ai/translator';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

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
  order_index: number;
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
  global: { headers: { 'X-Client-Info': 'ThotNet-CourseLocaleBackfill' } },
});

const argv = process.argv.slice(2);
const isWrite = argv.includes('--write');
const courseFilter = getArgValue('course');
const limit = Math.max(1, parseInt(getArgValue('limit') ?? '250', 10));

function getArgValue(key: string): string | undefined {
  const prefix = `--${key}=`;
  const match = argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : undefined;
}

function normalizeMaybe(text: string | null | undefined): string {
  const value = String(text ?? '').trim();
  return value;
}

function looksDuplicated(a: string | null | undefined, b: string | null | undefined): boolean {
  const aa = normalizeMaybe(a);
  const bb = normalizeMaybe(b);
  return aa.length > 0 && aa === bb;
}

function missing(a: string | null | undefined): boolean {
  return !normalizeMaybe(a);
}

function guessLocaleFast(text: string): Locale | null {
  const sample = text.trim();
  if (!sample) return null;
  const lower = sample.toLowerCase();

  // Strong Spanish markers.
  if (/[¿¡]/.test(sample) || /\b(ñ)\b/i.test(sample)) return 'es';

  const esHits = (lower.match(/\b(módulo|introducción|capítulo|síntesis|conclusión|ejercicio|aprendizaje|tiempo|nivel)\b/gi) ?? []).length;
  const enHits = (lower.match(/\b(module|introduction|chapter|synthesis|conclusion|exercise|learning|time|level)\b/gi) ?? []).length;

  if (esHits >= 2 && esHits >= enHits + 1) return 'es';
  if (enHits >= 2 && enHits >= esHits + 1) return 'en';

  // Short strings: a single hit is often enough.
  if (sample.length <= 80) {
    if (esHits > enHits) return 'es';
    if (enHits > esHits) return 'en';
  }

  return null;
}

async function decideSourceLocale(text: string): Promise<Locale> {
  const sample = text.trim();
  if (!sample) return 'en';

  // For long bodies, rely on the translator's language detector.
  // Heuristics can be fooled by small bilingual fragments (e.g. "Idea ancla del módulo").
  if (sample.length >= 220) {
    try {
      return await detectLanguage(sample);
    } catch {
      return 'en';
    }
  }

  const fast = guessLocaleFast(sample);
  if (fast) return fast;

  try {
    return await detectLanguage(sample);
  } catch {
    return 'en';
  }
}

async function backfillCourseRow(course: CourseRow): Promise<{
  update: Partial<CourseRow> | null;
  sourceLocale: Locale;
}> {
  const titleEn = normalizeMaybe(course.title_en);
  const titleEs = normalizeMaybe(course.title_es);
  const descEn = normalizeMaybe(course.description_en);
  const descEs = normalizeMaybe(course.description_es);

  const reference = titleEn || titleEs || descEn || descEs;
  const sourceLocale = await decideSourceLocale(reference);
  const targetLocale: Locale = sourceLocale === 'en' ? 'es' : 'en';

  const update: Partial<CourseRow> = {};

  if (missing(titleEn) && titleEs) {
    update.title_en = await translateText(titleEs, 'es', 'en');
  } else if (missing(titleEs) && titleEn) {
    update.title_es = await translateText(titleEn, 'en', 'es');
  } else if (looksDuplicated(titleEn, titleEs) && titleEn) {
    if (sourceLocale === 'en') update.title_es = await translateText(titleEn, 'en', 'es');
    else update.title_en = await translateText(titleEs, 'es', 'en');
  }

  // Fix locale mismatches even when strings aren't byte-identical (common in older pipelines).
  if (!update.title_es && titleEn && titleEs && sourceLocale === 'en' && titleEs.length >= 14) {
    const detected = await decideSourceLocale(titleEs);
    if (detected === 'en') {
      update.title_es = await translateText(titleEn, 'en', 'es');
    }
  }
  if (!update.title_en && titleEn && titleEs && sourceLocale === 'es' && titleEn.length >= 14) {
    const detected = await decideSourceLocale(titleEn);
    if (detected === 'es') {
      update.title_en = await translateText(titleEs, 'es', 'en');
    }
  }

  if (missing(descEn) && descEs) {
    update.description_en = await translateText(descEs, 'es', 'en');
  } else if (missing(descEs) && descEn) {
    update.description_es = await translateText(descEn, 'en', 'es');
  } else if (looksDuplicated(descEn, descEs) && (descEn || descEs)) {
    const src = descEn || descEs;
    if (sourceLocale === 'en') update.description_es = await translateText(src, 'en', 'es');
    else update.description_en = await translateText(src, 'es', 'en');
  }

  if (!update.description_es && descEn && descEs && sourceLocale === 'en' && descEs.length >= 40) {
    const detected = await decideSourceLocale(descEs);
    if (detected === 'en') {
      update.description_es = await translateText(descEn, 'en', 'es');
    }
  }
  if (!update.description_en && descEn && descEs && sourceLocale === 'es' && descEn.length >= 40) {
    const detected = await decideSourceLocale(descEn);
    if (detected === 'es') {
      update.description_en = await translateText(descEs, 'es', 'en');
    }
  }

  const hasChanges = Object.keys(update).length > 0;
  return { update: hasChanges ? update : null, sourceLocale };
}

async function backfillModuleRow(moduleRow: ModuleRow, courseSourceLocale: Locale): Promise<{
  update: Partial<ModuleRow> | null;
}> {
  const titleEn = normalizeMaybe(moduleRow.title_en);
  const titleEs = normalizeMaybe(moduleRow.title_es);
  const contentEn = normalizeMaybe(moduleRow.content_en);
  const contentEs = normalizeMaybe(moduleRow.content_es);

  const reference = titleEn || titleEs || contentEn || contentEs;
  const detected = reference ? await decideSourceLocale(reference) : courseSourceLocale;
  const sourceLocale: Locale = detected ?? courseSourceLocale;
  const targetLocale: Locale = sourceLocale === 'en' ? 'es' : 'en';

  const update: Partial<ModuleRow> = {};

  const ensureNormalized = (text: string, locale: Locale, title: string) =>
    normalizeEditorialMarkdown(text, { title, locale });

  if (missing(titleEn) && titleEs) {
    update.title_en = await translateText(titleEs, 'es', 'en');
  } else if (missing(titleEs) && titleEn) {
    update.title_es = await translateText(titleEn, 'en', 'es');
  } else if (looksDuplicated(titleEn, titleEs) && (titleEn || titleEs)) {
    const src = titleEn || titleEs;
    if (sourceLocale === 'en') update.title_es = await translateText(src, 'en', 'es');
    else update.title_en = await translateText(src, 'es', 'en');
  }

  const resolvedTitleEn = normalizeMaybe(update.title_en ?? moduleRow.title_en) || titleEn || titleEs || 'Module';
  const resolvedTitleEs = normalizeMaybe(update.title_es ?? moduleRow.title_es) || titleEs || titleEn || 'Módulo';

  if (!update.title_es && titleEn && titleEs && sourceLocale === 'en' && titleEs.length >= 14) {
    const detected = await decideSourceLocale(titleEs);
    if (detected === 'en') {
      update.title_es = await translateText(titleEn, 'en', 'es');
    }
  }
  if (!update.title_en && titleEn && titleEs && sourceLocale === 'es' && titleEn.length >= 14) {
    const detected = await decideSourceLocale(titleEn);
    if (detected === 'es') {
      update.title_en = await translateText(titleEs, 'es', 'en');
    }
  }

  if (missing(contentEn) && contentEs) {
    const translated = await translateMarkdown(contentEs, 'es', 'en');
    update.content_en = ensureNormalized(translated, 'en', resolvedTitleEn);
  } else if (missing(contentEs) && contentEn) {
    const translated = await translateMarkdown(contentEn, 'en', 'es');
    update.content_es = ensureNormalized(translated, 'es', resolvedTitleEs);
  } else if (looksDuplicated(contentEn, contentEs) && (contentEn || contentEs)) {
    const src = contentEn || contentEs;
    if (sourceLocale === 'en') {
      const translated = await translateMarkdown(src, 'en', 'es');
      update.content_es = ensureNormalized(translated, 'es', resolvedTitleEs);
      update.content_en = ensureNormalized(src, 'en', resolvedTitleEn);
    } else {
      const translated = await translateMarkdown(src, 'es', 'en');
      update.content_en = ensureNormalized(translated, 'en', resolvedTitleEn);
      update.content_es = ensureNormalized(src, 'es', resolvedTitleEs);
    }
  }

  // If content exists but is in the wrong language, retranslate from the source side.
  const sampleMinChars = 240;
  if (!update.content_es && sourceLocale === 'en' && contentEn && contentEs && contentEs.length >= sampleMinChars) {
    const detected = await decideSourceLocale(contentEs.slice(0, 800));
    if (detected === 'en') {
      const translated = await translateMarkdown(contentEn, 'en', 'es');
      update.content_es = ensureNormalized(translated, 'es', resolvedTitleEs);
      update.content_en = ensureNormalized(contentEn, 'en', resolvedTitleEn);
    }
  }
  if (!update.content_en && sourceLocale === 'es' && contentEn && contentEs && contentEn.length >= sampleMinChars) {
    const detected = await decideSourceLocale(contentEn.slice(0, 800));
    if (detected === 'es') {
      const translated = await translateMarkdown(contentEs, 'es', 'en');
      update.content_en = ensureNormalized(translated, 'en', resolvedTitleEn);
      update.content_es = ensureNormalized(contentEs, 'es', resolvedTitleEs);
    }
  }

  const hasChanges = Object.keys(update).length > 0;
  return { update: hasChanges ? update : null };
}

async function fetchCoursesPage(from: number, to: number): Promise<CourseRow[]> {
  let query = supabase
    .from('courses')
    .select('id,title_en,title_es,description_en,description_es')
    .order('created_at', { ascending: false })
    .range(from, to);

  if (courseFilter) {
    query = query.eq('id', courseFilter);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as CourseRow[];
}

async function fetchModules(courseId: string): Promise<ModuleRow[]> {
  const { data, error } = await supabase
    .from('course_modules')
    .select('id,course_id,order_index,title_en,title_es,content_en,content_es')
    .eq('course_id', courseId)
    .order('order_index', { ascending: true });

  if (error) throw error;
  return (data ?? []) as ModuleRow[];
}

async function main() {
  console.log(`🔎 Backfill course locales (${isWrite ? 'WRITE' : 'DRY RUN'})`);
  if (courseFilter) console.log(`- Course filter: ${courseFilter}`);
  console.log(`- Limit: ${limit}`);

  const pageSize = 50;
  let scanned = 0;
  let fixedCourses = 0;
  let fixedModules = 0;

  for (let offset = 0; offset < limit; offset += pageSize) {
    const page = await fetchCoursesPage(offset, Math.min(offset + pageSize - 1, limit - 1));
    if (!page.length) break;

    for (const course of page) {
      scanned += 1;

      const needsCourse =
        missing(course.title_en) ||
        missing(course.title_es) ||
        looksDuplicated(course.title_en, course.title_es) ||
        missing(course.description_en) ||
        missing(course.description_es) ||
        looksDuplicated(course.description_en, course.description_es);

      // Always inspect modules when the course looks suspicious or when any module is duplicated.
      const modules = await fetchModules(course.id);
      const duplicatedModule = modules.some(
        (m) =>
          missing(m.title_en) ||
          missing(m.title_es) ||
          looksDuplicated(m.title_en, m.title_es) ||
          missing(m.content_en) ||
          missing(m.content_es) ||
          looksDuplicated(m.content_en, m.content_es)
      );

      if (!needsCourse && !duplicatedModule) continue;

      const { update: courseUpdate, sourceLocale } = await backfillCourseRow(course);

      if (courseUpdate) {
        fixedCourses += 1;
        console.log(`\n📚 Course ${course.id}`);
        console.log(`- Source locale: ${sourceLocale}`);
        console.log(`- Course changes:`, Object.keys(courseUpdate));

        if (isWrite) {
          const { error } = await supabase.from('courses').update(courseUpdate).eq('id', course.id);
          if (error) throw error;
        }
      }

      for (const moduleRow of modules) {
        const { update: moduleUpdate } = await backfillModuleRow(moduleRow, sourceLocale);
        if (!moduleUpdate) continue;

        fixedModules += 1;
        console.log(`  🧩 Module ${moduleRow.order_index + 1} (${moduleRow.id}) -> ${Object.keys(moduleUpdate).join(', ')}`);

        if (isWrite) {
          const { error } = await supabase.from('course_modules').update(moduleUpdate).eq('id', moduleRow.id);
          if (error) throw error;
        }
      }
    }
  }

  console.log('\n✅ Done');
  console.log(`- Courses scanned: ${scanned}`);
  console.log(`- Courses updated: ${fixedCourses}`);
  console.log(`- Modules updated: ${fixedModules}`);

  if (!isWrite) {
    console.log('\nℹ️ Dry run: re-run with --write to persist changes.');
  }
}

main().catch((err) => {
  console.error('❌ Backfill failed:', err);
  process.exit(1);
});
