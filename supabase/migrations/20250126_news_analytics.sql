-- Migration: Create news_analytics table for AI-generated insights
-- This table stores analyzed data about news articles to provide real-time insights

CREATE TABLE IF NOT EXISTS news_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Hype Detector metrics
  hype_score NUMERIC(5,2) DEFAULT 0 CHECK (hype_score >= 0 AND hype_score <= 100),
  substance_score NUMERIC(5,2) DEFAULT 0 CHECK (substance_score >= 0 AND substance_score <= 100),
  hype_keywords TEXT[] DEFAULT '{}',
  substance_keywords TEXT[] DEFAULT '{}',
  
  -- Domain Distribution (CV, NLP, Robotics, Ethics, Tools)
  domain_distribution JSONB DEFAULT '{}',
  -- Example: {"cv": 25, "nlp": 40, "robotics": 15, "ethics": 10, "tools": 10}
  
  -- Trending Topics (top 5 keywords with mention counts)
  trending_topics JSONB DEFAULT '[]',
  -- Example: [{"topic": "GPT-5", "count": 12, "trend": "up"}, ...]
  
  -- Sentiment Analysis by category
  sentiment_by_category JSONB DEFAULT '{}',
  -- Example: {"machine-learning": {"positive": 60, "neutral": 30, "negative": 10}, ...}
  
  -- Company activity tracking
  company_activity JSONB DEFAULT '[]',
  -- Example: [{"company": "OpenAI", "count": 15, "trend": "up"}, ...]
  
  -- Metadata
  analysis_period_start TIMESTAMPTZ NOT NULL,
  analysis_period_end TIMESTAMPTZ NOT NULL,
  articles_analyzed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookups by date
CREATE INDEX IF NOT EXISTS idx_news_analytics_updated 
ON news_analytics(updated_at DESC);

-- Index for period queries
CREATE INDEX IF NOT EXISTS idx_news_analytics_period 
ON news_analytics(analysis_period_end DESC);

-- Enable Row Level Security
ALTER TABLE news_analytics ENABLE ROW LEVEL SECURITY;

-- Policy: Public read access (everyone can see analytics)
CREATE POLICY "Public read access for news_analytics" 
ON news_analytics FOR SELECT 
USING (true);

-- Policy: Only service role can insert/update
CREATE POLICY "Service role can insert/update news_analytics" 
ON news_analytics FOR ALL 
USING (auth.role() = 'service_role');

-- Add helpful comment
COMMENT ON TABLE news_analytics IS 'Stores AI-analyzed insights from news articles: hype detection, domain distribution, trending topics, and sentiment analysis. Updated every 1-2 hours by automated agent.';

COMMENT ON COLUMN news_analytics.hype_score IS 'Score 0-100: measures marketing/hype language in articles';
COMMENT ON COLUMN news_analytics.substance_score IS 'Score 0-100: measures technical depth and substance in articles';
COMMENT ON COLUMN news_analytics.domain_distribution IS 'Percentage distribution across AI subdomains: CV, NLP, Robotics, Ethics, Tools/Infra';
COMMENT ON COLUMN news_analytics.trending_topics IS 'Array of top trending topics with mention counts and trend direction';
