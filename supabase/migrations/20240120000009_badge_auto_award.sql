-- Badge Auto-Award System Migration
-- This migration creates tables and functions for automatic badge awarding

-- Create badge_triggers table to store conditions for automatic badge awards
CREATE TABLE IF NOT EXISTS badge_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL, -- 'xp_threshold', 'streak_days', 'article_read', 'course_complete', 'comment_count', 'rating_given', 'share_count'
  trigger_condition JSONB NOT NULL, -- Flexible JSON for different conditions
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create badge_award_log table to track when and why badges were awarded
CREATE TABLE IF NOT EXISTS badge_award_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  awarded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  trigger_type TEXT NOT NULL,
  trigger_data JSONB, -- Additional data about what triggered the award
  auto_awarded BOOLEAN DEFAULT true
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_badge_triggers_badge_id ON badge_triggers(badge_id);
CREATE INDEX IF NOT EXISTS idx_badge_triggers_type ON badge_triggers(trigger_type);
CREATE INDEX IF NOT EXISTS idx_badge_triggers_active ON badge_triggers(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_badge_award_log_user ON badge_award_log(user_id);
CREATE INDEX IF NOT EXISTS idx_badge_award_log_badge ON badge_award_log(badge_id);
CREATE INDEX IF NOT EXISTS idx_badge_award_log_awarded_at ON badge_award_log(awarded_at DESC);

-- Function to check and award badges automatically
CREATE OR REPLACE FUNCTION check_and_award_badges(p_user_id UUID, p_trigger_type TEXT, p_trigger_data JSONB DEFAULT '{}')
RETURNS TABLE(badge_id UUID, badge_name TEXT, badge_icon TEXT) AS $$
DECLARE
  v_trigger RECORD;
  v_badge RECORD;
  v_user_badges UUID[];
  v_awarded_badges UUID[] := ARRAY[]::UUID[];
  v_user_stats RECORD;
BEGIN
  -- Get user's current badges
  SELECT ARRAY_AGG(ub.badge_id) INTO v_user_badges
  FROM user_badges ub
  WHERE ub.user_id = p_user_id;

  -- Get user stats
  SELECT 
    up.total_xp,
    up.current_streak,
    up.longest_streak,
    (SELECT COUNT(*) FROM article_reads WHERE user_id = p_user_id) as articles_read,
    (SELECT COUNT(*) FROM course_progress WHERE enrollment_id IN (
      SELECT id FROM course_enrollments WHERE user_id = p_user_id
    ) AND completed = true) as modules_completed,
    (SELECT COUNT(*) FROM course_enrollments WHERE user_id = p_user_id) as courses_enrolled,
    (SELECT COUNT(*) FROM comments WHERE user_id = p_user_id) as comments_count,
    (SELECT COUNT(*) FROM article_ratings WHERE user_id = p_user_id) as ratings_given,
    (SELECT COUNT(*) FROM bookmarks WHERE user_id = p_user_id) as bookmarks_count
  INTO v_user_stats
  FROM user_profiles up
  WHERE up.id = p_user_id;

  -- Loop through active triggers for the given type
  FOR v_trigger IN 
    SELECT bt.*, b.id as badge_id, b.name_en, b.icon
    FROM badge_triggers bt
    JOIN badges b ON b.id = bt.badge_id
    WHERE bt.trigger_type = p_trigger_type
    AND bt.is_active = true
    AND NOT (b.id = ANY(COALESCE(v_user_badges, ARRAY[]::UUID[])))
  LOOP
    -- Check if user meets the condition
    CASE v_trigger.trigger_type
      WHEN 'xp_threshold' THEN
        IF v_user_stats.total_xp >= (v_trigger.trigger_condition->>'threshold')::INTEGER THEN
          v_awarded_badges := array_append(v_awarded_badges, v_trigger.badge_id);
        END IF;

      WHEN 'streak_days' THEN
        IF v_user_stats.current_streak >= (v_trigger.trigger_condition->>'days')::INTEGER THEN
          v_awarded_badges := array_append(v_awarded_badges, v_trigger.badge_id);
        END IF;

      WHEN 'article_read' THEN
        IF v_user_stats.articles_read >= (v_trigger.trigger_condition->>'count')::INTEGER THEN
          v_awarded_badges := array_append(v_awarded_badges, v_trigger.badge_id);
        END IF;

      WHEN 'course_complete' THEN
        IF v_user_stats.modules_completed >= (v_trigger.trigger_condition->>'modules')::INTEGER THEN
          v_awarded_badges := array_append(v_awarded_badges, v_trigger.badge_id);
        END IF;

      WHEN 'comment_count' THEN
        IF v_user_stats.comments_count >= (v_trigger.trigger_condition->>'count')::INTEGER THEN
          v_awarded_badges := array_append(v_awarded_badges, v_trigger.badge_id);
        END IF;

      WHEN 'rating_given' THEN
        IF v_user_stats.ratings_given >= (v_trigger.trigger_condition->>'count')::INTEGER THEN
          v_awarded_badges := array_append(v_awarded_badges, v_trigger.badge_id);
        END IF;

      WHEN 'bookmark_count' THEN
        IF v_user_stats.bookmarks_count >= (v_trigger.trigger_condition->>'count')::INTEGER THEN
          v_awarded_badges := array_append(v_awarded_badges, v_trigger.badge_id);
        END IF;
    END CASE;
  END LOOP;

  -- Award badges and log
  FOR v_badge IN 
    SELECT b.id, b.name_en, b.icon
    FROM badges b
    WHERE b.id = ANY(v_awarded_badges)
  LOOP
    -- Insert into user_badges
    INSERT INTO user_badges (user_id, badge_id, awarded_at)
    VALUES (p_user_id, v_badge.id, NOW())
    ON CONFLICT DO NOTHING;

    -- Log the award
    INSERT INTO badge_award_log (user_id, badge_id, trigger_type, trigger_data, auto_awarded)
    VALUES (p_user_id, v_badge.id, p_trigger_type, p_trigger_data, true);

    -- Return the awarded badge
    RETURN QUERY SELECT v_badge.id, v_badge.name_en, v_badge.icon;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default badge triggers
INSERT INTO badge_triggers (badge_id, trigger_type, trigger_condition) 
SELECT id, 'xp_threshold', '{"threshold": 100}'::jsonb 
FROM badges WHERE name_en = 'First Steps' 
ON CONFLICT DO NOTHING;

INSERT INTO badge_triggers (badge_id, trigger_type, trigger_condition)
SELECT id, 'xp_threshold', '{"threshold": 1000}'::jsonb
FROM badges WHERE name_en = 'Knowledge Seeker'
ON CONFLICT DO NOTHING;

INSERT INTO badge_triggers (badge_id, trigger_type, trigger_condition)
SELECT id, 'xp_threshold', '{"threshold": 5000}'::jsonb
FROM badges WHERE name_en = 'AI Expert'
ON CONFLICT DO NOTHING;

INSERT INTO badge_triggers (badge_id, trigger_type, trigger_condition)
SELECT id, 'xp_threshold', '{"threshold": 10000}'::jsonb
FROM badges WHERE name_en = 'AI Master'
ON CONFLICT DO NOTHING;

INSERT INTO badge_triggers (badge_id, trigger_type, trigger_condition)
SELECT id, 'streak_days', '{"days": 7}'::jsonb
FROM badges WHERE name_en = 'Week Warrior'
ON CONFLICT DO NOTHING;

INSERT INTO badge_triggers (badge_id, trigger_type, trigger_condition)
SELECT id, 'streak_days', '{"days": 30}'::jsonb
FROM badges WHERE name_en = 'Month Master'
ON CONFLICT DO NOTHING;

INSERT INTO badge_triggers (badge_id, trigger_type, trigger_condition)
SELECT id, 'article_read', '{"count": 10}'::jsonb
FROM badges WHERE name_en = 'News Junkie'
ON CONFLICT DO NOTHING;

INSERT INTO badge_triggers (badge_id, trigger_type, trigger_condition)
SELECT id, 'article_read', '{"count": 100}'::jsonb
FROM badges WHERE name_en = 'News Expert'
ON CONFLICT DO NOTHING;

INSERT INTO badge_triggers (badge_id, trigger_type, trigger_condition)
SELECT id, 'course_complete', '{"modules": 5}'::jsonb
FROM badges WHERE name_en = 'Quick Learner'
ON CONFLICT DO NOTHING;

INSERT INTO badge_triggers (badge_id, trigger_type, trigger_condition)
SELECT id, 'course_complete', '{"modules": 20}'::jsonb
FROM badges WHERE name_en = 'Dedicated Student'
ON CONFLICT DO NOTHING;

INSERT INTO badge_triggers (badge_id, trigger_type, trigger_condition)
SELECT id, 'comment_count', '{"count": 10}'::jsonb
FROM badges WHERE name_en = 'Conversationalist'
ON CONFLICT DO NOTHING;

INSERT INTO badge_triggers (badge_id, trigger_type, trigger_condition)
SELECT id, 'rating_given', '{"count": 20}'::jsonb
FROM badges WHERE name_en = 'Helpful Reviewer'
ON CONFLICT DO NOTHING;

-- RLS Policies
ALTER TABLE badge_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE badge_award_log ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read badge triggers (needed for displaying badge requirements)
CREATE POLICY "Badge triggers are viewable by everyone"
  ON badge_triggers FOR SELECT
  USING (true);

-- Only service role can modify badge triggers
CREATE POLICY "Badge triggers can be modified by service role"
  ON badge_triggers FOR ALL
  USING (auth.role() = 'service_role');

-- Users can view their own badge award log
CREATE POLICY "Users can view their own badge award log"
  ON badge_award_log FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role can insert into badge award log
CREATE POLICY "Badge award log can be inserted by service role"
  ON badge_award_log FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION check_and_award_badges TO authenticated;
GRANT EXECUTE ON FUNCTION check_and_award_badges TO service_role;
