/**
 * Generate mock news analytics data for testing UI
 * Run this while waiting for the real table to be created
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function insertMockData() {
  console.log('🎭 Inserting mock analytics data for testing...\n');

  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 86400000);

  const mockData = {
    hype_score: 42,
    substance_score: 73,
    hype_keywords: ['revolutionary', 'breakthrough', 'game-changer', 'unprecedented', 'next-gen'],
    substance_keywords: ['benchmark', 'performance', 'accuracy', 'implementation', 'research'],
    domain_distribution: {
      cv: 18,
      nlp: 42,
      robotics: 12,
      ethics: 9,
      tools: 19
    },
    trending_topics: [
      { topic: 'Large Language Models', count: 25, trend: 'up', emoji: '🧠' },
      { topic: 'Computer Vision', count: 18, trend: 'stable', emoji: '👁️' },
      { topic: 'AI Safety & Ethics', count: 12, trend: 'up', emoji: '🛡️' },
    ],
    sentiment_by_category: {
      'machinelearning': { positive: 65, neutral: 28, negative: 7 },
      'nlp': { positive: 72, neutral: 23, negative: 5 },
      'computervision': { positive: 58, neutral: 35, negative: 7 },
    },
    company_activity: [
      { company: 'OpenAI', count: 15, trend: 'up' },
      { company: 'Google DeepMind', count: 12, trend: 'stable' },
      { company: 'Anthropic', count: 10, trend: 'up' },
      { company: 'Meta', count: 8, trend: 'down' },
    ],
    analysis_period_start: oneDayAgo.toISOString(),
    analysis_period_end: now.toISOString(),
    articles_analyzed: 87,
  };

  try {
    const { data, error } = await supabase
      .from('news_analytics')
      .insert([mockData])
      .select();

    if (error) throw error;

    console.log('✅ Mock data inserted successfully!');
    console.log('\n📊 Data summary:');
    console.log(`  Hype Score: ${mockData.hype_score}%`);
    console.log(`  Substance Score: ${mockData.substance_score}%`);
    console.log(`  Domain Distribution:`, mockData.domain_distribution);
    console.log(`  Articles Analyzed: ${mockData.articles_analyzed}`);
    console.log('\n✨ Visit /en/news or /es/news to see the insights!\n');

  } catch (error: any) {
    console.error('❌ Error inserting mock data:', error.message);
    console.log('\n⚠️  Make sure the table exists first:');
    console.log('   npx tsx scripts/setup-news-analytics.ts\n');
    process.exit(1);
  }
}

insertMockData()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('💥 Fatal error:', err);
    process.exit(1);
  });
