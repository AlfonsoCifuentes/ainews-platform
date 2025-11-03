-- Migration: Add user activity feed
-- Date: 2025-01-04

-- user_activities table
CREATE TABLE IF NOT EXISTS user_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL, -- 'article_read', 'course_started', 'course_completed', 'comment_posted', 'achievement_unlocked', 'level_up'
  title VARCHAR(255) NOT NULL,
  description TEXT,
  metadata JSONB, -- Flexible data for different activity types
  visibility VARCHAR(20) DEFAULT 'public', -- 'public', 'followers', 'private'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Indexes
  INDEX (user_id, created_at DESC),
  INDEX (activity_type),
  INDEX (visibility),
  INDEX (created_at DESC)
);

-- RLS Policies
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;

-- Public activities visible to all
CREATE POLICY "Public activities visible to all"
  ON user_activities
  FOR SELECT
  USING (visibility = 'public');

-- Followers-only activities visible to followers
CREATE POLICY "Followers can view followers-only activities"
  ON user_activities
  FOR SELECT
  USING (
    visibility = 'followers' 
    AND (
      user_id = auth.uid() 
      OR EXISTS (
        SELECT 1 FROM user_follows 
        WHERE follower_id = auth.uid() 
        AND following_id = user_activities.user_id
      )
    )
  );

-- Private activities only visible to owner
CREATE POLICY "Users can view own private activities"
  ON user_activities
  FOR SELECT
  USING (visibility = 'private' AND user_id = auth.uid());

-- Users can create their own activities
CREATE POLICY "Users can create own activities"
  ON user_activities
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own activities
CREATE POLICY "Users can update own activities"
  ON user_activities
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own activities
CREATE POLICY "Users can delete own activities"
  ON user_activities
  FOR DELETE
  USING (auth.uid() = user_id);

-- Comments
COMMENT ON TABLE user_activities IS 'User activity feed for social features';
COMMENT ON COLUMN user_activities.activity_type IS 'Type of activity for filtering and display';
COMMENT ON COLUMN user_activities.metadata IS 'Flexible JSON data specific to activity type';
COMMENT ON COLUMN user_activities.visibility IS 'Who can see this activity';
