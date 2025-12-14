#!/usr/bin/env tsx
/**
 * Sync course covers across locales.
 *
 * Goal: enforce that `en` and `es` share the SAME cover image (same storage object).
 * This script never generates new images. It only copies (upserts) the cover row
 * from a preferred locale to the other locale.
 *
 * Usage:
 *   tsx scripts/sync-course-covers-locales.ts --dry-run
 *   tsx scripts/sync-course-covers-locales.ts --write --prefer en
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

import pLimit from 'p-limit';
import { createClient } from '@supabase/supabase-js';
import { copyCourseCoverLocale, fetchCourseCover } from '@/lib/db/course-covers';

type Locale = 'en' | 'es';

type Args = {
  dryRun: boolean;
  prefer: Locale;
  limit: number;
  batchSize: number;
  concurrency: number;
};

function formatUnknownError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    dryRun: true,
    prefer: 'en',
    limit: 0,
    batchSize: 400,
    concurrency: 4,
  };

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];

    if (token === '--write' || token === '--execute') {
      args.dryRun = false;
      continue;
    }

    if (token === '--dry-run') {
      args.dryRun = true;
      continue;
    }

    if (token === '--prefer') {
      const value = argv[i + 1];
      i++;
      if (value !== 'en' && value !== 'es') throw new Error(`Invalid --prefer: ${value}. Use en|es.`);
      args.prefer = value;
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
      if (!Number.isFinite(value) || value < 1 || value > 2000) throw new Error(`Invalid --batch-size: ${argv[i]}`);
      args.batchSize = value;
      continue;
    }

    if (token === '--concurrency') {
      const value = Number(argv[i + 1]);
      i++;
      if (!Number.isFinite(value) || value < 1 || value > 20) throw new Error(`Invalid --concurrency: ${argv[i]}`);
      args.concurrency = value;
      continue;
    }

    if (token === '--help' || token === '-h') {
      console.log(`\nSync course covers across locales\n\n` +
        `Options:\n` +
        `  --dry-run            Show planned changes only (default)\n` +
        `  --write              Apply changes\n` +
        `  --prefer <en|es>     Which locale is the source of truth (default: en)\n` +
        `  --limit <n>          Max courses to process (0 = no limit)\n` +
        `  --batch-size <n>     Supabase pagination size (default: 400)\n` +
        `  --concurrency <n>    Parallelism (default: 4)\n`);
      process.exit(0);
    }

    throw new Error(`Unknown argument: ${token}`);
  }

  return args;
}

function getSupabase() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) {
    throw new Error('Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient(url, serviceRole, { auth: { persistSession: false } });
}

async function fetchCourseIdsWithCovers(client: ReturnType<typeof getSupabase>, batchSize: number): Promise<Set<string>> {
  const ids = new Set<string>();
  let from = 0;

  while (true) {
    const to = from + batchSize - 1;
    const { data, error } = await client
      .from('course_covers')
      .select('course_id')
      .order('course_id', { ascending: true })
      .range(from, to);

    if (error) throw error;

    const rows = (data ?? []) as Array<{ course_id: string }>;
    for (const row of rows) ids.add(row.course_id);

    if (rows.length < batchSize) break;
    from += batchSize;
  }

  return ids;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const other: Locale = args.prefer === 'en' ? 'es' : 'en';

  console.log('[SyncCourseCovers] Starting');
  console.log(`[SyncCourseCovers] mode=${args.dryRun ? 'dry-run' : 'write'} prefer=${args.prefer} -> ${other}`);

  const client = getSupabase();

  console.log('[SyncCourseCovers] Loading course IDs that have covers...');
  const courseIds = await fetchCourseIdsWithCovers(client, args.batchSize);
  const ids = Array.from(courseIds);
  console.log(`[SyncCourseCovers] Found ${ids.length} courses with at least one cover row`);

  const idsToProcess = args.limit > 0 ? ids.slice(0, args.limit) : ids;
  if (args.limit > 0) {
    console.log(`[SyncCourseCovers] Processing first ${idsToProcess.length} courses due to --limit`);
  }

  const limit = pLimit(args.concurrency);
  let processed = 0;
  let changed = 0;
  let failed = 0;

  const tasks = idsToProcess.map((courseId) => limit(async () => {
    processed++;

    const preferCover = await fetchCourseCover(courseId, args.prefer);
    const otherCover = await fetchCourseCover(courseId, other);

    // If neither exists, nothing to do.
    if (!preferCover && !otherCover) return;

    // If preferred exists and other is missing -> copy.
    if (preferCover && !otherCover) {
      if (args.dryRun) {
        changed++;
        console.log(`[SyncCourseCovers] Would copy ${courseId}: ${args.prefer} -> ${other}`);
        return;
      }
      try {
        await copyCourseCoverLocale({ courseId, fromLocale: args.prefer, toLocale: other, source: 'script-sync-course-covers' });
        changed++;
        console.log(`[SyncCourseCovers] Copied ${courseId}: ${args.prefer} -> ${other}`);
      } catch (err) {
        failed++;
        console.error(`[SyncCourseCovers] Failed copy ${courseId}: ${formatUnknownError(err)}`);
      }
      return;
    }

    // If preferred missing but other exists -> copy other back to preferred (still ends equal).
    if (!preferCover && otherCover) {
      if (args.dryRun) {
        changed++;
        console.log(`[SyncCourseCovers] Would copy ${courseId}: ${other} -> ${args.prefer}`);
        return;
      }
      try {
        await copyCourseCoverLocale({ courseId, fromLocale: other, toLocale: args.prefer, source: 'script-sync-course-covers' });
        changed++;
        console.log(`[SyncCourseCovers] Copied ${courseId}: ${other} -> ${args.prefer}`);
      } catch (err) {
        failed++;
        console.error(`[SyncCourseCovers] Failed copy ${courseId}: ${formatUnknownError(err)}`);
      }
      return;
    }

    // Both exist: if storage differs, overwrite other with preferred.
    if (preferCover && otherCover && preferCover.storage_path !== otherCover.storage_path) {
      if (args.dryRun) {
        changed++;
        console.log(`[SyncCourseCovers] Would sync ${courseId}: set ${other} = ${args.prefer}`);
        return;
      }
      try {
        await copyCourseCoverLocale({ courseId, fromLocale: args.prefer, toLocale: other, source: 'script-sync-course-covers' });
        changed++;
        console.log(`[SyncCourseCovers] Synced ${courseId}: ${other} now matches ${args.prefer}`);
      } catch (err) {
        failed++;
        console.error(`[SyncCourseCovers] Failed sync ${courseId}: ${formatUnknownError(err)}`);
      }
    }
  }));

  await Promise.all(tasks);

  console.log(`[SyncCourseCovers] Done. processed=${processed} wouldChangeOrChanged=${changed} failed=${failed}`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error('[SyncCourseCovers] Fatal:', formatUnknownError(err));
  process.exitCode = 1;
});
