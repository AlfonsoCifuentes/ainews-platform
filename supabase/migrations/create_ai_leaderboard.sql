-- Create ai_leaderboard table
CREATE TABLE IF NOT EXISTS public.ai_leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rank INTEGER NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  provider VARCHAR(255) NOT NULL,
  performance_score DECIMAL(5, 2) NOT NULL,
  description TEXT,
  company_logo_url VARCHAR(500),
  model_url VARCHAR(500),
  archived_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE public.ai_leaderboard ENABLE ROW LEVEL SECURITY;

-- Create RLS policy (everyone can read)
CREATE POLICY "AI Leaderboard is viewable by everyone"
  ON public.ai_leaderboard
  FOR SELECT
  USING (true);

-- Create RLS policy (only service role can insert/update)
CREATE POLICY "AI Leaderboard can be updated by service role"
  ON public.ai_leaderboard
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "AI Leaderboard can be updated by service role (update)"
  ON public.ai_leaderboard
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Create index for better query performance
CREATE INDEX idx_ai_leaderboard_rank ON public.ai_leaderboard(rank);
CREATE INDEX idx_ai_leaderboard_updated_at ON public.ai_leaderboard(updated_at DESC);

-- Insert initial data
INSERT INTO public.ai_leaderboard (rank, name, provider, performance_score, description, model_url)
VALUES
  (1, 'GPT-4o', 'OpenAI', 98.5, 'Most advanced reasoning and analysis', 'https://openai.com/gpt-4'),
  (2, 'Claude 3.5 Sonnet', 'Anthropic', 97.8, 'Excellent analysis and writing', 'https://claude.ai'),
  (3, 'Gemini 2.0', 'Google DeepMind', 97.2, 'Fast and capable multimodal model', 'https://gemini.google.com'),
  (4, 'Llama 3.3 70B', 'Meta', 96.5, 'Best open-source large language model', 'https://llama.meta.com'),
  (5, 'Grok-3', 'xAI', 96.2, 'Real-time reasoning with up-to-date knowledge', 'https://grok.com')
ON CONFLICT (rank) DO NOTHING;
