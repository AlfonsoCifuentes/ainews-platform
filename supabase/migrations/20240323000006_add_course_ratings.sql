-- Create course_ratings table
CREATE TABLE IF NOT EXISTS course_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL, -- Will be UUID when auth is implemented
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_en TEXT,
  review_es TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Prevent duplicate ratings
  UNIQUE(course_id, user_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_course_ratings_course_id ON course_ratings(course_id);
CREATE INDEX IF NOT EXISTS idx_course_ratings_user_id ON course_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_course_ratings_rating ON course_ratings(rating);
CREATE INDEX IF NOT EXISTS idx_course_ratings_created_at ON course_ratings(created_at DESC);

-- Function to update course rating average
CREATE OR REPLACE FUNCTION update_course_rating_avg()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE courses
  SET rating_avg = (
    SELECT COALESCE(AVG(rating), 0)
    FROM course_ratings
    WHERE course_id = COALESCE(NEW.course_id, OLD.course_id)
  )
  WHERE id = COALESCE(NEW.course_id, OLD.course_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update rating_avg on insert/update/delete
DROP TRIGGER IF EXISTS trigger_update_course_rating_avg ON course_ratings;
CREATE TRIGGER trigger_update_course_rating_avg
AFTER INSERT OR UPDATE OR DELETE ON course_ratings
FOR EACH ROW
EXECUTE FUNCTION update_course_rating_avg();

-- Add RLS policies
ALTER TABLE course_ratings ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read ratings
CREATE POLICY "Anyone can read course ratings"
  ON course_ratings FOR SELECT
  USING (true);

-- Allow authenticated users to insert their own ratings
CREATE POLICY "Users can insert their own ratings"
  ON course_ratings FOR INSERT
  WITH CHECK (true); -- Will be restricted to auth.uid() when auth is implemented

-- Allow users to update their own ratings
CREATE POLICY "Users can update their own ratings"
  ON course_ratings FOR UPDATE
  USING (true) -- Will be restricted to user_id = auth.uid() when auth is implemented
  WITH CHECK (true);

-- Allow users to delete their own ratings
CREATE POLICY "Users can delete their own ratings"
  ON course_ratings FOR DELETE
  USING (true); -- Will be restricted to user_id = auth.uid() when auth is implemented
