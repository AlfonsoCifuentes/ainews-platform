#!/usr/bin/env node
/**
 * Remove Duplicate Articles Script
 * 
 * Finds and removes articles with duplicate titles
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

async function removeDuplicates() {
  console.log('🔍 Finding duplicate articles...\n');

  // Get all articles
  const { data: articles, error } = await supabase
    .from('news_articles')
    .select('id, title_en, title_es, published_at, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching articles:', error);
    return;
  }

  // Find duplicates by title_en
  const titleMapEn = new Map<string, typeof articles>();
  const titleMapEs = new Map<string, typeof articles>();
  
  articles?.forEach(article => {
    // Check English title
    if (!titleMapEn.has(article.title_en)) {
      titleMapEn.set(article.title_en, []);
    }
    titleMapEn.get(article.title_en)!.push(article);
    
    // Check Spanish title
    if (!titleMapEs.has(article.title_es)) {
      titleMapEs.set(article.title_es, []);
    }
    titleMapEs.get(article.title_es)!.push(article);
  });

  // Find English title duplicates
  const duplicatesEn = Array.from(titleMapEn.entries())
    .filter(([_, articles]) => articles.length > 1);

  // Find Spanish title duplicates
  const duplicatesEs = Array.from(titleMapEs.entries())
    .filter(([_, articles]) => articles.length > 1);

  // Combine both (using Set to avoid double-counting same groups)
  const allDuplicateGroups = new Map<string, typeof articles>();
  
  duplicatesEn.forEach(([_title, articles]) => {
    const key = articles.map(a => a.id).sort().join(',');
    allDuplicateGroups.set(key, articles);
  });
  
  duplicatesEs.forEach(([_title, articles]) => {
    const key = articles.map(a => a.id).sort().join(',');
    allDuplicateGroups.set(key, articles);
  });

  if (allDuplicateGroups.size === 0) {
    console.log('✅ No duplicate articles found!');
    return;
  }

  console.log(`⚠️  Found ${allDuplicateGroups.size} groups of duplicate articles\n`);

  let removedCount = 0;
  const idsToDelete: string[] = [];

  for (const [_key, duplicateArticles] of allDuplicateGroups) {
    console.log(`\n📰 Duplicate group: "${duplicateArticles[0].title_en.slice(0, 60)}..."`);
    console.log(`   Found ${duplicateArticles.length} copies\n`);

    // Sort by created_at to keep the oldest one
    const sorted = [...duplicateArticles].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    const keepArticle = sorted[0];
    const removeArticles = sorted.slice(1);

    console.log(`   ✓ Keeping: [${keepArticle.id.slice(0, 8)}] Created: ${new Date(keepArticle.created_at).toISOString()}`);

    for (const article of removeArticles) {
      console.log(`   ✗ Removing: [${article.id.slice(0, 8)}] Created: ${new Date(article.created_at).toISOString()}`);
      idsToDelete.push(article.id);
      removedCount++;
    }
  }

  if (idsToDelete.length > 0) {
    console.log(`\n🗑️  Deleting ${idsToDelete.length} duplicate articles...`);
    
    const { error: deleteError } = await supabase
      .from('news_articles')
      .delete()
      .in('id', idsToDelete);

    if (deleteError) {
      console.error('Error deleting duplicates:', deleteError);
    } else {
      console.log(`✅ Successfully removed ${removedCount} duplicate articles!`);
    }
  }
}

removeDuplicates().then(() => process.exit(0));
