-- Migration: Create analytics_overview table
-- This table stores aggregated analytics metrics for the dashboard

CREATE TABLE IF NOT EXISTS public.analytics_overview (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name TEXT NOT NULL UNIQUE,
  metric_value BIGINT NOT NULL DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_analytics_overview_metric_name 
  ON public.analytics_overview(metric_name);

-- Insert initial metrics
INSERT INTO public.analytics_overview (metric_name, metric_value, metadata) VALUES
  ('total_articles', 0, '{"description": "Total number of news articles"}'::jsonb),
  ('total_users', 0, '{"description": "Total registered users"}'::jsonb),
  ('total_courses', 0, '{"description": "Total generated courses"}'::jsonb),
  ('total_flashcards', 0, '{"description": "Total flashcards created"}'::jsonb),
  ('total_entities', 0, '{"description": "Knowledge graph entities"}'::jsonb)
ON CONFLICT (metric_name) DO NOTHING;

-- Enable RLS
ALTER TABLE public.analytics_overview ENABLE ROW LEVEL SECURITY;

-- Policy: Public read access
CREATE POLICY "Public can view analytics"
  ON public.analytics_overview
  FOR SELECT
  TO public
  USING (true);

-- Policy: Only authenticated users can update
CREATE POLICY "Authenticated users can update analytics"
  ON public.analytics_overview
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Function to update analytics metrics
CREATE OR REPLACE FUNCTION update_analytics_metric(
  p_metric_name TEXT,
  p_metric_value BIGINT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.analytics_overview (metric_name, metric_value, last_updated)
  VALUES (p_metric_name, p_metric_value, NOW())
  ON CONFLICT (metric_name)
  DO UPDATE SET 
    metric_value = p_metric_value,
    last_updated = NOW();
END;
$$;

-- Function to increment analytics counter
CREATE OR REPLACE FUNCTION increment_analytics_metric(
  p_metric_name TEXT,
  p_increment BIGINT DEFAULT 1
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.analytics_overview (metric_name, metric_value, last_updated)
  VALUES (p_metric_name, p_increment, NOW())
  ON CONFLICT (metric_name)
  DO UPDATE SET 
    metric_value = analytics_overview.metric_value + p_increment,
    last_updated = NOW();
END;
$$;

COMMENT ON TABLE public.analytics_overview IS 'Aggregated analytics metrics for platform monitoring';
COMMENT ON FUNCTION update_analytics_metric IS 'Update or insert an analytics metric value';
COMMENT ON FUNCTION increment_analytics_metric IS 'Increment an analytics metric counter';
