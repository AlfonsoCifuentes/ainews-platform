-- Analytics Events Table
-- Phase 5.1 - Category I: Observability
-- Stores user events and page views for analytics

CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  properties JSONB DEFAULT '{}',
  user_agent TEXT,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_name ON analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id ON analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_properties ON analytics_events USING GIN(properties);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_event_time 
  ON analytics_events(user_id, event_name, created_at DESC);

-- Enable Row Level Security
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own events
CREATE POLICY "Users can read own analytics events"
  ON analytics_events
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Service role can insert/manage all events
CREATE POLICY "Service role can manage all analytics events"
  ON analytics_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can insert their own events
CREATE POLICY "Authenticated users can insert own analytics events"
  ON analytics_events
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Function: Get top events by count
CREATE OR REPLACE FUNCTION get_top_events(
  days_back INT DEFAULT 7,
  limit_count INT DEFAULT 10
)
RETURNS TABLE (
  event_name TEXT,
  event_count BIGINT,
  unique_users BIGINT,
  last_occurrence TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ae.event_name,
    COUNT(*)::BIGINT as event_count,
    COUNT(DISTINCT ae.user_id)::BIGINT as unique_users,
    MAX(ae.created_at) as last_occurrence
  FROM analytics_events ae
  WHERE ae.created_at > NOW() - INTERVAL '1 day' * days_back
  GROUP BY ae.event_name
  ORDER BY event_count DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function: Get user journey (event sequence)
CREATE OR REPLACE FUNCTION get_user_journey(
  target_user_id UUID,
  hours_back INT DEFAULT 24
)
RETURNS TABLE (
  event_name TEXT,
  properties JSONB,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ae.event_name,
    ae.properties,
    ae.created_at
  FROM analytics_events ae
  WHERE ae.user_id = target_user_id
    AND ae.created_at > NOW() - INTERVAL '1 hour' * hours_back
  ORDER BY ae.created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- Function: Get funnel conversion rates
CREATE OR REPLACE FUNCTION get_funnel_conversion(
  funnel_events TEXT[],
  days_back INT DEFAULT 7
)
RETURNS TABLE (
  step INT,
  event_name TEXT,
  users_count BIGINT,
  conversion_rate NUMERIC
) AS $$
DECLARE
  total_users BIGINT;
BEGIN
  -- Get total users who started the funnel
  SELECT COUNT(DISTINCT user_id) INTO total_users
  FROM analytics_events
  WHERE event_name = funnel_events[1]
    AND created_at > NOW() - INTERVAL '1 day' * days_back
    AND user_id IS NOT NULL;

  -- Return funnel steps with conversion rates
  RETURN QUERY
  WITH funnel_steps AS (
    SELECT 
      row_number() OVER ()::INT as step,
      unnest(funnel_events) as event_name
  )
  SELECT 
    fs.step,
    fs.event_name,
    COUNT(DISTINCT ae.user_id)::BIGINT as users_count,
    (COUNT(DISTINCT ae.user_id)::NUMERIC / NULLIF(total_users::NUMERIC, 0) * 100)::NUMERIC(5,2) as conversion_rate
  FROM funnel_steps fs
  LEFT JOIN analytics_events ae ON ae.event_name = fs.event_name
    AND ae.created_at > NOW() - INTERVAL '1 day' * days_back
    AND ae.user_id IS NOT NULL
  GROUP BY fs.step, fs.event_name
  ORDER BY fs.step;
END;
$$ LANGUAGE plpgsql;

-- Function: Cleanup old analytics events (keep 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_analytics_events()
RETURNS void AS $$
BEGIN
  DELETE FROM analytics_events
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  RAISE NOTICE 'Old analytics events cleaned up';
END;
$$ LANGUAGE plpgsql;

-- Scheduled cleanup (optional - requires pg_cron extension)
-- SELECT cron.schedule('cleanup-analytics', '0 2 * * *', 'SELECT cleanup_old_analytics_events()');

COMMENT ON TABLE analytics_events IS 'Stores user events and page views for analytics tracking';
COMMENT ON FUNCTION get_top_events IS 'Returns most common events with counts and unique users';
COMMENT ON FUNCTION get_user_journey IS 'Returns event sequence for a specific user';
COMMENT ON FUNCTION get_funnel_conversion IS 'Calculates conversion rates for a funnel of events';
COMMENT ON FUNCTION cleanup_old_analytics_events IS 'Removes analytics events older than 90 days';
