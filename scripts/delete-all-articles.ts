#!/usr/bin/env node
/**
 * Delete All Articles Script
 * WARNING: This deletes ALL articles from the database
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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function deleteAllArticles() {
  console.log('⚠️  WARNING: This will delete ALL articles from the database!');
  console.log('🗑️  Deleting all news_articles...\n');

  const { error, count } = await supabase
    .from('news_articles')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (dummy condition)

  if (error) {
    console.error('❌ Error deleting articles:', error);
    return;
  }

  console.log(`✅ Deleted ${count || 'all'} articles successfully!`);
}

deleteAllArticles().catch(console.error);
