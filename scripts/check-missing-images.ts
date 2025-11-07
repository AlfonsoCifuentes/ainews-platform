#!/usr/bin/env tsx

/**
 * Quick check: How many articles are missing images?
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

async function checkMissingImages() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  console.log('📊 Checking articles with missing images...\n');
  
  // Total articles
  const { count: total } = await supabase
    .from('news_articles')
    .select('*', { count: 'exact', head: true });
  
  // Articles without images
  const { count: missing } = await supabase
    .from('news_articles')
    .select('*', { count: 'exact', head: true })
    .or('image_url.is.null,image_url.eq.');
  
  // Articles with images
  const withImages = (total || 0) - (missing || 0);
  
  console.log(`📰 Total articles: ${total}`);
  console.log(`✅ With images: ${withImages} (${((withImages / (total || 1)) * 100).toFixed(1)}%)`);
  console.log(`❌ Missing images: ${missing} (${((missing || 0) / (total || 1) * 100).toFixed(1)}%)`);
  
  if (missing && missing > 0) {
    console.log(`\n💡 Run this to fix them:`);
    console.log(`   npm run ai:ultra-fix-images -- --limit ${Math.min(missing, 50)}`);
  }
}

checkMissingImages();
