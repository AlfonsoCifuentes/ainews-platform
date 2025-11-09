#!/usr/bin/env node
/**
 * Check image status in database
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkImages() {
  console.log('🔍 Checking image status in database...\n');

  // Total counts
  const { count: total } = await supabase
    .from('news_articles')
    .select('id', { count: 'exact', head: true });
  
  const { count: withImages } = await supabase
    .from('news_articles')
    .select('id', { count: 'exact', head: true })
    .not('image_url', 'is', null)
    .neq('image_url', '');
  
  const { count: unsplashImages } = await supabase
    .from('news_articles')
    .select('id', { count: 'exact', head: true })
    .like('image_url', '%unsplash%');
    
  console.log('📊 Image Statistics:');
  console.log(`Total articles: ${total}`);
  console.log(`With images: ${withImages} (${((withImages! / total!) * 100).toFixed(1)}%)`);
  console.log(`Unsplash fallback: ${unsplashImages} (${((unsplashImages! / total!) * 100).toFixed(1)}%)`);
  console.log(`Original images: ${withImages! - unsplashImages!} (${(((withImages! - unsplashImages!) / total!) * 100).toFixed(1)}%)`);
  
  // Recent articles
  const { data: recentArticles } = await supabase
    .from('news_articles')
    .select('title_en, image_url, created_at')
    .order('created_at', { ascending: false })
    .limit(15);

  console.log('\n📰 Recent 15 articles:');
  recentArticles?.forEach((a, i) => {
    const hasImage = a.image_url ? '✅' : '❌';
    const isUnsplash = a.image_url?.includes('unsplash') ? '🔄 FALLBACK' : '🖼️  ORIGINAL';
    const imageType = a.image_url ? isUnsplash : '⚠️  NO IMAGE';
    console.log(`${i + 1}. ${hasImage} [${new Date(a.created_at).toLocaleDateString()}] ${a.title_en?.slice(0, 50)}...`);
    console.log(`   ${imageType}`);
  });
}

checkImages().catch(console.error);
