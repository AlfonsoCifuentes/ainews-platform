#!/usr/bin/env node
/**
 * Check specific article image data
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkArticleImages() {
  console.log('🔍 Checking article image URLs...\n');

  const { data: articles } = await supabase
    .from('news_articles')
    .select('id, title_en, image_url, created_at')
    .order('created_at', { ascending: false })
    .limit(20);

  console.log('📰 Recent 20 articles with full image URL:');
  articles?.forEach((a, i) => {
    console.log(`\n${i + 1}. ${a.title_en?.slice(0, 60)}...`);
    console.log(`   Created: ${new Date(a.created_at).toLocaleString()}`);
    console.log(`   Image: ${a.image_url || '❌ NULL/EMPTY'}`);
  });
}

checkArticleImages().catch(console.error);
