/**
 * Fix malformed Unsplash URLs in database
 * 
 * Problem: URLs like https://images.unsplash.com/photo-1600004817?w=1600&h=900&fit=crop
 * are invalid (missing full photo ID)
 * 
 * Solution: Replace with valid Pexels images using the same deterministic algorithm
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function fixMalformedUnsplashUrls() {
  console.log('🔍 Finding articles with malformed Unsplash URLs...\n');

  // Find all articles with short Unsplash URLs (missing full ID)
  const { data: articles, error } = await supabase
    .from('news_articles')
    .select('id, title_en, title_es, source_url, image_url')
    .like('image_url', 'https://images.unsplash.com/photo-1%')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error fetching articles:', error);
    return;
  }

  if (!articles || articles.length === 0) {
    console.log('✅ No malformed Unsplash URLs found!');
    return;
  }

  console.log(`📊 Found ${articles.length} articles with Unsplash URLs\n`);

  let fixedCount = 0;
  let skippedCount = 0;

  for (const article of articles) {
    const title = article.title_en || article.title_es || '';
    
    // Check if URL is malformed (photo ID too short)
    const match = article.image_url.match(/photo-(\d+)\?/);
    
    if (match && match[1].length < 15) {
      // This is a malformed URL - the photo ID should be much longer
      console.log(`🔧 Fixing: "${title.substring(0, 60)}..."`);
      console.log(`   Old URL: ${article.image_url}`);

      // Generate deterministic Pexels image based on article hash
      const articleHash = `${title}${article.source_url || ''}`.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const page = (articleHash % 100) + 1;
      const photoIndex = articleHash % 15;

      try {
        // Fetch from Pexels curated
        const pexelsUrl = `https://api.pexels.com/v1/curated?page=${page}&per_page=15`;
        const response = await fetch(pexelsUrl, {
          headers: {
            'Authorization': process.env.PEXELS_API_KEY || ''
          }
        });

        if (!response.ok) {
          console.error(`   ❌ Pexels API error: ${response.status} ${response.statusText}`);
          continue;
        }

        const data = await response.json() as { 
          photos?: Array<{ src?: { large2x?: string; large?: string; original?: string } }> 
        };

        const photos = data.photos;
        if (!photos || photos.length === 0) {
          console.error(`   ❌ No photos returned from Pexels`);
          continue;
        }

        if (!photos[photoIndex]) {
          console.error(`   ❌ Photo index ${photoIndex} not found (array has ${photos.length} photos)`);
          continue;
        }

        const newUrl = photos[photoIndex].src?.large2x || photos[photoIndex].src?.large || photos[photoIndex].src?.original;

        if (!newUrl) {
          console.error(`   ❌ No valid image URL found in photo data`);
          continue;
        }

        // Update database
        const { error: updateError } = await supabase
          .from('news_articles')
          .update({ image_url: newUrl })
          .eq('id', article.id);

        if (updateError) {
          console.error(`   ❌ Update failed:`, updateError.message);
        } else {
          console.log(`   ✅ New URL: ${newUrl}`);
          fixedCount++;
        }

        // Rate limit: wait between requests
        await new Promise(resolve => setTimeout(resolve, 300));

      } catch (error) {
        console.error(`   ❌ Error:`, error instanceof Error ? error.message : error);
      }

      console.log('');
    } else {
      skippedCount++;
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log(`✅ Migration complete!`);
  console.log(`   Fixed: ${fixedCount}`);
  console.log(`   Skipped (valid URLs): ${skippedCount}`);
  console.log(`   Total processed: ${articles.length}`);
  console.log('='.repeat(80));
}

// Run migration
fixMalformedUnsplashUrls()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
