#!/usr/bin/env tsx
/**
 * Find and fix uncurated articles
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const searchTerm = process.argv[2] || 'Noticias diarias';
  
  console.log(`🔍 Searching for: "${searchTerm}"\n`);
  
  const { data, error } = await db
    .from('news_articles')
    .select('id, title_es, title_en, rewrite_model, rewrite_version, ai_generated, created_at, summary_es')
    .or(`title_es.ilike.%${searchTerm}%,title_en.ilike.%${searchTerm}%`)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error:', error);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.log('No articles found');
    process.exit(0);
  }

  console.log(`Found ${data.length} articles:\n`);
  
  for (const article of data) {
    console.log('─'.repeat(60));
    console.log(`ID: ${article.id}`);
    console.log(`Title ES: ${article.title_es?.slice(0, 80)}...`);
    console.log(`Title EN: ${article.title_en?.slice(0, 80)}...`);
    console.log(`AI Generated: ${article.ai_generated}`);
    console.log(`Rewrite Model: ${article.rewrite_model || '❌ NONE'}`);
    console.log(`Rewrite Version: ${article.rewrite_version || '❌ 0'}`);
    console.log(`Created: ${article.created_at}`);
    console.log(`Summary (first 200 chars): ${article.summary_es?.slice(0, 200)}...`);
  }
  
  console.log('\n─'.repeat(60));
  
  // Identify articles needing upgrade
  const needsUpgrade = data.filter(a => !a.rewrite_model || (a.rewrite_version || 0) < 2);
  
  if (needsUpgrade.length > 0) {
    console.log(`\n⚠️  ${needsUpgrade.length} articles need GPT-4o-mini upgrade:`);
    needsUpgrade.forEach(a => console.log(`   - ${a.id}: ${a.title_es?.slice(0, 50)}...`));
    console.log(`\nRun: npm run ai:upgrade-news:execute -- --limit ${needsUpgrade.length}`);
  }
}

main().catch(console.error);
