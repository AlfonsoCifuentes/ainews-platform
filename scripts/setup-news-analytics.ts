/**
 * Create news_analytics table directly using Supabase REST API
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTable() {
  console.log('🚀 Creating news_analytics table via Supabase...\n');
  
  // First, let's try to query the table to see if it exists
  const { data, error } = await supabase
    .from('news_analytics')
    .select('id')
    .limit(1);

  if (!error) {
    console.log('✅ Table already exists!');
    console.log('📊 Ready to run analysis.\n');
    return true;
  }

  // Table doesn't exist - PGRST204 or PGRST205
  if (error.code !== 'PGRST204' && error.code !== 'PGRST205') {
    console.error('❌ Unexpected error:', error);
    return false;
  }

  console.log('⚠️  Table does not exist yet.');
  console.log('\n📋 Please run this SQL in your Supabase SQL Editor:\n');
  console.log('═'.repeat(70));
  console.log(`
CREATE TABLE IF NOT EXISTS news_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Hype Detector metrics
  hype_score NUMERIC(5,2) DEFAULT 0 CHECK (hype_score >= 0 AND hype_score <= 100),
  substance_score NUMERIC(5,2) DEFAULT 0 CHECK (substance_score >= 0 AND substance_score <= 100),
  hype_keywords TEXT[] DEFAULT '{}',
  substance_keywords TEXT[] DEFAULT '{}',
  
  -- Domain Distribution (CV, NLP, Robotics, Ethics, Tools)
  domain_distribution JSONB DEFAULT '{}',
  
  -- Trending Topics
  trending_topics JSONB DEFAULT '[]',
  
  -- Sentiment Analysis by category
  sentiment_by_category JSONB DEFAULT '{}',
  
  -- Company activity tracking
  company_activity JSONB DEFAULT '[]',
  
  -- Metadata
  analysis_period_start TIMESTAMPTZ NOT NULL,
  analysis_period_end TIMESTAMPTZ NOT NULL,
  articles_analyzed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_news_analytics_updated 
ON news_analytics(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_news_analytics_period 
ON news_analytics(analysis_period_end DESC);

-- Enable Row Level Security
ALTER TABLE news_analytics ENABLE ROW LEVEL SECURITY;

-- Policy: Public read access
CREATE POLICY "Public read access for news_analytics" 
ON news_analytics FOR SELECT 
USING (true);

-- Policy: Service role can insert/update
CREATE POLICY "Service role can insert/update news_analytics" 
ON news_analytics FOR ALL 
USING (auth.role() = 'service_role');
`);
  console.log('═'.repeat(70));
  console.log('\n📍 Steps:');
  console.log('  1. Go to https://supabase.com/dashboard/project/[your-project]/sql/new');
  console.log('  2. Copy the SQL above');
  console.log('  3. Paste and click "Run"');
  console.log('  4. Come back and run: npx tsx scripts/analyze-news-insights.ts\n');
  
  return false;
}

createTable()
  .then((exists) => {
    if (exists) {
      console.log('✨ Next step: Run analysis');
      console.log('   npx tsx scripts/analyze-news-insights.ts\n');
      process.exit(0);
    } else {
      process.exit(1);
    }
  })
  .catch((err) => {
    console.error('💥 Fatal error:', err);
    process.exit(1);
  });
