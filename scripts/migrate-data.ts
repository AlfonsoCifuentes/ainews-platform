/**
 * Data Migration Script
 * Exports all table data from the old Supabase project and imports into the new one.
 *
 * Usage:
 *   npx tsx scripts/migrate-data.ts
 *
 * Required env vars:
 *   OLD_SUPABASE_URL             - https://yabsciwdpblqzskfupnj.supabase.co
 *   OLD_SUPABASE_KEY             - service role key of the OLD project
 *   NEXT_PUBLIC_SUPABASE_URL     - new project URL
 *   SUPABASE_SERVICE_ROLE_KEY    - service role key of the NEW project
 *
 * IMPORTANT: Run the consolidated migration SQL FIRST to create all tables
 *            in the new project before running this script.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ─── Config ──────────────────────────────────────────────────────────────────

const OLD_URL = process.env.OLD_SUPABASE_URL ?? 'https://yabsciwdpblqzskfupnj.supabase.co';
const OLD_KEY = process.env.OLD_SUPABASE_KEY ?? process.env.OLD_SUPABASE_SERVICE_ROLE_KEY ?? '';

const NEW_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const NEW_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

if (!OLD_KEY) {
  console.error('❌ OLD_SUPABASE_KEY is required');
  process.exit(1);
}
if (!NEW_URL || !NEW_KEY) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  process.exit(1);
}

const oldDb = createClient(OLD_URL, OLD_KEY, { auth: { persistSession: false } });
const newDb = createClient(NEW_URL, NEW_KEY, { auth: { persistSession: false } });

// Tables in dependency order (parents first)
const TABLES = [
  'news_articles',
  'courses',
  'course_modules',
  'ai_prompts',
  'trending_cache',
  'ai_system_logs',
  'ai_leaderboard',
  'news_podcast_episodes',
  'image_visual_hashes',
  'course_covers',
  // User-related (may not have data if auth hasn't been set up)
  'user_profiles',
  'user_progress',
  'user_activities',
  'user_follows',
  'user_badges',
  'user_saved_searches',
  'user_tag_interests',
  'reading_history',
  'comments',
  'notifications',
  'email_subscriptions',
  // Knowledge Graph
  'entities',
  'entity_relations',
  'citations',
  // Course features
  'module_visual_slots',
  'module_illustrations',
  'course_ratings',
  // Flashcards
  'flashcards',
  'user_highlights',
  // Analytics
  'analytics_events',
  'analytics_overview',
  'ai_feedback',
];

const BATCH_SIZE = 500;

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function migrateTable(tableName: string): Promise<{ rows: number; error?: string }> {
  console.log(`\n📋 Migrating table: ${tableName}`);

  let allRows: Record<string, unknown>[] = [];
  let offset = 0;
  let hasMore = true;

  // Fetch all rows from old DB
  while (hasMore) {
    const { data, error } = await oldDb
      .from(tableName)
      .select('*')
      .range(offset, offset + BATCH_SIZE - 1);

    if (error) {
      // Table might not exist in old DB
      if (error.message.includes('does not exist') || error.code === '42P01') {
        console.log(`  ⚠️ Table ${tableName} does not exist in old DB - skipping`);
        return { rows: 0 };
      }
      console.error(`  ❌ Read error: ${error.message}`);
      return { rows: 0, error: error.message };
    }

    if (!data || data.length === 0) {
      hasMore = false;
    } else {
      allRows = allRows.concat(data);
      offset += BATCH_SIZE;
      if (data.length < BATCH_SIZE) hasMore = false;
    }
  }

  if (allRows.length === 0) {
    console.log(`  ⚠️ No data in ${tableName}`);
    return { rows: 0 };
  }

  console.log(`  📊 Found ${allRows.length} rows`);

  // Insert in batches into new DB
  let inserted = 0;
  for (let i = 0; i < allRows.length; i += BATCH_SIZE) {
    const batch = allRows.slice(i, i + BATCH_SIZE);
    const { error: insertErr } = await newDb
      .from(tableName)
      .upsert(batch, { onConflict: 'id', ignoreDuplicates: true });

    if (insertErr) {
      console.error(`  ❌ Insert error (batch ${Math.floor(i / BATCH_SIZE) + 1}): ${insertErr.message}`);
      // Try one-by-one fallback for this batch
      for (const row of batch) {
        const { error: singleErr } = await newDb
          .from(tableName)
          .upsert(row, { onConflict: 'id', ignoreDuplicates: true });
        if (!singleErr) inserted++;
      }
    } else {
      inserted += batch.length;
    }
  }

  console.log(`  ✅ Inserted ${inserted}/${allRows.length} rows`);
  return { rows: inserted };
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🚀 Data Migration: Old → New Supabase');
  console.log(`   Old: ${OLD_URL}`);
  console.log(`   New: ${NEW_URL}`);
  console.log('─'.repeat(60));
  console.log('⚠️  Make sure you have run the consolidated migration SQL');
  console.log('   (FULL_MIGRATION_NEW_PROJECT.sql) on the new project FIRST!');
  console.log('─'.repeat(60));

  const results: Record<string, { rows: number; error?: string }> = {};

  for (const table of TABLES) {
    results[table] = await migrateTable(table);
  }

  console.log('\n' + '═'.repeat(60));
  console.log('📊 Data Migration Summary:');
  let totalRows = 0;
  let tablesWithData = 0;
  let errors = 0;

  for (const [table, { rows, error }] of Object.entries(results)) {
    if (error) {
      console.log(`  ❌ ${table}: ERROR - ${error}`);
      errors++;
    } else if (rows > 0) {
      console.log(`  ✅ ${table}: ${rows} rows`);
      totalRows += rows;
      tablesWithData++;
    } else {
      console.log(`  ⬜ ${table}: empty/skipped`);
    }
  }

  console.log('─'.repeat(60));
  console.log(`  Total: ${totalRows} rows across ${tablesWithData} tables (${errors} errors)`);
  console.log('═'.repeat(60));
}

main().catch(console.error);
