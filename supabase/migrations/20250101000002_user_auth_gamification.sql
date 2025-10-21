-- User Authentication and Profile Extensions
-- Add user profiles, progress tracking, and gamification

-- User profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  preferred_locale TEXT DEFAULT 'en' CHECK (preferred_locale IN ('en', 'es')),
  
  -- Gamification
  total_xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  streak_days INTEGER DEFAULT 0,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Preferences
  email_notifications BOOLEAN DEFAULT true,
  weekly_digest BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Badges table
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL CHECK (badge_type IN (
    'first_course', 'course_master', 'speed_learner', 'perfect_score',
    'week_streak', 'month_streak', 'year_streak', 'early_adopter',
    'contributor', 'helpful', 'news_reader', 'course_creator'
  )),
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  
  UNIQUE(user_id, badge_type)
);

-- User saved articles
CREATE TABLE IF NOT EXISTS user_saved_articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES news_articles(id) ON DELETE CASCADE,
  saved_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  
  UNIQUE(user_id, article_id)
);

-- User course enrollments
CREATE TABLE IF NOT EXISTS user_course_enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Progress tracking
  modules_completed INTEGER DEFAULT 0,
  total_modules INTEGER NOT NULL,
  current_module_id UUID REFERENCES course_modules(id),
  
  -- Performance
  average_quiz_score DECIMAL(3,2) DEFAULT 0.00,
  time_spent_minutes INTEGER DEFAULT 0,
  
  UNIQUE(user_id, course_id)
);

-- Notification preferences
CREATE TABLE IF NOT EXISTS user_notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN (
    'new_articles', 'course_updates', 'weekly_digest', 'achievements',
    'recommendations', 'system_updates'
  )),
  enabled BOOLEAN DEFAULT true,
  frequency TEXT DEFAULT 'instant' CHECK (frequency IN ('instant', 'daily', 'weekly')),
  
  UNIQUE(user_id, notification_type)
);

-- Leaderboard view (materialized for performance)
CREATE MATERIALIZED VIEW leaderboard_weekly AS
SELECT 
  up.id,
  up.display_name,
  up.avatar_url,
  up.total_xp,
  up.level,
  COUNT(DISTINCT uce.course_id) as courses_completed,
  COUNT(DISTINCT ub.badge_type) as badges_earned,
  ROW_NUMBER() OVER (ORDER BY up.total_xp DESC) as rank
FROM user_profiles up
LEFT JOIN user_course_enrollments uce ON up.id = uce.user_id AND uce.completed_at IS NOT NULL
LEFT JOIN user_badges ub ON up.id = ub.user_id
WHERE up.last_activity_at >= NOW() - INTERVAL '7 days'
GROUP BY up.id, up.display_name, up.avatar_url, up.total_xp, up.level
ORDER BY up.total_xp DESC
LIMIT 100;

-- Create index for leaderboard refresh
CREATE UNIQUE INDEX ON leaderboard_weekly (id);

-- Function to refresh leaderboard
CREATE OR REPLACE FUNCTION refresh_leaderboard()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_weekly;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate XP for activity
CREATE OR REPLACE FUNCTION award_xp(
  p_user_id UUID,
  p_activity_type TEXT,
  p_amount INTEGER DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_xp_amount INTEGER;
  v_new_total INTEGER;
  v_new_level INTEGER;
BEGIN
  -- Calculate XP based on activity type
  v_xp_amount := COALESCE(p_amount, 
    CASE p_activity_type
      WHEN 'complete_module' THEN 50
      WHEN 'complete_course' THEN 200
      WHEN 'perfect_quiz' THEN 25
      WHEN 'daily_login' THEN 10
      WHEN 'save_article' THEN 5
      WHEN 'share_content' THEN 15
      ELSE 0
    END
  );
  
  -- Update user XP
  UPDATE user_profiles
  SET 
    total_xp = total_xp + v_xp_amount,
    level = FLOOR(SQRT((total_xp + v_xp_amount) / 100)) + 1,
    last_activity_at = NOW(),
    updated_at = NOW()
  WHERE id = p_user_id
  RETURNING total_xp, level INTO v_new_total, v_new_level;
  
  -- Check for level-up badges
  IF v_new_level >= 10 AND NOT EXISTS (
    SELECT 1 FROM user_badges WHERE user_id = p_user_id AND badge_type = 'course_master'
  ) THEN
    INSERT INTO user_badges (user_id, badge_type) VALUES (p_user_id, 'course_master');
  END IF;
  
  RETURN v_xp_amount;
END;
$$ LANGUAGE plpgsql;

-- Function to update streak
CREATE OR REPLACE FUNCTION update_user_streak(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_last_activity TIMESTAMPTZ;
  v_current_streak INTEGER;
BEGIN
  SELECT last_activity_at, streak_days
  INTO v_last_activity, v_current_streak
  FROM user_profiles
  WHERE id = p_user_id;
  
  -- Check if activity is today or yesterday
  IF v_last_activity::DATE = CURRENT_DATE THEN
    -- Same day, no change
    RETURN v_current_streak;
  ELSIF v_last_activity::DATE = CURRENT_DATE - INTERVAL '1 day' THEN
    -- Consecutive day, increment streak
    UPDATE user_profiles
    SET 
      streak_days = streak_days + 1,
      last_activity_at = NOW()
    WHERE id = p_user_id;
    
    -- Award badges for streaks
    IF v_current_streak + 1 = 7 THEN
      INSERT INTO user_badges (user_id, badge_type) 
      VALUES (p_user_id, 'week_streak')
      ON CONFLICT DO NOTHING;
    ELSIF v_current_streak + 1 = 30 THEN
      INSERT INTO user_badges (user_id, badge_type)
      VALUES (p_user_id, 'month_streak')
      ON CONFLICT DO NOTHING;
    END IF;
    
    RETURN v_current_streak + 1;
  ELSE
    -- Streak broken, reset
    UPDATE user_profiles
    SET 
      streak_days = 1,
      last_activity_at = NOW()
    WHERE id = p_user_id;
    
    RETURN 1;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Triggers for auto-updating timestamps
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_saved_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

-- Public can view leaderboard (top 100)
CREATE POLICY "Public can view leaderboard"
  ON user_profiles FOR SELECT
  USING (
    id IN (
      SELECT id FROM user_profiles
      ORDER BY total_xp DESC
      LIMIT 100
    )
  );

-- Users can manage their own badges
CREATE POLICY "Users can view own badges"
  ON user_badges FOR SELECT
  USING (auth.uid() = user_id);

-- Users can manage saved articles
CREATE POLICY "Users can manage saved articles"
  ON user_saved_articles FOR ALL
  USING (auth.uid() = user_id);

-- Users can manage course enrollments
CREATE POLICY "Users can manage enrollments"
  ON user_course_enrollments FOR ALL
  USING (auth.uid() = user_id);

-- Users can manage notification preferences
CREATE POLICY "Users can manage notifications"
  ON user_notification_preferences FOR ALL
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_user_profiles_xp ON user_profiles(total_xp DESC);
CREATE INDEX idx_user_profiles_level ON user_profiles(level DESC);
CREATE INDEX idx_user_badges_user ON user_badges(user_id);
CREATE INDEX idx_user_saved_articles_user ON user_saved_articles(user_id);
CREATE INDEX idx_user_enrollments_user ON user_course_enrollments(user_id);
CREATE INDEX idx_user_enrollments_course ON user_course_enrollments(course_id);
