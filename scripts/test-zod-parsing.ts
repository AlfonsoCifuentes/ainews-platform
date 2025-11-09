#!/usr/bin/env node
/**
 * Test Zod schema parsing with actual DB data
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';
import { newsArticleArraySchema } from '../lib/types/news';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testZodParsing() {
  console.log('🧪 Testing Zod schema parsing...\n');

  const { data: rawData } = await supabase
    .from('news_articles')
    .select(
      `id,
      title_en,
      title_es,
      summary_en,
      summary_es,
      content_en,
      content_es,
      category,
      tags,
      source_url,
      image_url,
      published_at,
      ai_generated,
      quality_score,
      reading_time_minutes`
    )
    .order('created_at', { ascending: false })
    .limit(5);

  console.log('📊 Raw data from Supabase:');
  rawData?.forEach((article, i) => {
    console.log(`\n${i + 1}. ${article.title_en?.slice(0, 60)}...`);
    console.log(`   Raw image_url: ${JSON.stringify(article.image_url)}`);
    console.log(`   Type: ${typeof article.image_url}`);
    console.log(`   Truthy: ${!!article.image_url}`);
  });

  console.log('\n\n🔍 After Zod parsing:');
  try {
    const parsed = newsArticleArraySchema.parse(rawData);
    parsed.forEach((article, i) => {
      console.log(`\n${i + 1}. ${article.title_en?.slice(0, 60)}...`);
      console.log(`   Parsed image_url: ${JSON.stringify(article.image_url)}`);
      console.log(`   Type: ${typeof article.image_url}`);
      console.log(`   Truthy: ${!!article.image_url}`);
      console.log(`   Length: ${article.image_url?.length}`);
    });
  } catch (error) {
    console.error('❌ Zod parsing failed:', error);
  }
}

testZodParsing().catch(console.error);
