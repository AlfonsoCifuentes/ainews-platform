#!/usr/bin/env node
/**
 * Direct SQL execution via Supabase REST API
 */

import 'dotenv/config';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const SQL_1 = `
ALTER TABLE news_articles
  ADD COLUMN IF NOT EXISTS image_width INTEGER,
  ADD COLUMN IF NOT EXISTS image_height INTEGER,
  ADD COLUMN IF NOT EXISTS image_mime VARCHAR(50),
  ADD COLUMN IF NOT EXISTS image_bytes INTEGER,
  ADD COLUMN IF NOT EXISTS blur_data_url TEXT,
  ADD COLUMN IF NOT EXISTS image_hash VARCHAR(64),
  ADD COLUMN IF NOT EXISTS image_alt_text_en VARCHAR(500),
  ADD COLUMN IF NOT EXISTS image_alt_text_es VARCHAR(500),
  ADD COLUMN IF NOT EXISTS link_normalized VARCHAR(500);
`;

const SQL_2 = `
CREATE INDEX IF NOT EXISTS idx_news_articles_image_hash ON news_articles(image_hash);
CREATE INDEX IF NOT EXISTS idx_news_articles_link ON news_articles(link);
CREATE INDEX IF NOT EXISTS idx_news_articles_category_created ON news_articles(category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_articles_source ON news_articles(source);
`;

const SQL_3 = `
CREATE TABLE IF NOT EXISTS image_visual_hashes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url VARCHAR(1000) NOT NULL,
  perceptual_hash VARCHAR(64) NOT NULL,
  hamming_distance INTEGER DEFAULT 0,
  article_id UUID REFERENCES news_articles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
`;

const SQL_4 = `
CREATE INDEX IF NOT EXISTS idx_image_visual_hashes_url ON image_visual_hashes(image_url);
CREATE INDEX IF NOT EXISTS idx_image_visual_hashes_hash ON image_visual_hashes(perceptual_hash);
CREATE INDEX IF NOT EXISTS idx_image_visual_hashes_article ON image_visual_hashes(article_id);
CREATE INDEX IF NOT EXISTS idx_image_visual_hashes_created ON image_visual_hashes(created_at DESC);
`;

const SQL_5 = `
ALTER TABLE image_visual_hashes ENABLE ROW LEVEL SECURITY;
`;

const SQL_6 = `
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'image_visual_hashes' AND policyname = 'Allow anonymous read access to image_visual_hashes'
  ) THEN
    CREATE POLICY "Allow anonymous read access to image_visual_hashes"
      ON image_visual_hashes FOR SELECT TO anon USING (true);
  END IF;
END $$;
`;

const SQL_7 = `
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'image_visual_hashes' AND policyname = 'Allow service role full access to image_visual_hashes'
  ) THEN
    CREATE POLICY "Allow service role full access to image_visual_hashes"
      ON image_visual_hashes TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
`;

async function executeSQL(sql: string, name: string) {
  console.log(`\n🔧 Executing: ${name}`);
  
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({ query: sql })
    });

    if (response.ok) {
      console.log(`   ✅ SUCCESS`);
      return true;
    } else {
      const text = await response.text();
      console.log(`   ⚠️  Response: ${response.status} - ${text.slice(0, 100)}`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ ERROR: ${error instanceof Error ? error.message : error}`);
    return false;
  }
}

async function main() {
  console.log('🚀 Applying migrations directly...\n');
  
  const migrations = [
    { sql: SQL_1, name: 'Add image metadata columns' },
    { sql: SQL_2, name: 'Create indexes for news_articles' },
    { sql: SQL_3, name: 'Create image_visual_hashes table' },
    { sql: SQL_4, name: 'Create indexes for image_visual_hashes' },
    { sql: SQL_5, name: 'Enable RLS on image_visual_hashes' },
    { sql: SQL_6, name: 'Create anonymous read policy' },
    { sql: SQL_7, name: 'Create service role policy' },
  ];

  let successCount = 0;
  
  for (const { sql, name } of migrations) {
    const success = await executeSQL(sql, name);
    if (success) successCount++;
  }

  console.log(`\n📊 Results: ${successCount}/${migrations.length} executed`);
  
  if (successCount === 0) {
    console.log('\n⚠️  API execution not supported. Applying via direct import...\n');
    
    // Fallback: Use Supabase client with raw query
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    
    console.log('📝 Attempting via Supabase client...\n');
    
    // Try using postgres changes subscription as a workaround
    for (const { sql, name } of migrations) {
      console.log(`🔧 ${name}`);
      try {
        // Use the SQL editor endpoint directly
        const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SERVICE_KEY,
            'Authorization': `Bearer ${SERVICE_KEY}`,
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify({ query: sql })
        });
        
        console.log(`   Status: ${response.status}`);
      } catch (err) {
        console.log(`   ❌ Failed`);
      }
    }
  }
  
  console.log('\n🎯 MANUAL EXECUTION REQUIRED');
  console.log('=' .repeat(80));
  console.log('\n📋 Copy this SQL to Supabase SQL Editor:');
  console.log('🔗 https://supabase.com/dashboard/project/yabsciwdpblqzskfupnj/sql/new\n');
  console.log('```sql');
  console.log([SQL_1, SQL_2, SQL_3, SQL_4, SQL_5, SQL_6.replace(/DO \$\$[\s\S]+?\$\$/g, 'CREATE POLICY IF NOT EXISTS "Allow anonymous read access to image_visual_hashes" ON image_visual_hashes FOR SELECT TO anon USING (true)'), SQL_7.replace(/DO \$\$[\s\S]+?\$\$/g, 'CREATE POLICY IF NOT EXISTS "Allow service role full access to image_visual_hashes" ON image_visual_hashes TO service_role USING (true) WITH CHECK (true)')].join('\n\n'));
  console.log('```\n');
}

main();
