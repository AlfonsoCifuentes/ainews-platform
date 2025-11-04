/**
 * Test Image Scraping Strategies
 * 
 * Tests all 12+ image scraping strategies against a sample of articles
 * to show which strategies are being activated and their success rates
 */

import { createClient } from '@supabase/supabase-js';
import { scrapeArticleImage } from '../lib/services/image-scraper';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testImageStrategies() {
  console.log('🧪 Testing Image Scraping Strategies\n');

  // Get a diverse sample of recent articles
  const { data: articles, error } = await supabase
    .from('news_articles')
    .select('id, title_en, source_url, image_url, source')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Error fetching articles:', error);
    return;
  }

  if (!articles || articles.length === 0) {
    console.log('No articles found');
    return;
  }

  console.log(`📊 Testing ${articles.length} articles...\n`);

  let successCount = 0;
  let failCount = 0;
  const strategyUsage: Record<string, number> = {};

  for (const article of articles) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📰 Article: ${article.title_en.slice(0, 70)}...`);
    console.log(`🔗 Source: ${article.source}`);
    console.log(`🌐 URL: ${article.source_url}`);
    console.log(`🖼️  Current Image: ${article.image_url?.slice(0, 80)}...`);
    console.log('-'.repeat(80));

    try {
      // Test scraping (with detailed logging)
      const scrapedImage = await scrapeArticleImage(article.source_url);

      if (scrapedImage) {
        successCount++;
        console.log(`✅ SUCCESS: Found image via scraping`);
        console.log(`   ${scrapedImage.slice(0, 100)}...`);
      } else {
        failCount++;
        console.log(`❌ FAIL: No valid image found`);
      }
    } catch (error) {
      failCount++;
      console.error(`❌ ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
  }

  // Summary
  console.log(`\n${'='.repeat(80)}`);
  console.log('📊 SUMMARY');
  console.log(`${'='.repeat(80)}`);
  console.log(`Total articles tested: ${articles.length}`);
  console.log(`✅ Successful: ${successCount} (${Math.round(successCount / articles.length * 100)}%)`);
  console.log(`❌ Failed: ${failCount} (${Math.round(failCount / articles.length * 100)}%)`);
  console.log('');

  if (Object.keys(strategyUsage).length > 0) {
    console.log('📈 Strategy Usage:');
    Object.entries(strategyUsage)
      .sort(([, a], [, b]) => b - a)
      .forEach(([strategy, count]) => {
        console.log(`   ${strategy}: ${count}x`);
      });
  }
}

// Run test
testImageStrategies()
  .then(() => {
    console.log('\n✅ Test complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
