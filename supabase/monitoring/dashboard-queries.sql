/**
 * Monitoring Dashboard Queries
 * Phase 5.1 - Category I: Observability
 * 
 * SQL queries for analytics dashboard (Supabase/Grafana Cloud)
 * Zero-cost solution using existing database
 */

-- ============================================================================
-- PERFORMANCE METRICS
-- ============================================================================

-- Average response time per endpoint (last 24h)
CREATE OR REPLACE FUNCTION get_endpoint_performance(hours_back INT DEFAULT 24)
RETURNS TABLE (
  endpoint TEXT,
  avg_duration_ms NUMERIC,
  p50_duration_ms NUMERIC,
  p95_duration_ms NUMERIC,
  p99_duration_ms NUMERIC,
  total_requests BIGINT,
  error_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    al.path as endpoint,
    AVG(al.duration_ms)::NUMERIC(10,2) as avg_duration_ms,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY al.duration_ms)::NUMERIC(10,2) as p50_duration_ms,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY al.duration_ms)::NUMERIC(10,2) as p95_duration_ms,
    PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY al.duration_ms)::NUMERIC(10,2) as p99_duration_ms,
    COUNT(*)::BIGINT as total_requests,
    (COUNT(*) FILTER (WHERE al.status_code >= 400)::NUMERIC / COUNT(*)::NUMERIC * 100)::NUMERIC(5,2) as error_rate
  FROM api_logs al
  WHERE al.created_at > NOW() - INTERVAL '1 hour' * hours_back
  GROUP BY al.path
  ORDER BY total_requests DESC;
END;
$$ LANGUAGE plpgsql;

-- Slowest operations (last 24h)
CREATE OR REPLACE FUNCTION get_slowest_operations(limit_count INT DEFAULT 20)
RETURNS TABLE (
  operation TEXT,
  duration_ms NUMERIC,
  timestamp TIMESTAMPTZ,
  success BOOLEAN,
  metadata JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    asl.operation,
    asl.duration_ms::NUMERIC(10,2),
    asl.created_at as timestamp,
    asl.success,
    asl.metadata
  FROM ai_system_logs asl
  WHERE asl.created_at > NOW() - INTERVAL '24 hours'
  ORDER BY asl.duration_ms DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ERROR TRACKING
-- ============================================================================

-- Error rate over time (hourly buckets)
CREATE OR REPLACE FUNCTION get_error_rate_timeline(hours_back INT DEFAULT 24)
RETURNS TABLE (
  hour TIMESTAMPTZ,
  total_requests BIGINT,
  error_count BIGINT,
  error_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE_TRUNC('hour', al.created_at) as hour,
    COUNT(*)::BIGINT as total_requests,
    COUNT(*) FILTER (WHERE al.status_code >= 400)::BIGINT as error_count,
    (COUNT(*) FILTER (WHERE al.status_code >= 400)::NUMERIC / COUNT(*)::NUMERIC * 100)::NUMERIC(5,2) as error_rate
  FROM api_logs al
  WHERE al.created_at > NOW() - INTERVAL '1 hour' * hours_back
  GROUP BY DATE_TRUNC('hour', al.created_at)
  ORDER BY hour DESC;
END;
$$ LANGUAGE plpgsql;

-- Most common errors (last 7 days)
CREATE OR REPLACE FUNCTION get_top_errors(limit_count INT DEFAULT 10)
RETURNS TABLE (
  error_message TEXT,
  error_count BIGINT,
  last_occurrence TIMESTAMPTZ,
  affected_users BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    asl.error_message,
    COUNT(*)::BIGINT as error_count,
    MAX(asl.created_at) as last_occurrence,
    COUNT(DISTINCT asl.user_id)::BIGINT as affected_users
  FROM ai_system_logs asl
  WHERE asl.created_at > NOW() - INTERVAL '7 days'
    AND asl.error_message IS NOT NULL
  GROUP BY asl.error_message
  ORDER BY error_count DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- AI SYSTEM HEALTH
-- ============================================================================

-- LLM provider success rates (last 24h)
CREATE OR REPLACE FUNCTION get_llm_provider_stats(hours_back INT DEFAULT 24)
RETURNS TABLE (
  provider TEXT,
  total_requests BIGINT,
  successful_requests BIGINT,
  failed_requests BIGINT,
  success_rate NUMERIC,
  avg_duration_ms NUMERIC,
  total_tokens BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    asl.metadata->>'provider' as provider,
    COUNT(*)::BIGINT as total_requests,
    COUNT(*) FILTER (WHERE asl.success = true)::BIGINT as successful_requests,
    COUNT(*) FILTER (WHERE asl.success = false)::BIGINT as failed_requests,
    (COUNT(*) FILTER (WHERE asl.success = true)::NUMERIC / COUNT(*)::NUMERIC * 100)::NUMERIC(5,2) as success_rate,
    AVG(asl.duration_ms)::NUMERIC(10,2) as avg_duration_ms,
    SUM((asl.metadata->>'tokens')::INT)::BIGINT as total_tokens
  FROM ai_system_logs asl
  WHERE asl.created_at > NOW() - INTERVAL '1 hour' * hours_back
    AND asl.operation LIKE 'llm_%'
    AND asl.metadata->>'provider' IS NOT NULL
  GROUP BY asl.metadata->>'provider'
  ORDER BY total_requests DESC;
END;
$$ LANGUAGE plpgsql;

-- News curation pipeline health
CREATE OR REPLACE FUNCTION get_curation_pipeline_stats(days_back INT DEFAULT 7)
RETURNS TABLE (
  date DATE,
  articles_scraped BIGINT,
  articles_filtered BIGINT,
  articles_published BIGINT,
  filter_rate NUMERIC,
  avg_scraping_duration_ms NUMERIC,
  errors BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE(asl.created_at) as date,
    SUM((asl.metadata->>'articlesScraped')::INT)::BIGINT as articles_scraped,
    SUM((asl.metadata->>'articlesFiltered')::INT)::BIGINT as articles_filtered,
    SUM((asl.metadata->>'articlesPublished')::INT)::BIGINT as articles_published,
    (SUM((asl.metadata->>'articlesFiltered')::INT)::NUMERIC / 
     NULLIF(SUM((asl.metadata->>'articlesScraped')::INT)::NUMERIC, 0) * 100)::NUMERIC(5,2) as filter_rate,
    AVG(asl.duration_ms)::NUMERIC(10,2) as avg_scraping_duration_ms,
    COUNT(*) FILTER (WHERE asl.success = false)::BIGINT as errors
  FROM ai_system_logs asl
  WHERE asl.created_at > NOW() - INTERVAL '1 day' * days_back
    AND asl.operation = 'news_curation'
  GROUP BY DATE(asl.created_at)
  ORDER BY date DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CONTENT METRICS
-- ============================================================================

-- Articles published per day (last 30 days)
CREATE OR REPLACE FUNCTION get_content_publishing_stats(days_back INT DEFAULT 30)
RETURNS TABLE (
  date DATE,
  total_articles BIGINT,
  articles_en BIGINT,
  articles_es BIGINT,
  avg_quality_score NUMERIC,
  avg_images_per_article NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE(na.published_at) as date,
    COUNT(*)::BIGINT as total_articles,
    COUNT(*) FILTER (WHERE na.title_en IS NOT NULL)::BIGINT as articles_en,
    COUNT(*) FILTER (WHERE na.title_es IS NOT NULL)::BIGINT as articles_es,
    AVG(na.quality_score)::NUMERIC(5,2) as avg_quality_score,
    AVG(JSONB_ARRAY_LENGTH(na.images))::NUMERIC(5,2) as avg_images_per_article
  FROM news_articles na
  WHERE na.published_at > NOW() - INTERVAL '1 day' * days_back
  GROUP BY DATE(na.published_at)
  ORDER BY date DESC;
END;
$$ LANGUAGE plpgsql;

-- Top performing articles (by engagement)
CREATE OR REPLACE FUNCTION get_top_articles(days_back INT DEFAULT 7, limit_count INT DEFAULT 10)
RETURNS TABLE (
  id UUID,
  title TEXT,
  views BIGINT,
  bookmarks BIGINT,
  shares BIGINT,
  avg_rating NUMERIC,
  published_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    na.id,
    COALESCE(na.title_en, na.title_es) as title,
    na.views_count::BIGINT,
    (SELECT COUNT(*) FROM user_bookmarks ub WHERE ub.article_id = na.id)::BIGINT as bookmarks,
    (SELECT COUNT(*) FROM user_shares us WHERE us.article_id = na.id)::BIGINT as shares,
    (SELECT AVG(rating) FROM user_ratings ur WHERE ur.article_id = na.id)::NUMERIC(3,2) as avg_rating,
    na.published_at
  FROM news_articles na
  WHERE na.published_at > NOW() - INTERVAL '1 day' * days_back
  ORDER BY (na.views_count + bookmarks * 5 + shares * 10) DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- USER ENGAGEMENT
-- ============================================================================

-- Daily Active Users (DAU) and Monthly Active Users (MAU)
CREATE OR REPLACE FUNCTION get_user_activity_stats(days_back INT DEFAULT 30)
RETURNS TABLE (
  date DATE,
  dau BIGINT,
  new_users BIGINT,
  returning_users BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH daily_users AS (
    SELECT 
      DATE(up.last_active_at) as activity_date,
      up.user_id,
      MIN(up.created_at)::DATE as user_created_date
    FROM user_progress up
    WHERE up.last_active_at > NOW() - INTERVAL '1 day' * days_back
    GROUP BY DATE(up.last_active_at), up.user_id, up.created_at
  )
  SELECT 
    du.activity_date as date,
    COUNT(DISTINCT du.user_id)::BIGINT as dau,
    COUNT(DISTINCT du.user_id) FILTER (WHERE du.user_created_date = du.activity_date)::BIGINT as new_users,
    COUNT(DISTINCT du.user_id) FILTER (WHERE du.user_created_date < du.activity_date)::BIGINT as returning_users
  FROM daily_users du
  GROUP BY du.activity_date
  ORDER BY date DESC;
END;
$$ LANGUAGE plpgsql;

-- User retention cohort analysis
CREATE OR REPLACE FUNCTION get_retention_cohort(cohort_date DATE)
RETURNS TABLE (
  days_since_signup INT,
  users_active BIGINT,
  retention_rate NUMERIC
) AS $$
DECLARE
  cohort_size BIGINT;
BEGIN
  -- Get cohort size (users who signed up on cohort_date)
  SELECT COUNT(*) INTO cohort_size
  FROM user_progress
  WHERE DATE(created_at) = cohort_date;

  -- Return retention for each day after signup
  RETURN QUERY
  WITH cohort_users AS (
    SELECT user_id
    FROM user_progress
    WHERE DATE(created_at) = cohort_date
  )
  SELECT 
    (DATE(up.last_active_at) - cohort_date)::INT as days_since_signup,
    COUNT(DISTINCT up.user_id)::BIGINT as users_active,
    (COUNT(DISTINCT up.user_id)::NUMERIC / cohort_size::NUMERIC * 100)::NUMERIC(5,2) as retention_rate
  FROM user_progress up
  INNER JOIN cohort_users cu ON up.user_id = cu.user_id
  WHERE DATE(up.last_active_at) >= cohort_date
  GROUP BY DATE(up.last_active_at)
  ORDER BY days_since_signup;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SYSTEM HEALTH
-- ============================================================================

-- Database table sizes
CREATE OR REPLACE FUNCTION get_database_stats()
RETURNS TABLE (
  table_name TEXT,
  row_count BIGINT,
  total_size TEXT,
  indexes_size TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    schemaname || '.' || tablename as table_name,
    n_live_tup::BIGINT as row_count,
    PG_SIZE_PRETTY(PG_TOTAL_RELATION_SIZE(schemaname || '.' || tablename)) as total_size,
    PG_SIZE_PRETTY(PG_INDEXES_SIZE(schemaname || '.' || tablename)) as indexes_size
  FROM pg_stat_user_tables
  WHERE schemaname = 'public'
  ORDER BY PG_TOTAL_RELATION_SIZE(schemaname || '.' || tablename) DESC;
END;
$$ LANGUAGE plpgsql;

-- Cache hit ratio (PostgreSQL buffer cache)
CREATE OR REPLACE FUNCTION get_cache_hit_ratio()
RETURNS TABLE (
  cache_hit_ratio NUMERIC,
  buffers_alloc BIGINT,
  buffers_backend BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SUM(blks_hit)::NUMERIC / NULLIF(SUM(blks_hit + blks_read)::NUMERIC, 0) * 100)::NUMERIC(5,2) as cache_hit_ratio,
    SUM(buffers_alloc)::BIGINT,
    SUM(buffers_backend)::BIGINT
  FROM pg_stat_database
  WHERE datname = CURRENT_DATABASE();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- API LOGS TABLE (if not exists)
-- ============================================================================

-- Create table for HTTP request logs
CREATE TABLE IF NOT EXISTS api_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  method TEXT NOT NULL,
  path TEXT NOT NULL,
  status_code INT,
  duration_ms NUMERIC(10,2),
  user_agent TEXT,
  ip_address INET,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_logs_created_at ON api_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_logs_path ON api_logs(path);
CREATE INDEX IF NOT EXISTS idx_api_logs_status_code ON api_logs(status_code);

-- Cleanup old logs (keep 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_api_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM api_logs
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SCHEDULED CLEANUP (Optional - use pg_cron extension)
-- ============================================================================

-- Example: Run cleanup daily at 3 AM
-- SELECT cron.schedule('cleanup-api-logs', '0 3 * * *', 'SELECT cleanup_old_api_logs()');
