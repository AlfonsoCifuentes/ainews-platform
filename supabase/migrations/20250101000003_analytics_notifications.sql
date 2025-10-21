-- Add table to track XP history for weekly digest calculations
CREATE TABLE IF NOT EXISTS user_xp_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  total_xp INTEGER NOT NULL DEFAULT 0,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add index for efficient queries
CREATE INDEX idx_user_xp_history_user_time ON user_xp_history(user_id, recorded_at DESC);

-- Add search_queries table for analytics
CREATE TABLE IF NOT EXISTS search_queries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES user_profiles(user_id) ON DELETE SET NULL,
  query TEXT NOT NULL,
  locale VARCHAR(2) NOT NULL,
  semantic BOOLEAN DEFAULT false,
  filters JSONB,
  results_count INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for analytics queries
CREATE INDEX idx_search_queries_created_at ON search_queries(created_at DESC);
CREATE INDEX idx_search_queries_user ON search_queries(user_id, created_at DESC);
CREATE INDEX idx_search_queries_locale ON search_queries(locale, created_at DESC);

-- Add analytics view for admins
CREATE OR REPLACE VIEW analytics_overview AS
SELECT
  (SELECT COUNT(*) FROM user_profiles) AS total_users,
  (SELECT COUNT(*) FROM user_profiles WHERE last_activity_at > NOW() - INTERVAL '7 days') AS active_users_week,
  (SELECT COUNT(*) FROM user_profiles WHERE last_activity_at > NOW() - INTERVAL '30 days') AS active_users_month,
  (SELECT COUNT(*) FROM news_articles) AS total_articles,
  (SELECT COUNT(*) FROM news_articles WHERE published_at > NOW() - INTERVAL '7 days') AS articles_week,
  (SELECT COUNT(*) FROM courses) AS total_courses,
  (SELECT COUNT(*) FROM user_course_enrollments) AS total_enrollments,
  (SELECT COUNT(*) FROM user_course_enrollments WHERE completed_at IS NOT NULL) AS completed_enrollments,
  (SELECT AVG(average_quiz_score) FROM user_course_enrollments WHERE average_quiz_score IS NOT NULL) AS avg_quiz_score,
  (SELECT COUNT(*) FROM search_queries WHERE created_at > NOW() - INTERVAL '7 days') AS searches_week,
  (SELECT COUNT(DISTINCT user_id) FROM user_saved_articles) AS users_with_saved_articles,
  (SELECT AVG(streak_days) FROM user_profiles WHERE streak_days > 0) AS avg_streak_days;

-- Add function to refresh analytics cache
CREATE OR REPLACE FUNCTION refresh_analytics()
RETURNS void AS $$
BEGIN
  -- Refresh leaderboard
  REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_weekly;
  
  -- Clean old analytics data (keep last 90 days)
  DELETE FROM search_queries WHERE created_at < NOW() - INTERVAL '90 days';
  DELETE FROM user_xp_history WHERE recorded_at < NOW() - INTERVAL '90 days';
  
  -- Log refresh
  INSERT INTO ai_system_logs (agent_name, operation, status, details)
  VALUES ('analytics-refresh', 'refresh_analytics', 'success', jsonb_build_object(
    'timestamp', NOW(),
    'queries_cleaned', (SELECT COUNT(*) FROM search_queries WHERE created_at < NOW() - INTERVAL '90 days'),
    'xp_history_cleaned', (SELECT COUNT(*) FROM user_xp_history WHERE recorded_at < NOW() - INTERVAL '90 days')
  ));
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT ON analytics_overview TO authenticated;
GRANT ALL ON user_xp_history TO authenticated;
GRANT ALL ON search_queries TO authenticated;
