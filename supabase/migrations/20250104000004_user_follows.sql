-- Migration: Add user follow system
-- Date: 2025-01-04

-- user_follows table
CREATE TABLE IF NOT EXISTS user_follows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Prevent self-follows and duplicates
  CHECK (follower_id != following_id),
  UNIQUE (follower_id, following_id),
  
  -- Indexes for performance
  INDEX (follower_id),
  INDEX (following_id),
  INDEX (created_at DESC)
);

-- RLS Policies
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;

-- Anyone can view follows
CREATE POLICY "Anyone can view follows"
  ON user_follows
  FOR SELECT
  USING (true);

-- Authenticated users can create follows
CREATE POLICY "Users can follow others"
  ON user_follows
  FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

-- Users can delete their own follows
CREATE POLICY "Users can unfollow"
  ON user_follows
  FOR DELETE
  USING (auth.uid() = follower_id);

-- Comments
COMMENT ON TABLE user_follows IS 'User follow/following relationships';
COMMENT ON COLUMN user_follows.follower_id IS 'User who is following';
COMMENT ON COLUMN user_follows.following_id IS 'User being followed';
