/**
 * Debug script to see what's happening with translations
 */

import { config as loadEnv } from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';

const envLocal = resolve(process.cwd(), '.env.local');
if (existsSync(envLocal)) {
  loadEnv({ path: envLocal });
}

import { getSupabaseServerClient } from '../lib/db/supabase';

async function debug() {
  const db = getSupabaseServerClient();
  
  // Get all articles
  const { data: all } = await db
    .from('news_articles')
    .select('id, title_en, title_es')
    .order('published_at', { ascending: false })
    .limit(15);

  console.log('\nRecent articles:');
  console.log('================\n');

  all?.forEach((a, i) => {
    const sameTitle = a.title_en === a.title_es;
    console.log(`${i + 1}. ${sameTitle ? '❌' : '✅'} ${a.title_en.substring(0, 60)}...`);
    if (sameTitle) {
      console.log(`   EN: ${a.title_en}`);
      console.log(`   ES: ${a.title_es}`);
    }
  });

  // Count articles needing translation
  const { data: needTranslation } = await db
    .from('news_articles')
    .select('id')
    .or('title_en.eq.title_es,content_en.eq.content_es');

  console.log(`\n\nTotal articles needing translation: ${needTranslation?.length || 0}`);
}

debug();
