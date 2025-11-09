-- =====================================================
-- MIGRATIONS FOR AINEWS PLATFORM
-- Execute this in Supabase SQL Editor
-- URL: https://supabase.com/dashboard/project/yabsciwdpblqzskfupnj/sql/new
-- =====================================================

-- Migration 1: Add image metadata columns to news_articles
ALTER TABLE news_articles
  ADD COLUMN IF NOT EXISTS image_width INTEGER,
  ADD COLUMN IF NOT EXISTS image_height INTEGER,
  ADD COLUMN IF NOT EXISTS image_mime VARCHAR(50),
  ADD COLUMN IF NOT EXISTS image_bytes INTEGER,
  ADD COLUMN IF NOT EXISTS image_hash VARCHAR(64),
  ADD COLUMN IF NOT EXISTS image_alt_text_en VARCHAR(500),
  ADD COLUMN IF NOT EXISTS image_alt_text_es VARCHAR(500),
  ADD COLUMN IF NOT EXISTS link_normalized VARCHAR(500);

-- Migration 2: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_news_articles_image_hash ON news_articles(image_hash);
CREATE INDEX IF NOT EXISTS idx_news_articles_source_url ON news_articles(source_url);
CREATE INDEX IF NOT EXISTS idx_news_articles_category_created ON news_articles(category, created_at DESC);

-- Migration 3: Create image_visual_hashes table for duplicate detection
CREATE TABLE IF NOT EXISTS image_visual_hashes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url VARCHAR(1000) NOT NULL,
  perceptual_hash VARCHAR(64) NOT NULL,
  hamming_distance INTEGER DEFAULT 0,
  article_id UUID REFERENCES news_articles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migration 4: Create indexes for image_visual_hashes
CREATE INDEX IF NOT EXISTS idx_image_visual_hashes_url ON image_visual_hashes(image_url);
CREATE INDEX IF NOT EXISTS idx_image_visual_hashes_hash ON image_visual_hashes(perceptual_hash);
CREATE INDEX IF NOT EXISTS idx_image_visual_hashes_article ON image_visual_hashes(article_id);
CREATE INDEX IF NOT EXISTS idx_image_visual_hashes_created ON image_visual_hashes(created_at DESC);

-- Migration 5: Enable Row Level Security
ALTER TABLE image_visual_hashes ENABLE ROW LEVEL SECURITY;

-- Migration 6: Create RLS policies (with safe existence check)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'image_visual_hashes' 
    AND policyname = 'Allow anonymous read access to image_visual_hashes'
  ) THEN
    CREATE POLICY "Allow anonymous read access to image_visual_hashes"
      ON image_visual_hashes FOR SELECT TO anon USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'image_visual_hashes' 
    AND policyname = 'Allow service role full access to image_visual_hashes'
  ) THEN
    CREATE POLICY "Allow service role full access to image_visual_hashes"
      ON image_visual_hashes TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
