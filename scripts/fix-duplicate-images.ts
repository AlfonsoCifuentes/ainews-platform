#!/usr/bin/env node
/**
 * Fix Duplicate Images Script
 * 
 * Finds articles with duplicate images and replaces them with unique ones
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
import { getBestArticleImage } from '../lib/services/image-scraper';
import { clearImageCache, initializeImageHashCache } from '../lib/services/image-validator';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Generates unique fallback using Unsplash Source API
 */
function generateUniqueFallback(articleTitle: string, articleUrl: string): string {
  const articleHash = `${articleTitle}${articleUrl}`.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const randomSeed = articleHash % 10000;
  
  const categories = ['ai', 'technology', 'computer', 'robotics', 'data', 'science'];
  const category = categories[articleHash % categories.length];
  
  return `https://source.unsplash.com/1600x900/?${category},artificial-intelligence&sig=${randomSeed}`;
}

async function fixDuplicates() {
  console.log('🔧 Fixing duplicate images...\n');

  // Get all articles
  const { data: articles, error } = await supabase
    .from('news_articles')
    .select('id, title_en, image_url, source_url, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Error fetching articles:', error);
    return;
  }

  // Find duplicates
  const imageMap = new Map();
  
  articles?.forEach(article => {
    if (article.image_url) {
      if (!imageMap.has(article.image_url)) {
        imageMap.set(article.image_url, []);
      }
      imageMap.get(article.image_url).push(article);
    }
  });

  const duplicates = Array.from(imageMap.entries())
    .filter(([_, articles]) => articles.length > 1);

  if (duplicates.length === 0) {
    console.log('✅ No duplicates found!');
    return;
  }

  console.log(`⚠️  Found ${duplicates.length} duplicate images\n`);

  // Clear cache and reinitialize to allow new images
  clearImageCache();
  await initializeImageHashCache();

  let fixedCount = 0;

  for (const [duplicateUrl, articlesWithSameImage] of duplicates) {
    console.log(`\n📷 Fixing duplicate: ${duplicateUrl.slice(0, 80)}...`);
    console.log(`   Used by ${articlesWithSameImage.length} articles\n`);

    // Keep first article with original image, fix the rest
    for (let i = 1; i < articlesWithSameImage.length; i++) {
      const article = articlesWithSameImage[i];
      
      console.log(`   Fixing: [${article.id.slice(0, 8)}] ${article.title_en.slice(0, 50)}...`);

      try {
        // Try to scrape real image from source
        let newImageUrl = await getBestArticleImage(article.source_url);

        // If scraping fails, use unique fallback
        if (!newImageUrl) {
          newImageUrl = generateUniqueFallback(article.title_en, article.source_url);
          console.log(`   → Using unique fallback: ${newImageUrl.slice(0, 80)}...`);
        } else {
          console.log(`   → Found real image: ${newImageUrl.slice(0, 80)}...`);
        }

        // Update database
        const { error: updateError } = await supabase
          .from('news_articles')
          .update({ image_url: newImageUrl })
          .eq('id', article.id);

        if (updateError) {
          console.error(`   ✗ Failed to update: ${updateError.message}`);
        } else {
          console.log(`   ✓ Updated successfully`);
          fixedCount++;
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`   ✗ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  console.log(`\n✅ Fixed ${fixedCount} duplicate images!`);
}

fixDuplicates().then(() => process.exit(0));
