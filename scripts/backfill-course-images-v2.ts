#!/usr/bin/env tsx
/**
 * Backfill course cover + module illustrations using the same generator that runs on course creation.
 *
 * It focuses on:
 * - Shared course covers (EN/ES)
 * - Module conceptual images (shared across locales)
 * - Module diagrams (locale-specific)
 *
 * Usage:
 * - All courses (limit 5): `tsx scripts/backfill-course-images-v2.ts --limit=5`
 * - Single course:        `tsx scripts/backfill-course-images-v2.ts --course=<uuid>`
 * - Dry run (no writes):  `tsx scripts/backfill-course-images-v2.ts --dry-run`
 */

import path from 'node:path';
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { generateCourseImages } from '@/lib/ai/course-image-generator';

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
  global: { headers: { 'X-Client-Info': 'ThotNet-CourseImagesBackfillV2' } },
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

function pickCourseLocale(course: CourseRow): Locale {
  // Use EN as a stable canonical locale for shared (non-text) assets.
  if (course.title_en?.trim()) return 'en';
  return 'es';
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
    .select('id, order_index, title_en, title_es, content_en, content_es')
    .eq('course_id', courseId)
    .order('order_index', { ascending: true });

  if (error) throw error;
  return (data ?? []) as ModuleRow[];
}

async function countMissingAssets(moduleIds: string[]) {
  if (!moduleIds.length) return { conceptualMissing: 0, diagramMissing: 0 };

  const { data, error } = await supabase
    .from('module_illustrations')
    .select('module_id, locale, style')
    .in('module_id', moduleIds)
    .in('style', ['conceptual', 'diagram']);

  if (error) throw error;
  const rows = (data ?? []) as Array<{ module_id: string; locale: Locale; style: string }>;

  const conceptualByModule = new Set(rows.filter((r) => r.style === 'conceptual').map((r) => r.module_id));
  const diagramByModuleLocale = new Set(rows.filter((r) => r.style === 'diagram').map((r) => `${r.module_id}:${r.locale}`));

  let conceptualMissing = 0;
  let diagramMissing = 0;

  for (const moduleId of moduleIds) {
    if (!conceptualByModule.has(moduleId)) conceptualMissing += 1;
    if (!diagramByModuleLocale.has(`${moduleId}:en`)) diagramMissing += 1;
    if (!diagramByModuleLocale.has(`${moduleId}:es`)) diagramMissing += 1;
  }

  return { conceptualMissing, diagramMissing };
}

async function main() {
  console.log('🧩 Backfill course images (v2)');
  console.log(`- Mode: ${dryRun ? 'DRY RUN' : 'WRITE'}`);
  console.log(`- Course filter: ${courseFilter ?? 'None'}`);
  console.log(`- Limit: ${courseFilter ? 'N/A' : limit}`);

  const courses = await fetchCourses();
  console.log(`- Courses selected: ${courses.length}`);

  for (const course of courses) {
    const locale = pickCourseLocale(course);
    const title = (locale === 'en' ? course.title_en : course.title_es) ?? course.title_en ?? course.title_es ?? course.id;
    const description =
      (locale === 'en' ? course.description_en : course.description_es) ?? course.description_en ?? course.description_es ?? undefined;

    const modules = await fetchModules(course.id);
    const moduleIds = modules.map((m) => m.id);

    const missing = await countMissingAssets(moduleIds);
    console.log(`\n📘 ${title}`);
    console.log(`- course_id: ${course.id}`);
    console.log(`- modules: ${modules.length}`);
    console.log(`- missing conceptual (shared): ${missing.conceptualMissing}`);
    console.log(`- missing diagrams (en+es): ${missing.diagramMissing}`);

    if (dryRun) continue;

    const inputModules = modules.map((m) => ({
      id: m.id,
      title: (m.title_en ?? m.title_es ?? '').trim() || `Module ${m.order_index + 1}`,
      content: (m.content_en ?? m.content_es ?? '').trim(),
    }));

    const result = await generateCourseImages(
      {
        courseId: course.id,
        title: String(title),
        description: typeof description === 'string' ? description : undefined,
        locale,
        modules: inputModules,
      },
      { useLLMPlan: false }
    );

    if (result.errors.length) {
      console.warn(`⚠️  ${course.id} completed with warnings (${result.errors.length}).`);
    } else {
      console.log(`✅ ${course.id} images ok (new: ${result.modulesGenerated}).`);
    }
  }
}

main().catch((err) => {
  console.error('❌ Backfill failed:', err);
  process.exit(1);
});

