-- Add category field to courses table
ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS category TEXT;

-- Create index for category filtering
CREATE INDEX IF NOT EXISTS idx_courses_category ON courses(category);

-- Add search index for full-text search
CREATE INDEX IF NOT EXISTS idx_courses_search_en ON courses USING GIN(to_tsvector('english', title_en || ' ' || description_en));
CREATE INDEX IF NOT EXISTS idx_courses_search_es ON courses USING GIN(to_tsvector('spanish', title_es || ' ' || description_es));

-- Update existing courses with default category
UPDATE courses 
SET category = 'general' 
WHERE category IS NULL;

-- Add view count for popularity tracking
ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_courses_views ON courses(view_count DESC);
