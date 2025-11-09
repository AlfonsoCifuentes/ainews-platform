-- Migration: Create image_visual_hashes table
-- Created: 2025-11-09
-- Purpose: Store perceptual hashes of images for duplicate detection using visual similarity

CREATE TABLE IF NOT EXISTS image_visual_hashes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url VARCHAR(1000) NOT NULL,
  perceptual_hash VARCHAR(64) NOT NULL,
  hamming_distance INTEGER DEFAULT 0,
  article_id UUID REFERENCES news_articles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_image_visual_hashes_url 
  ON image_visual_hashes(image_url);

CREATE INDEX IF NOT EXISTS idx_image_visual_hashes_hash 
  ON image_visual_hashes(perceptual_hash);

CREATE INDEX IF NOT EXISTS idx_image_visual_hashes_article 
  ON image_visual_hashes(article_id);

CREATE INDEX IF NOT EXISTS idx_image_visual_hashes_created 
  ON image_visual_hashes(created_at DESC);

-- Add comments for documentation
COMMENT ON TABLE image_visual_hashes IS 'Perceptual hashes for image duplicate detection';
COMMENT ON COLUMN image_visual_hashes.image_url IS 'URL of the image';
COMMENT ON COLUMN image_visual_hashes.perceptual_hash IS 'dHash (difference hash) for visual similarity comparison';
COMMENT ON COLUMN image_visual_hashes.hamming_distance IS 'Hamming distance for similarity threshold (0 = exact duplicate)';
COMMENT ON COLUMN image_visual_hashes.article_id IS 'Reference to the article using this image';
COMMENT ON COLUMN image_visual_hashes.created_at IS 'Timestamp when hash was calculated';

-- Enable Row Level Security
ALTER TABLE image_visual_hashes ENABLE ROW LEVEL SECURITY;

-- Create policy for anonymous read access (needed for public article viewing)
CREATE POLICY "Allow anonymous read access to image_visual_hashes"
  ON image_visual_hashes FOR SELECT
  TO anon
  USING (true);

-- Create policy for service role full access
CREATE POLICY "Allow service role full access to image_visual_hashes"
  ON image_visual_hashes
  TO service_role
  USING (true)
  WITH CHECK (true);
