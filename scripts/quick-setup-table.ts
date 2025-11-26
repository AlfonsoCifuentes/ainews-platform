/**
 * Quick script to create news_analytics table via Supabase HTTP API
 */

import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const SQL = `
CREATE TABLE IF NOT EXISTS news_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hype_score NUMERIC(5,2) DEFAULT 0 CHECK (hype_score >= 0 AND hype_score <= 100),
  substance_score NUMERIC(5,2) DEFAULT 0 CHECK (substance_score >= 0 AND substance_score <= 100),
  hype_keywords TEXT[] DEFAULT '{}',
  substance_keywords TEXT[] DEFAULT '{}',
  domain_distribution JSONB DEFAULT '{}',
  trending_topics JSONB DEFAULT '[]',
  sentiment_by_category JSONB DEFAULT '{}',
  company_activity JSONB DEFAULT '[]',
  analysis_period_start TIMESTAMPTZ NOT NULL,
  analysis_period_end TIMESTAMPTZ NOT NULL,
  articles_analyzed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_news_analytics_updated ON news_analytics(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_analytics_period ON news_analytics(analysis_period_end DESC);

ALTER TABLE news_analytics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access for news_analytics" ON news_analytics;
CREATE POLICY "Public read access for news_analytics" ON news_analytics FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role can insert/update news_analytics" ON news_analytics;
CREATE POLICY "Service role can insert/update news_analytics" ON news_analytics FOR ALL USING (auth.role() = 'service_role');
`;

async function createTableViaHTTP() {
  console.log('🚀 Attempting to create table via Supabase HTTP API...\n');

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ sql: SQL })
    });

    if (!response.ok) {
      const error = await response.text();
      console.log('⚠️  Direct SQL execution not available via REST API');
      console.log('📋 Please run the SQL manually in Supabase Dashboard\n');
      console.log('═'.repeat(70));
      console.log(SQL);
      console.log('═'.repeat(70));
      return false;
    }

    console.log('✅ Table created successfully!');
    return true;

  } catch (error: any) {
    console.log('⚠️  Could not create table automatically');
    console.log('\n📋 Manual setup required - Copy this SQL:\n');
    console.log('═'.repeat(70));
    console.log(SQL);
    console.log('═'.repeat(70));
    console.log('\n📍 Go to: Supabase Dashboard → SQL Editor → Paste → Run\n');
    return false;
  }
}

createTableViaHTTP()
  .then((success) => {
    if (success) {
      console.log('\n✨ Ready! Run: npx tsx scripts/analyze-news-insights.ts');
    }
    process.exit(success ? 0 : 1);
  });
