-- Add saved searches table for users to save their favorite filter combinations

CREATE TABLE IF NOT EXISTS saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  filters JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_saved_searches_user_id ON saved_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_searches_created_at ON saved_searches(created_at DESC);

-- Enable RLS
ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;

-- Users can view their own saved searches
CREATE POLICY "Users can view their own saved searches"
  ON saved_searches FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own saved searches
CREATE POLICY "Users can create their own saved searches"
  ON saved_searches FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own saved searches
CREATE POLICY "Users can update their own saved searches"
  ON saved_searches FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own saved searches
CREATE POLICY "Users can delete their own saved searches"
  ON saved_searches FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON TABLE saved_searches IS 'Stores user saved search filter combinations';
COMMENT ON COLUMN saved_searches.name IS 'User-defined name for the saved search';
COMMENT ON COLUMN saved_searches.filters IS 'JSON object containing search filters (categories, date range, sort, quality)';
