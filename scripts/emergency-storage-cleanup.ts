#!/usr/bin/env tsx
/**
 * EMERGENCY STORAGE CLEANUP
 * ============================================================
 * Fixes: exceed_storage_size_quota → 402 on token refresh → auth broken
 *
 * Targets (in order of impact):
 *  1. module-illustrations bucket  — AI image binaries (biggest culprit)
 *  2. audio bucket                 — TTS MP3 files
 *  3. ai_system_logs table         — unbounded DB growth
 *  4. news_article embeddings      — old entries without companion article
 *
 * Usage:
 *   npx tsx scripts/emergency-storage-cleanup.ts           # dry-run (preview)
 *   npx tsx scripts/emergency-storage-cleanup.ts --execute # commit changes
 *
 * Flags:
 *   --execute              Apply all deletions
 *   --check                Health check only: report counts + exit 1 if thresholds exceeded
 *   --illustrations-only   Only clean module-illustrations bucket
 *   --audio-only           Only clean audio bucket
 *   --logs-only            Only truncate ai_system_logs
 *   --keep-logs-days=N     Keep ai_system_logs from last N days (default 14)
 *   --keep-illustrations=N Keep newest N illustrations per module+locale+style (default 2)
 *
 * Thresholds (--check mode, exit 1 when exceeded):
 *   illustrations total rows > 500
 *   ai_system_logs total rows > 25 000
 *   audio_files total rows > 1 000
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

import { createClient } from '@supabase/supabase-js';

// ─── Config ─────────────────────────────────────────────────────────────────

const EXECUTE = process.argv.includes('--execute');
const CHECK_ONLY = process.argv.includes('--check');
const ILLUSTRATIONS_ONLY = process.argv.includes('--illustrations-only');
const AUDIO_ONLY = process.argv.includes('--audio-only');
const LOGS_ONLY = process.argv.includes('--logs-only');

const keepLogsDaysArg = process.argv.find((a) => a.startsWith('--keep-logs-days='));
const KEEP_LOGS_DAYS = keepLogsDaysArg ? parseInt(keepLogsDaysArg.split('=')[1], 10) : 14;

const keepIllustArg = process.argv.find((a) => a.startsWith('--keep-illustrations='));
const KEEP_ILLUSTRATIONS_PER_SLOT = keepIllustArg ? parseInt(keepIllustArg.split('=')[1], 10) : 2;

const RUN_ALL = !ILLUSTRATIONS_ONLY && !AUDIO_ONLY && !LOGS_ONLY;

// ─── Supabase Client ─────────────────────────────────────────────────────────

function getClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!url || !key) throw new Error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key, { auth: { persistSession: false } });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

async function listAllStorageFiles(
  db: ReturnType<typeof createClient>,
  bucket: string,
  prefix = '',
): Promise<Array<{ name: string; id: string; metadata: { size?: number; mimetype?: string } | null; updated_at: string | null }>> {
  const allFiles: Array<{ name: string; id: string; metadata: { size?: number; mimetype?: string } | null; updated_at: string | null }> = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const { data, error } = await db.storage.from(bucket).list(prefix, { limit, offset });
    if (error) {
      console.warn(`  ⚠ list error (${bucket}/${prefix}): ${error.message}`);
      break;
    }
    if (!data || data.length === 0) break;

    const files = data.filter((f) => f.id); // files have id; folders don't
    const folders = data.filter((f) => !f.id);

    allFiles.push(...(files as unknown as typeof allFiles));

    // Recurse into sub-folders
    for (const folder of folders) {
      const subPath = prefix ? `${prefix}/${folder.name}` : folder.name;
      const subFiles = await listAllStorageFiles(db, bucket, subPath);
      allFiles.push(...subFiles);
    }

    if (data.length < limit) break;
    offset += limit;
  }

  return allFiles;
}

// ─── 1. MODULE ILLUSTRATIONS ─────────────────────────────────────────────────
//
// IMPORTANT: When Supabase quota is exceeded, the Storage LIST API is also
// blocked. We work around this by reading paths directly from the DB table
// (module_illustrations), which is still accessible. We then call storage.remove()
// directly on those paths — deletions are still allowed even when quota is exceeded.

async function cleanModuleIllustrations(db: ReturnType<typeof createClient>): Promise<void> {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📦  BUCKET: module-illustrations');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const BUCKET = 'module-illustrations';

  // Read paths from DB table (works even when Storage API is quota-blocked)
  console.log('  Querying module_illustrations table for storage paths...');
  const { data: dbRecords, error: dbError } = await db
    .from('module_illustrations')
    .select('id, module_id, locale, style, visual_style, storage_path, created_at')
    .order('created_at', { ascending: false });

  if (dbError) {
    console.warn(`  ⚠ DB query error: ${dbError.message}`);
    return;
  }

  const records = dbRecords ?? [];
  console.log(`  DB records: ${records.length}`);

  if (records.length === 0) {
    console.log('  Nothing to clean.');
    return;
  }

  // Group by module_id+locale+style+visual_style, keep newest N
  const groups = new Map<string, typeof records>();
  for (const record of records) {
    const key = `${record.module_id}::${record.locale}::${record.style}::${record.visual_style ?? 'default'}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(record);
  }

  const recordsToDelete: string[] = [];
  const pathsToDelete: string[] = [];

  for (const [, groupRecords] of groups) {
    // Already sorted descending by created_at (newest first)
    const toDelete = groupRecords.slice(KEEP_ILLUSTRATIONS_PER_SLOT);
    for (const rec of toDelete) {
      recordsToDelete.push(rec.id);
      if (rec.storage_path) pathsToDelete.push(rec.storage_path);
    }
  }

  const totalPaths = records.filter((r) => r.storage_path).length;
  console.log(`\n  Groups: ${groups.size} unique module+locale+style slots`);
  console.log(`  DB records: ${records.length} total, ${recordsToDelete.length} to delete (keeping newest ${KEEP_ILLUSTRATIONS_PER_SLOT} per slot)`);
  console.log(`  Storage paths to remove: ${pathsToDelete.length} out of ${totalPaths}`);

  if (!EXECUTE) {
    console.log('\n  🔍 DRY RUN — no changes made. Pass --execute to apply.');
    return;
  }

  // Delete storage files first (free quota), then DB records
  if (pathsToDelete.length > 0) {
    const BATCH = 100;
    let removed = 0;
    for (let i = 0; i < pathsToDelete.length; i += BATCH) {
      const batch = pathsToDelete.slice(i, i + BATCH);
      const { error } = await db.storage.from(BUCKET).remove(batch);
      if (error) {
        // Log but continue — may get partial success
        console.warn(`  ⚠ Storage delete error: ${error.message}`);
      } else {
        removed += batch.length;
        process.stdout.write(`\r  ✓ Storage files removed: ${removed} / ${pathsToDelete.length}`);
      }
    }
    console.log('');
  }

  if (recordsToDelete.length > 0) {
    const BATCH = 50;
    let deleted = 0;
    for (let i = 0; i < recordsToDelete.length; i += BATCH) {
      const batch = recordsToDelete.slice(i, i + BATCH);
      const { error } = await db.from('module_illustrations').delete().in('id', batch);
      if (error) console.warn(`  ⚠ DB delete error: ${error.message}`);
      else {
        deleted += batch.length;
        process.stdout.write(`\r  ✓ DB records deleted: ${deleted} / ${recordsToDelete.length}`);
      }
    }
    console.log('');
  }

  console.log('  ✅ module-illustrations cleanup done.');
}

// ─── 2. AUDIO BUCKET ─────────────────────────────────────────────────────────
// Same workaround: read paths from audio_files DB table, then call storage.remove().

async function cleanAudioBucket(db: ReturnType<typeof createClient>): Promise<void> {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔊  BUCKET: audio (TTS files, keep last 7 days)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const BUCKET = 'audio';
  const recentCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const dbCutoff90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

  // Query audio_files table for old records
  const { data: staleDbRows, error: dbError } = await db
    .from('audio_files')
    .select('id, audio_url, created_at')
    .lt('created_at', recentCutoff);

  if (dbError && !/does not exist/i.test(dbError.message)) {
    console.warn(`  ⚠ DB query error: ${dbError.message}`);
  }

  const staleRows = staleDbRows ?? [];

  // Extract storage paths from audio_url (format: .../audio/{contentId}-{locale}-{voice}.mp3)
  const supUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const storagePaths = staleRows
    .map((r) => {
      const url: string = r.audio_url ?? '';
      // Path after /storage/v1/object/public/audio/
      const marker = '/storage/v1/object/public/audio/';
      const idx = url.indexOf(marker);
      if (idx >= 0) return url.slice(idx + marker.length);
      // Fallback: strip base URL
      const base = `${supUrl}/storage/v1/object/public/audio/`;
      return url.startsWith(base) ? url.slice(base.length) : null;
    })
    .filter(Boolean) as string[];

  console.log(`  DB records older than 7 days: ${staleRows.length}`);
  console.log(`  Storage paths to remove: ${storagePaths.length}`);

  if (!EXECUTE) {
    console.log('  🔍 DRY RUN — no changes made. Pass --execute to apply.');
    return;
  }

  if (storagePaths.length > 0) {
    const BATCH = 100;
    let removed = 0;
    for (let i = 0; i < storagePaths.length; i += BATCH) {
      const batch = storagePaths.slice(i, i + BATCH);
      const { error } = await db.storage.from(BUCKET).remove(batch);
      if (error) console.warn(`  ⚠ Storage delete error: ${error.message}`);
      else {
        removed += batch.length;
        process.stdout.write(`\r  ✓ Audio files removed: ${removed} / ${storagePaths.length}`);
      }
    }
    console.log('');
  }

  // Clean old DB records
  if (staleRows.length > 0) {
    const ids = staleRows.map((r) => r.id);
    const BATCH = 100;
    for (let i = 0; i < ids.length; i += BATCH) {
      const { error } = await db.from('audio_files').delete().in('id', ids.slice(i, i + BATCH));
      if (error) console.warn(`  ⚠ audio_files DB delete error: ${error.message}`);
    }
    console.log(`  ✓ Cleaned ${staleRows.length} audio_files records`);
  }

  console.log('  ✅ audio bucket cleanup done.');
}

// ─── 3. AI SYSTEM LOGS ───────────────────────────────────────────────────────

async function cleanAiSystemLogs(db: ReturnType<typeof createClient>): Promise<void> {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📝  TABLE: ai_system_logs (keep last ${KEEP_LOGS_DAYS} days)`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const { count: totalCount } = await db
    .from('ai_system_logs')
    .select('*', { count: 'exact', head: true });

  console.log(`  Total rows: ${totalCount ?? '?'}`);

  const cutoff = new Date(Date.now() - KEEP_LOGS_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { count: staleCount } = await db
    .from('ai_system_logs')
    .select('*', { count: 'exact', head: true })
    .lt('created_at', cutoff);

  console.log(`  Rows older than ${KEEP_LOGS_DAYS} days: ${staleCount ?? '?'}`);

  if (!EXECUTE) {
    console.log('  🔍 DRY RUN — no changes made. Pass --execute to apply.');
    return;
  }

  // Delete in batches to avoid query timeouts
  let totalDeleted = 0;
  for (let i = 0; i < 20; i++) {
    // Use a subquery-based batch delete
    const { data: batch } = await db
      .from('ai_system_logs')
      .select('id')
      .lt('created_at', cutoff)
      .limit(500);

    if (!batch || batch.length === 0) break;

    const ids = batch.map((r) => r.id);
    const { error } = await db.from('ai_system_logs').delete().in('id', ids);
    if (error) {
      console.warn(`  ⚠ Delete error: ${error.message}`);
      break;
    }
    totalDeleted += ids.length;
    console.log(`  ✓ Deleted ${totalDeleted} rows...`);
    if (ids.length < 500) break;
  }

  console.log(`  ✅ ai_system_logs cleanup done. Deleted ${totalDeleted} rows.`);
}

// ─── 4. ORPHANED EMBEDDINGS ──────────────────────────────────────────────────

async function cleanOrphanedEmbeddings(db: ReturnType<typeof createClient>): Promise<void> {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧠  TABLE: news_embeddings (orphaned rows)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Check if news_embeddings table exists
  const { error: checkError } = await db
    .from('news_embeddings')
    .select('id')
    .limit(1);

  if (checkError && /does not exist|no table/i.test(checkError.message)) {
    console.log('  Table does not exist, skipping.');
    return;
  }

  const { count: orphanCount } = await db
    .from('news_embeddings')
    .select('id', { count: 'exact', head: true })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .not('article_id', 'in', db.from('news_articles').select('id') as any);

  console.log(`  Orphaned embedding rows: ${orphanCount ?? '?'}`);

  if (!EXECUTE) {
    console.log('  🔍 DRY RUN — no changes made. Pass --execute to apply.');
    return;
  }

  if ((orphanCount ?? 0) > 0) {
    // Delete where article no longer exists
    const { data: articleIds } = await db.from('news_articles').select('id');
    const validIds = (articleIds ?? []).map((r) => r.id);

    if (validIds.length > 0) {
      const { error } = await db.from('news_embeddings').delete().not('article_id', 'in', validIds);
      if (error) console.warn(`  ⚠ Delete error: ${error.message}`);
      else console.log(`  ✅ Orphaned embeddings removed.`);
    }
  } else {
    console.log('  ✅ No orphaned embeddings found.');
  }
}

// ─── 5. CHECK STORAGE BUCKETS SIZES ─────────────────────────────────────────

async function reportStorageSizes(db: ReturnType<typeof createClient>): Promise<void> {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊  CURRENT DB STATE (after cleanup)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Report from DB tables (not Storage API — that may still be blocked until quota is recalculated)
  const tables = ['module_illustrations', 'audio_files', 'ai_system_logs', 'news_articles'];
  for (const table of tables) {
    const { count, error } = await db.from(table).select('*', { count: 'exact', head: true });
    if (error && /does not exist/i.test(error.message)) {
      console.log(`  ${table.padEnd(28)} (table not present)`);
    } else {
      const c = count ?? '?';
      console.log(`  ${table.padEnd(28)} ${String(c).padStart(8)} rows`);
    }
  }

  // Storage health check thresholds
  const THRESHOLDS: Record<string, number> = {
    module_illustrations: 500,
    ai_system_logs: 25_000,
    audio_files: 1_000,
  };
  let healthFail = false;
  console.log('\n  Threshold check:');
  for (const [table, limit] of Object.entries(THRESHOLDS)) {
    const { count, error } = await db.from(table).select('*', { count: 'exact', head: true });
    if (error && /does not exist/i.test(error.message)) continue;
    const c = count ?? 0;
    const status = c > limit ? '🔴 OVER THRESHOLD' : c > limit * 0.8 ? '🟡 WARNING       ' : '🟢 OK            ';
    console.log(`  ${status}  ${table.padEnd(28)} ${String(c).padStart(8)} rows  (limit ${limit})`);
    if (c > limit) healthFail = true;
  }

  if (healthFail) {
    console.log('\n  ⚠️  One or more tables exceed safe thresholds.');
    console.log('     Run: npx tsx scripts/emergency-storage-cleanup.ts --execute\n');
    if (CHECK_ONLY) process.exitCode = 1;
  }

  console.log(`\n  ℹ️  Storage bucket size is recalculated by Supabase after deletions.`);
  console.log(`  ℹ️  If auth is still broken in a few minutes, visit:`);
  console.log(`      https://supabase.com/dashboard — check Storage usage in your project.\n`);
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║  EMERGENCY SUPABASE STORAGE CLEANUP      ║');
  console.log(`║  Mode: ${EXECUTE ? '⚡ EXECUTE' : '🔍 DRY RUN (preview)  '}          ║`);
  console.log('╚══════════════════════════════════════════╝');

  if (!EXECUTE) {
    console.log('\n⚠️  DRY RUN — no data will be deleted.');
    console.log('   Pass --execute to apply changes.\n');
  }

  const db = getClient();

  // Health-check mode: just report row counts and exit
  if (CHECK_ONLY) {
    await reportStorageSizes(db);
    return;
  }

  if (RUN_ALL || ILLUSTRATIONS_ONLY) {
    await cleanModuleIllustrations(db);
  }

  if (RUN_ALL || AUDIO_ONLY) {
    await cleanAudioBucket(db);
  }

  if (RUN_ALL || LOGS_ONLY) {
    await cleanAiSystemLogs(db);
  }

  if (RUN_ALL) {
    await cleanOrphanedEmbeddings(db);
  }

  await reportStorageSizes(db);

  if (EXECUTE) {
    console.log('\n🎉 Cleanup complete!');
    console.log('   Supabase should lift the quota restriction within a few minutes.');
    console.log('   If auth is still broken, contact support at https://supabase.help\n');
  } else {
    console.log('\nRun with --execute to apply the above deletions.\n');
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
