#!/usr/bin/env tsx
/**
 * Regenerate short/low-quality course content in-place using the canonical GPT-4o generator.
 *
 * Usage:
 * - Dry run (recommended): `tsx scripts/repair-course-content-v2.ts --course=<uuid>`
 * - Write changes:         `tsx scripts/repair-course-content-v2.ts --course=<uuid> --write`
 * - Force locale:          `tsx scripts/repair-course-content-v2.ts --course=<uuid> --locale=es`
 *
 * Notes:
 * - Updates existing `courses` + `course_modules` rows (keeps IDs).
 * - Replaces module content + resources with fresh textbook-quality generation.
 */

import path from 'node:path';
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { normalizeEditorialMarkdown } from '@/lib/courses/editorial-style';
import { __internal } from '@/app/api/courses/generate-full/route';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

type Locale = 'en' | 'es';
type Duration = 'short' | 'medium' | 'long';

type CourseRow = {
  id: string;
  topics: string[] | null;
  category: string | null;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | null;
  title_en: string | null;
  title_es: string | null;
  description_en: string | null;
  description_es: string | null;
};

type ModuleRow = {
  id: string;
  course_id: string;
  order_index: number;
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

if (!process.env.OPENAI_API_KEY) {
  console.error('❌ Missing OPENAI_API_KEY (required to regenerate textbook-quality content)');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
  global: { headers: { 'X-Client-Info': 'ThotNet-RepairCourseContentV2' } },
});

const argv = process.argv.slice(2);
const courseId = getArgValue('course');
const write = argv.includes('--write');
const primaryLocale = (getArgValue('locale') as Locale | undefined) ?? 'es';

function getArgValue(key: string): string | undefined {
  const prefix = `--${key}=`;
  const match = argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : undefined;
}

function wordCount(text: string): number {
  return String(text ?? '').trim().split(/\s+/).filter(Boolean).length;
}

function resolveDurationFromModuleCount(count: number): Duration {
  if (count <= 3) return 'short';
  if (count <= 5) return 'medium';
  return 'long';
}

function pickTopic(course: CourseRow): string {
  const fromTopics = (course.topics ?? []).find((t) => String(t).trim().length > 0);
  const fallback =
    fromTopics ||
    (course.category ?? '').trim() ||
    (course.title_es ?? '').trim() ||
    (course.title_en ?? '').trim();
  return fallback || 'AI course';
}

async function fetchCourse(id: string): Promise<CourseRow> {
  const { data, error } = await supabase
    .from('courses')
    .select('id, topics, category, difficulty, title_en, title_es, description_en, description_es')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as CourseRow;
}

async function fetchModules(id: string): Promise<ModuleRow[]> {
  const { data, error } = await supabase
    .from('course_modules')
    .select('id, course_id, order_index')
    .eq('course_id', id)
    .order('order_index', { ascending: true });
  if (error) throw error;
  return (data ?? []) as ModuleRow[];
}

async function main() {
  if (!courseId) {
    console.error('Usage: tsx scripts/repair-course-content-v2.ts --course=<uuid> [--write] [--locale=es|en]');
    process.exit(1);
  }

  console.log('🧩 Repair course content (v2)');
  console.log(`- Mode: ${write ? 'WRITE' : 'DRY RUN'}`);
  console.log(`- course_id: ${courseId}`);
  console.log(`- primary locale: ${primaryLocale}`);

  const course = await fetchCourse(courseId);
  const modules = await fetchModules(courseId);
  const duration = resolveDurationFromModuleCount(modules.length);
  const difficulty = (course.difficulty ?? 'beginner') as 'beginner' | 'intermediate' | 'advanced';
  const topic = pickTopic(course);

  console.log(`- topic: ${topic}`);
  console.log(`- difficulty: ${difficulty}`);
  console.log(`- duration: ${duration} (${modules.length} modules)`);

  const courseData = await __internal.generateCourseWithGPT4o({
    topic,
    difficulty,
    duration,
    locale: primaryLocale,
    quality: 'textbook',
  });

  const courseByLocale = await __internal.buildCourseByLocale(courseData, primaryLocale);
  const courseEn = courseByLocale.en;
  const courseEs = courseByLocale.es;

  if (courseEn.modules.length !== modules.length || courseEs.modules.length !== modules.length) {
    throw new Error(
      `Generated modules mismatch: existing=${modules.length}, en=${courseEn.modules.length}, es=${courseEs.modules.length}`
    );
  }

  const coursePatch = {
    title_en: courseEn.title,
    title_es: courseEs.title,
    description_en: courseEn.description,
    description_es: courseEs.description,
  };

  console.log(`- Course patch: ${Object.keys(coursePatch).join(', ')}`);

  if (!write) {
    console.log('  (dry run) not updating courses row');
  } else {
    const { error } = await supabase.from('courses').update(coursePatch).eq('id', courseId);
    if (error) throw error;
  }

  for (let i = 0; i < modules.length; i += 1) {
    const moduleRow = modules[i];
    const modEn = courseEn.modules[i];
    const modEs = courseEs.modules[i];

    const normalizedEn = normalizeEditorialMarkdown(modEn.content, {
      title: modEn.title,
      standfirst: modEn.description,
      locale: 'en',
    });
    const normalizedEs = normalizeEditorialMarkdown(modEs.content, {
      title: modEs.title,
      standfirst: modEs.description,
      locale: 'es',
    });

    const resourcesBase = (primaryLocale === 'es' ? modEs : modEn);

    const modulePatch = {
      title_en: modEn.title,
      title_es: modEs.title,
      content_en: normalizedEn,
      content_es: normalizedEs,
      estimated_time: resourcesBase.estimatedMinutes,
      resources: {
        takeaways: resourcesBase.keyTakeaways,
        quiz: resourcesBase.quiz,
        links: resourcesBase.resources,
      },
    };

    console.log(
      `\n- Module ${i + 1}/${modules.length} (order_index=${moduleRow.order_index})` +
        `\n  id: ${moduleRow.id}` +
        `\n  words_es: ${wordCount(normalizedEs).toLocaleString()}` +
        `\n  words_en: ${wordCount(normalizedEn).toLocaleString()}`
    );

    if (!write) {
      console.log('  (dry run) not updating course_modules row');
      continue;
    }

    const { error } = await supabase.from('course_modules').update(modulePatch).eq('id', moduleRow.id);
    if (error) throw error;
  }

  console.log('\n✅ Done');
}

main().catch((err) => {
  console.error('❌ Repair failed:', err);
  process.exit(1);
});

