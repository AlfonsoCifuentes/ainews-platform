/**
 * Storage Migration Script
 * Downloads all files from old Supabase Storage and uploads them to the new project.
 *
 * Usage:
 *   npx tsx scripts/migrate-storage.ts
 *
 * Required env vars (set in .env.local or export manually):
 *   OLD_SUPABASE_URL       - e.g. https://yabsciwdpblqzskfupnj.supabase.co
 *   OLD_SUPABASE_KEY       - service role key of the OLD project
 *   NEXT_PUBLIC_SUPABASE_URL - new project URL (already in .env.local)
 *   SUPABASE_SERVICE_ROLE_KEY - service role key of the NEW project
 */

import { createClient } from '@supabase/supabase-js';

// ─── Config ──────────────────────────────────────────────────────────────────

const OLD_URL = process.env.OLD_SUPABASE_URL ?? 'https://yabsciwdpblqzskfupnj.supabase.co';
const OLD_KEY = process.env.OLD_SUPABASE_KEY ?? process.env.OLD_SUPABASE_SERVICE_ROLE_KEY ?? '';

const NEW_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const NEW_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

if (!OLD_KEY) {
  console.error('❌ OLD_SUPABASE_KEY (service role key of old project) is required');
  process.exit(1);
}
if (!NEW_URL || !NEW_KEY) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (new project) are required');
  process.exit(1);
}

const oldClient = createClient(OLD_URL, OLD_KEY, { auth: { persistSession: false } });
const newClient = createClient(NEW_URL, NEW_KEY, { auth: { persistSession: false } });

// Buckets to migrate
const BUCKETS = ['news-fallback-images', 'course-covers', 'module-illustrations'];

// ─── Main ────────────────────────────────────────────────────────────────────

async function migrateBucket(bucketName: string) {
  console.log(`\n📦 Migrating bucket: ${bucketName}`);

  // Ensure bucket exists in new project
  const { error: createErr } = await newClient.storage.createBucket(bucketName, {
    public: true,
    fileSizeLimit: 10 * 1024 * 1024, // 10 MB
  });
  if (createErr && !createErr.message.includes('already exists')) {
    console.error(`  ❌ Failed to create bucket ${bucketName}:`, createErr.message);
    return { migrated: 0, failed: 0 };
  }

  // List all files in old bucket
  const { data: files, error: listErr } = await oldClient.storage.from(bucketName).list('', {
    limit: 1000,
    sortBy: { column: 'name', order: 'asc' },
  });

  if (listErr) {
    console.error(`  ❌ Failed to list files in old ${bucketName}:`, listErr.message);
    return { migrated: 0, failed: 0 };
  }

  if (!files || files.length === 0) {
    console.log(`  ⚠️ No files found in old ${bucketName}`);
    return { migrated: 0, failed: 0 };
  }

  console.log(`  📄 Found ${files.length} files`);

  let migrated = 0;
  let failed = 0;

  for (const file of files) {
    // Skip folders
    if (file.id === null) continue;

    try {
      // Download from old
      const { data: blob, error: dlErr } = await oldClient.storage
        .from(bucketName)
        .download(file.name);

      if (dlErr || !blob) {
        console.error(`  ❌ Download failed: ${file.name} - ${dlErr?.message}`);
        failed++;
        continue;
      }

      // Upload to new
      const arrayBuffer = await blob.arrayBuffer();
      const { error: upErr } = await newClient.storage
        .from(bucketName)
        .upload(file.name, arrayBuffer, {
          contentType: file.metadata?.mimetype ?? 'application/octet-stream',
          upsert: true,
        });

      if (upErr) {
        console.error(`  ❌ Upload failed: ${file.name} - ${upErr.message}`);
        failed++;
      } else {
        migrated++;
        console.log(`  ✅ ${file.name}`);
      }
    } catch (err) {
      console.error(`  ❌ Error migrating ${file.name}:`, err);
      failed++;
    }
  }

  return { migrated, failed };
}

async function main() {
  console.log('🚀 Storage Migration: Old → New Supabase');
  console.log(`   Old: ${OLD_URL}`);
  console.log(`   New: ${NEW_URL}`);
  console.log('─'.repeat(60));

  const results: Record<string, { migrated: number; failed: number }> = {};

  for (const bucket of BUCKETS) {
    results[bucket] = await migrateBucket(bucket);
  }

  console.log('\n' + '═'.repeat(60));
  console.log('📊 Migration Summary:');
  for (const [bucket, { migrated, failed }] of Object.entries(results)) {
    const status = failed === 0 ? '✅' : '⚠️';
    console.log(`  ${status} ${bucket}: ${migrated} migrated, ${failed} failed`);
  }
  console.log('═'.repeat(60));
}

main().catch(console.error);
