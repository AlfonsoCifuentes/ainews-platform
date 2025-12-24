#!/usr/bin/env tsx

import { config as loadEnv } from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';

const envLocal = resolve(process.cwd(), '.env.local');
if (existsSync(envLocal)) {
  loadEnv({ path: envLocal });
} else {
  loadEnv();
}

import { getSupabaseServerClient } from '../lib/db/supabase';

async function main() {
  const db = getSupabaseServerClient();
  
  // Count visible
  const { count: visibleCount } = await db.from('news_articles')
    .select('*', { count: 'exact', head: true })
    .eq('is_hidden', false);
  
  // Count hidden
  const { count: hiddenCount } = await db.from('news_articles')
    .select('*', { count: 'exact', head: true })
    .eq('is_hidden', true);
  
  console.log(`Visible articles: ${visibleCount}`);
  console.log(`Hidden articles: ${hiddenCount}`);
  
  // Show first 5 visible
  const { data: visible } = await db.from('news_articles')
    .select('title_es,published_at')
    .eq('is_hidden', false)
    .order('published_at', { ascending: false })
    .limit(5);
  
  console.log('\nMost recent VISIBLE:');
  visible?.forEach(r => console.log(`- ${r.published_at?.slice(0,16)} | ${r.title_es?.slice(0,60)}`));
  
  // Show first 5 hidden
  const { data: hidden } = await db.from('news_articles')
    .select('title_es,hidden_reason,hidden_at')
    .eq('is_hidden', true)
    .order('hidden_at', { ascending: false })
    .limit(5);
  
  console.log('\nMost recent HIDDEN:');
  hidden?.forEach(r => console.log(`- ${r.hidden_reason} | ${r.title_es?.slice(0,60)}`));
}

main().catch(console.error);
