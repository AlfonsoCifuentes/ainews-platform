-- Ensure courses table has all required columns with proper defaults
-- This migration adds missing columns that may have been omitted in initial schema

-- Add view_count if missing (for analytics)
ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- Add category if missing (for course categorization)
ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general';

-- Update existing courses to have proper default values
UPDATE courses 
SET 
  view_count = COALESCE(view_count, 0),
  category = COALESCE(category, 'general')
WHERE 
  view_count IS NULL 
  OR category IS NULL;

-- Create or replace indexes for better performance
CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status);
CREATE INDEX IF NOT EXISTS idx_courses_category ON courses(category);
CREATE INDEX IF NOT EXISTS idx_courses_difficulty ON courses(difficulty);
CREATE INDEX IF NOT EXISTS idx_courses_views ON courses(view_count DESC);
CREATE INDEX IF NOT EXISTS idx_courses_rating ON courses(rating_avg DESC);
CREATE INDEX IF NOT EXISTS idx_courses_created ON courses(created_at DESC);

-- Ensure published_at column exists (for sorting published courses)
ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_courses_published ON courses(published_at DESC);

-- Ensure topics column exists and is properly indexed
-- (Already in initial schema but just in case)
ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS topics TEXT[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_courses_topics ON courses USING GIN(topics);

-- Add full-text search indexes if not exists
CREATE INDEX IF NOT EXISTS idx_courses_search_en 
ON courses USING GIN(to_tsvector('english', title_en || ' ' || description_en));

CREATE INDEX IF NOT EXISTS idx_courses_search_es 
ON courses USING GIN(to_tsvector('spanish', title_es || ' ' || description_es));
