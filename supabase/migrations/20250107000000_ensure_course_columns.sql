-- Ensure courses table has all required columns with proper defaults
ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS enrollment_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS rating_avg NUMERIC(2,1) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS completion_rate NUMERIC(3,2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general',
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived'));

-- Ensure all existing courses have proper values
UPDATE courses 
SET 
  view_count = COALESCE(view_count, 0),
  enrollment_count = COALESCE(enrollment_count, 0),
  rating_avg = COALESCE(rating_avg, 0.0),
  completion_rate = COALESCE(completion_rate, 0.0),
  category = COALESCE(category, 'general'),
  status = COALESCE(status, 'published')
WHERE 
  view_count IS NULL 
  OR enrollment_count IS NULL 
  OR rating_avg IS NULL 
  OR completion_rate IS NULL
  OR category IS NULL
  OR status IS NULL;

-- Create or replace indexes for better performance
CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status);
CREATE INDEX IF NOT EXISTS idx_courses_category ON courses(category);
CREATE INDEX IF NOT EXISTS idx_courses_difficulty ON courses(difficulty);
CREATE INDEX IF NOT EXISTS idx_courses_views ON courses(view_count DESC);
CREATE INDEX IF NOT EXISTS idx_courses_rating ON courses(rating_avg DESC);
CREATE INDEX IF NOT EXISTS idx_courses_created ON courses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_courses_published ON courses(published_at DESC);

-- Ensure topics column exists and is properly indexed
ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS topics TEXT[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_courses_topics ON courses USING GIN(topics);

-- Add full-text search indexes if not exists
CREATE INDEX IF NOT EXISTS idx_courses_search_en 
ON courses USING GIN(to_tsvector('english', title_en || ' ' || description_en));

CREATE INDEX IF NOT EXISTS idx_courses_search_es 
ON courses USING GIN(to_tsvector('spanish', title_es || ' ' || description_es));
