-- Migration: Add image metadata columns to news_articles
-- Created: 2025-11-04
-- Purpose: Store image dimensions, LQIP (blur placeholder), mime type and hash for better UX and deduplication

-- Add new columns for image metadata
ALTER TABLE news_articles
  ADD COLUMN IF NOT EXISTS image_width INTEGER,
  ADD COLUMN IF NOT EXISTS image_height INTEGER,
  ADD COLUMN IF NOT EXISTS image_mime VARCHAR(50),
  ADD COLUMN IF NOT EXISTS image_bytes INTEGER,
  ADD COLUMN IF NOT EXISTS blur_data_url TEXT,
  ADD COLUMN IF NOT EXISTS image_hash VARCHAR(64),
  ADD COLUMN IF NOT EXISTS image_alt_text_en VARCHAR(500),
  ADD COLUMN IF NOT EXISTS image_alt_text_es VARCHAR(500);

-- Add index on image_hash for faster duplicate detection
CREATE INDEX IF NOT EXISTS idx_news_articles_image_hash 
  ON news_articles(image_hash);

-- Add index on link for faster canonical checks
CREATE INDEX IF NOT EXISTS idx_news_articles_link 
  ON news_articles(link);

-- Add composite index for common queries
CREATE INDEX IF NOT EXISTS idx_news_articles_category_created 
  ON news_articles(category, created_at DESC);

-- Add index on source for filtering
CREATE INDEX IF NOT EXISTS idx_news_articles_source 
  ON news_articles(source);

-- Add normalized link column for deduplication
ALTER TABLE news_articles
  ADD COLUMN IF NOT EXISTS link_normalized VARCHAR(500);

-- Create unique constraint on normalized link (after populating)
-- This will be enabled after backfilling existing data
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_news_articles_link_normalized_unique 
--   ON news_articles(link_normalized) 
--   WHERE link_normalized IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN news_articles.image_width IS 'Image width in pixels (null if unknown)';
COMMENT ON COLUMN news_articles.image_height IS 'Image height in pixels (null if unknown)';
COMMENT ON COLUMN news_articles.image_mime IS 'Image MIME type (e.g., image/jpeg, image/webp)';
COMMENT ON COLUMN news_articles.image_bytes IS 'Image size in bytes';
COMMENT ON COLUMN news_articles.blur_data_url IS 'Base64-encoded LQIP (Low Quality Image Placeholder) for blur effect';
COMMENT ON COLUMN news_articles.image_hash IS 'MD5 hash of image URL for duplicate detection';
COMMENT ON COLUMN news_articles.image_alt_text_en IS 'English alt text for image accessibility';
COMMENT ON COLUMN news_articles.image_alt_text_es IS 'Spanish alt text for image accessibility';
COMMENT ON COLUMN news_articles.link_normalized IS 'Normalized article URL (canonical, stripped of tracking params)';
