#!/usr/bin/env node
/**
 * Check for duplicate images in database
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

async function checkDuplicates() {
  console.log('🔍 Checking for duplicate images...\n');

  const { data: articles, error } = await supabase
    .from('news_articles')
    .select('id, title_en, image_url, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Error fetching articles:', error);
    return;
  }

  const imageMap = new Map();
  
  articles?.forEach(article => {
    if (article.image_url) {
      if (!imageMap.has(article.image_url)) {
        imageMap.set(article.image_url, []);
      }
      imageMap.get(article.image_url).push({
        id: article.id,
        title: article.title_en.slice(0, 60),
        created: article.created_at
      });
    }
  });

  const duplicates = Array.from(imageMap.entries())
    .filter(([_, articles]) => articles.length > 1);

  if (duplicates.length === 0) {
    console.log('✅ No duplicate images found!');
    return;
  }

  console.log(`⚠️  Found ${duplicates.length} duplicate images:\n`);

  duplicates.forEach(([url, articles]) => {
    console.log(`📷 Image: ${url.slice(0, 100)}...`);
    console.log(`   Used by ${articles.length} articles:`);
    articles.forEach(a => {
      console.log(`   - [${a.id.slice(0, 8)}] ${a.title}`);
    });
    console.log('');
  });

  // Check if they're fallback images
  const fallbackPatterns = [
    'unsplash.com',
    'placeholder',
    'default'
  ];

  const fallbackDupes = duplicates.filter(([url]) => 
    fallbackPatterns.some(pattern => url.includes(pattern))
  );

  if (fallbackDupes.length > 0) {
    console.log(`\n⚠️  ${fallbackDupes.length} are fallback/placeholder images`);
    console.log('These should be replaced with unique scraped images.');
  }
}

checkDuplicates().then(() => process.exit(0));
