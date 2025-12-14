#!/usr/bin/env tsx
/**
 * Backfill missing course covers.
 *
 * Generates and persists real AI covers ONLY for courses that currently have no cover.
 * Default behavior is safe:
 * - Dry-run (no writes)
 * - Skips courses that already have ANY cover row
 * - Skips courses that already have `thumbnail_url`
 *
 * Usage:
 *   tsx scripts/backfill-missing-course-covers.ts --dry-run
 *   tsx scripts/backfill-missing-course-covers.ts --execute --locale both
 *   tsx scripts/backfill-missing-course-covers.ts --execute --locale en --limit 10
 *   tsx scripts/backfill-missing-course-covers.ts --execute --include-partial
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local explicitly
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

import pLimit from 'p-limit';
import { createClient } from '@supabase/supabase-js';
import { generateIllustrationWithCascade, type ImageProviderName } from '@/lib/ai/image-cascade';
import { copyCourseCoverLocale, persistCourseCover, persistCourseCoverShared } from '@/lib/db/course-covers';

type Locale = 'en' | 'es';

type Args = {
  dryRun: boolean;
  locale: 'en' | 'es' | 'both';
  includePartial: boolean;
  limit: number;
  batchSize: number;
  concurrency: number;
};

type CourseRow = {
  id: string;
  title_en: string;
  title_es: string;
  description_en: string | null;
  description_es: string | null;
  // Some deployments may not have this column yet.
  thumbnail_url?: string | null;
};

type CoverIndex = Map<string, Set<Locale>>;

type Candidate = {
  course: CourseRow;
  localesNeeded: Locale[];
};

const GENERAL_ORDER: ImageProviderName[] = ['runware', 'huggingface', 'qwen'];

function formatUnknownError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (!error) return String(error);
  if (typeof error === 'string') return error;
  if (typeof error === 'object') {
    const rec = error as Record<string, unknown>;
    const msg = rec.message;
    if (typeof msg === 'string' && msg.trim()) return msg;
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }
  return String(error);
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    dryRun: true,
    locale: 'both',
    includePartial: false,
    limit: 0,
    batchSize: 200,
    concurrency: 2,
  };

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];

    // NOTE: Prefer --write because some runners/tools may treat --execute as their own flag.
    if (token === '--execute' || token === '--write' || token === '--apply') {
      args.dryRun = false;
      continue;
    }

    if (token === '--dry-run') {
      args.dryRun = true;
      continue;
    }

    if (token === '--include-partial') {
      args.includePartial = true;
      continue;
    }

    if (token === '--locale') {
      const value = argv[i + 1];
      i++;
      if (value !== 'en' && value !== 'es' && value !== 'both') {
        throw new Error(`Invalid --locale: ${value}. Use en|es|both.`);
      }
      args.locale = value;
      continue;
    }

    if (token === '--limit') {
      const value = Number(argv[i + 1]);
      i++;
      if (!Number.isFinite(value) || value < 0) throw new Error(`Invalid --limit: ${argv[i]}`);
      args.limit = value;
      continue;
    }

    if (token === '--batch-size') {
      const value = Number(argv[i + 1]);
      i++;
      if (!Number.isFinite(value) || value < 1 || value > 1000) throw new Error(`Invalid --batch-size: ${argv[i]}`);
      args.batchSize = value;
      continue;
    }

    if (token === '--concurrency') {
      const value = Number(argv[i + 1]);
      i++;
      if (!Number.isFinite(value) || value < 1 || value > 10) throw new Error(`Invalid --concurrency: ${argv[i]}`);
      args.concurrency = value;
      continue;
    }

    if (token === '--help' || token === '-h') {
      printHelp();
      process.exit(0);
    }

    throw new Error(`Unknown argument: ${token}`);
  }

  return args;
}

function printHelp() {
  console.log(`\nBackfill missing course covers\n\n` +
    `Options:\n` +
    `  --dry-run            List candidates only (default)\n` +
    `  --write              Generate + persist covers (recommended)\n` +
    `  --execute            Alias for --write\n` +
    `  --locale <en|es|both> Locales to generate (default: both)\n` +
    `  --include-partial    Also generate missing locales when another locale cover exists\n` +
    `  --limit <n>          Max number of courses to process (0 = no limit)\n` +
    `  --batch-size <n>     Supabase pagination size (default: 200)\n` +
    `  --concurrency <n>    Parallel courses (default: 2)\n`);
}

function getSupabase() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) {
    throw new Error('Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient(url, serviceRole, { auth: { persistSession: false } });
}

function hasThumbnail(course: CourseRow): boolean {
  return typeof course.thumbnail_url === 'string' && course.thumbnail_url.trim().length > 0;
}

function pickField(course: CourseRow, locale: Locale, field: 'title' | 'description'): string {
  if (field === 'title') {
    const primary = locale === 'en' ? course.title_en : course.title_es;
    const fallback = locale === 'en' ? course.title_es : course.title_en;
    return (primary || fallback || 'Untitled course').trim();
  }

  const primary = locale === 'en' ? course.description_en : course.description_es;
  const fallback = locale === 'en' ? course.description_es : course.description_en;
  return (primary || fallback || '').trim();
}

function buildCoverPrompt(course: CourseRow, locale: Locale): string {
  const title = pickField(course, locale, 'title');
  const desc = pickField(course, locale, 'description');

  const lang = locale === 'en' ? 'English' : 'Spanish';
  const mood = locale === 'en'
    ? 'modern, premium, cinematic lighting, dark UI-friendly background, high contrast'
    : 'moderno, premium, iluminación cinematográfica, fondo oscuro compatible con UI, alto contraste';

  const noText = locale === 'en'
    ? 'NO TEXT, NO LETTERS, NO NUMBERS, NO LOGOS, NO WATERMARKS'
    : 'SIN TEXTO, SIN LETRAS, SIN NÚMEROS, SIN LOGOS, SIN MARCAS DE AGUA';

  const subject = desc
    ? `${title}. Concept: ${desc}`
    : title;

  return `Course cover illustration for: ${subject}. ` +
    `${mood}. Educational-tech vibe. Clean composition. ${noText}. ` +
    `Avoid typography and UI elements; focus on symbolic visual metaphors.`;
}

async function fetchCoverIndex(client: ReturnType<typeof getSupabase>, batchSize: number): Promise<CoverIndex> {
  const index: CoverIndex = new Map();
  let from = 0;

  while (true) {
    const to = from + batchSize - 1;
    const { data, error } = await client
      .from('course_covers')
      .select('course_id,locale')
      .order('course_id', { ascending: true })
      .range(from, to);

    if (error) throw error;

    const rows = (data ?? []) as Array<{ course_id: string; locale: string }>;
    for (const row of rows) {
      const loc = row.locale === 'en' ? 'en' : row.locale === 'es' ? 'es' : null;
      if (!loc) continue;
      const set = index.get(row.course_id) ?? new Set<Locale>();
      set.add(loc);
      index.set(row.course_id, set);
    }

    if (rows.length < batchSize) break;
    from += batchSize;
  }

  return index;
}

async function fetchCandidates(client: ReturnType<typeof getSupabase>, args: Args, coverIndex: CoverIndex): Promise<Candidate[]> {
  const candidates: Candidate[] = [];
  const requestedLocales: Locale[] = args.locale === 'both' ? ['en', 'es'] : [args.locale];

  let supportsThumbnailColumn: boolean | null = null;

  let from = 0;
  while (true) {
    const to = from + args.batchSize - 1;
    const baseSelect = 'id,title_en,title_es,description_en,description_es';
    const selectWithThumb = `${baseSelect},thumbnail_url`;

    let data: unknown = null;
    let error: unknown = null;

    if (supportsThumbnailColumn !== false) {
      const res = await client
        .from('courses')
        .select(selectWithThumb)
        .order('id', { ascending: true })
        .range(from, to);
      data = res.data;
      error = res.error;

      if (res.error) {
        const msg = formatUnknownError(res.error);
        if (/thumbnail_url/i.test(msg) && /does not exist/i.test(msg)) {
          supportsThumbnailColumn = false;
          error = null;
          data = null;
        } else {
          throw res.error;
        }
      } else {
        supportsThumbnailColumn = true;
      }
    }

    if (supportsThumbnailColumn === false) {
      const res = await client
        .from('courses')
        .select(baseSelect)
        .order('id', { ascending: true })
        .range(from, to);
      data = res.data;
      error = res.error;
      if (res.error) throw res.error;
    }

    if (error) throw error;

    const rows = (data ?? []) as CourseRow[];
    for (const course of rows) {
      if (hasThumbnail(course)) continue;

      const covers = coverIndex.get(course.id) ?? new Set<Locale>();
      const localesNeeded = args.includePartial
        ? requestedLocales.filter((l) => !covers.has(l))
        : (covers.size > 0 ? [] : requestedLocales);

      if (!localesNeeded.length) continue;

      candidates.push({ course, localesNeeded });

      if (args.limit > 0 && candidates.length >= args.limit) {
        return candidates;
      }
    }

    if (rows.length < args.batchSize) break;
    from += args.batchSize;
  }

  return candidates;
}

async function generateAndPersistCover(course: CourseRow, locale: Locale) {
  const prompt = buildCoverPrompt(course, locale);

  const cascade = await generateIllustrationWithCascade({
    moduleContent: prompt,
    locale,
    style: 'header',
    visualStyle: 'photorealistic',
    providerOrder: GENERAL_ORDER,
    promptOverride: prompt,
    negativePromptOverride: 'text, letters, watermark, logo, signature',
  });

  if (!cascade.success || !cascade.images.length) {
    const attemptSummary = cascade.attempts.map((a) => `${a.provider}:${a.success ? 'ok' : 'fail'}`).join(', ');
    throw new Error(`${cascade.error || 'Image generation failed'} (attempts: ${attemptSummary})`);
  }

  const image = cascade.images[0];
  return persistCourseCover({
    courseId: course.id,
    locale,
    prompt: cascade.prompt.slice(0, 2000),
    model: cascade.model,
    provider: cascade.provider,
    base64Data: image.base64Data,
    mimeType: image.mimeType,
    source: 'script-backfill-missing-covers',
  });
}

async function generateAndPersistSharedCover(course: CourseRow, locales: Locale[]) {
  // Use a single prompt (English) as a stable, language-agnostic seed.
  const prompt = buildCoverPrompt(course, 'en');

  const cascade = await generateIllustrationWithCascade({
    moduleContent: prompt,
    locale: 'en',
    style: 'header',
    visualStyle: 'photorealistic',
    providerOrder: GENERAL_ORDER,
    promptOverride: prompt,
    negativePromptOverride: 'text, letters, watermark, logo, signature',
  });

  if (!cascade.success || !cascade.images.length) {
    const attemptSummary = cascade.attempts.map((a) => `${a.provider}:${a.success ? 'ok' : 'fail'}`).join(', ');
    throw new Error(`${cascade.error || 'Image generation failed'} (attempts: ${attemptSummary})`);
  }

  const image = cascade.images[0];
  return persistCourseCoverShared({
    courseId: course.id,
    locales,
    prompt: cascade.prompt.slice(0, 2000),
    model: cascade.model,
    provider: cascade.provider,
    base64Data: image.base64Data,
    mimeType: image.mimeType,
    source: 'script-backfill-missing-covers',
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  console.log('[BackfillCourseCovers] Starting');
  console.log(`[BackfillCourseCovers] mode=${args.dryRun ? 'dry-run' : 'execute'} locale=${args.locale} includePartial=${args.includePartial}`);
  console.log(`[BackfillCourseCovers] limit=${args.limit || 'none'} batchSize=${args.batchSize} concurrency=${args.concurrency}`);

  const client = getSupabase();

  console.log('[BackfillCourseCovers] Loading existing cover index...');
  const coverIndex = await fetchCoverIndex(client, args.batchSize);
  console.log(`[BackfillCourseCovers] Cover index loaded for ${coverIndex.size} courses`);

  console.log('[BackfillCourseCovers] Scanning courses for missing covers...');
  const candidates = await fetchCandidates(client, args, coverIndex);

  console.log(`[BackfillCourseCovers] Candidates: ${candidates.length}`);
  for (const c of candidates.slice(0, 20)) {
    const title = pickField(c.course, 'en', 'title');
    console.log(`  - ${c.course.id} | locales=${c.localesNeeded.join(',')} | ${title}`);
  }
  if (candidates.length > 20) {
    console.log(`  ... and ${candidates.length - 20} more`);
  }

  if (args.dryRun) {
    console.log('[BackfillCourseCovers] Dry-run complete (no writes). Use --execute to generate.');
    return;
  }

  if (!process.env.RUNWARE_API_KEY && !process.env.HUGGINGFACE_API_KEY) {
    console.warn('[BackfillCourseCovers] Warning: no image provider API keys detected (RUNWARE_API_KEY/HUGGINGFACE_API_KEY). Generation may fail.');
  }

  const limit = pLimit(args.concurrency);
  let ok = 0;
  let failed = 0;

  const tasks = candidates.map((c) => limit(async () => {
    const baseTitle = pickField(c.course, 'en', 'title');
    const needed = [...c.localesNeeded];

    // If only one locale is needed and the other locale already exists (includePartial),
    // copy the existing cover so both locales share the same image.
    if (args.includePartial && needed.length === 1) {
      const toLocale = needed[0];
      const fromLocale: Locale = toLocale === 'en' ? 'es' : 'en';
      try {
        console.log(`[BackfillCourseCovers] Copying cover ${c.course.id}: ${fromLocale} -> ${toLocale} | ${baseTitle}`);
        const saved = await copyCourseCoverLocale({
          courseId: c.course.id,
          fromLocale,
          toLocale,
          source: 'script-backfill-missing-covers',
        });
        if (saved) {
          ok++;
          console.log(`[BackfillCourseCovers] Saved (${toLocale}) -> ${saved.image_url}`);
          return;
        }
        // Fallback to generation if source locale cover is missing unexpectedly.
      } catch (err) {
        const msg = formatUnknownError(err);
        console.warn(`[BackfillCourseCovers] Copy failed ${c.course.id} (${fromLocale} -> ${toLocale}): ${msg}`);
        // Fallthrough to generation.
      }
    }

    // If we need both locales, generate once and persist shared.
    if (needed.length === 2 && needed.includes('en') && needed.includes('es')) {
      try {
        console.log(`[BackfillCourseCovers] Generating shared cover for ${c.course.id} (en+es) | ${baseTitle}`);
        const saved = await generateAndPersistSharedCover(c.course, ['en', 'es']);
        ok += saved.length;
        console.log(`[BackfillCourseCovers] Saved (shared) -> ${saved[0]?.image_url ?? '(no url)'}`);
        return;
      } catch (err) {
        failed++;
        console.error(`[BackfillCourseCovers] Failed ${c.course.id} (shared): ${formatUnknownError(err)}`);
        return;
      }
    }

    // Otherwise, generate only the requested locale.
    for (const locale of needed) {
      try {
        console.log(`[BackfillCourseCovers] Generating cover for ${c.course.id} (${locale}) | ${baseTitle}`);
        const saved = await generateAndPersistCover(c.course, locale);
        ok++;
        console.log(`[BackfillCourseCovers] Saved (${locale}) -> ${saved.image_url}`);
      } catch (err) {
        failed++;
        console.error(`[BackfillCourseCovers] Failed ${c.course.id} (${locale}): ${formatUnknownError(err)}`);
      }
    }
  }));

  await Promise.all(tasks);

  console.log(`[BackfillCourseCovers] Done. saved=${ok} failed=${failed}`);
  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('[BackfillCourseCovers] Fatal:', formatUnknownError(err));
  process.exitCode = 1;
});
