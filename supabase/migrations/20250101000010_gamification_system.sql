-- Gamification System Migration
-- Badges, achievements, leaderboards, and XP system

-- Create badges table
CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en TEXT NOT NULL,
  name_es TEXT NOT NULL,
  description_en TEXT NOT NULL,
  description_es TEXT NOT NULL,
  icon TEXT NOT NULL, -- Emoji or icon identifier
  category TEXT NOT NULL CHECK (category IN ('learning', 'engagement', 'contribution', 'streak', 'social', 'mastery')),
  rarity TEXT NOT NULL CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  xp_reward INTEGER NOT NULL DEFAULT 0,
  criteria JSONB NOT NULL, -- Achievement criteria
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create user_badges table (many-to-many)
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  progress INTEGER DEFAULT 0, -- For progressive badges
  metadata JSONB, -- Additional data like specific achievement details
  UNIQUE(user_id, badge_id)
);

-- Create user_xp table
CREATE TABLE IF NOT EXISTS user_xp (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  current_level_xp INTEGER NOT NULL DEFAULT 0,
  xp_to_next_level INTEGER NOT NULL DEFAULT 100,
  last_xp_gain_at TIMESTAMPTZ,
  streak_days INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create xp_transactions table (audit log)
CREATE TABLE IF NOT EXISTS xp_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  xp_amount INTEGER NOT NULL,
  source TEXT NOT NULL, -- 'article_read', 'flashcard_reviewed', 'badge_earned', etc.
  source_id TEXT, -- ID of the related entity
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create leaderboard view (materialized for performance)
CREATE MATERIALIZED VIEW IF NOT EXISTS leaderboard AS
SELECT
  user_id,
  total_xp,
  level,
  streak_days,
  ROW_NUMBER() OVER (ORDER BY total_xp DESC) as rank,
  COUNT(*) OVER () as total_users
FROM user_xp
ORDER BY total_xp DESC;

-- Create index on leaderboard
CREATE INDEX IF NOT EXISTS idx_leaderboard_xp ON leaderboard(total_xp DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_user ON leaderboard(user_id);

-- Create function to refresh leaderboard
CREATE OR REPLACE FUNCTION refresh_leaderboard()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge_id ON user_badges(badge_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_earned_at ON user_badges(earned_at DESC);
CREATE INDEX IF NOT EXISTS idx_badges_category ON badges(category);
CREATE INDEX IF NOT EXISTS idx_badges_rarity ON badges(rarity);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_user_id ON xp_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_created_at ON xp_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_xp_total_xp ON user_xp(total_xp DESC);
CREATE INDEX IF NOT EXISTS idx_user_xp_level ON user_xp(level DESC);

-- Enable RLS
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_xp ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Badges: Public read
CREATE POLICY "Badges are publicly readable"
  ON badges FOR SELECT
  USING (true);

-- User badges: Users can read their own and others' badges
CREATE POLICY "Users can view all badges"
  ON user_badges FOR SELECT
  USING (true);

-- User badges: Only system can insert (via function)
CREATE POLICY "System can insert user badges"
  ON user_badges FOR INSERT
  WITH CHECK (false); -- Will use SECURITY DEFINER function

-- User XP: Users can read all XP data (for leaderboards)
CREATE POLICY "XP data is publicly readable"
  ON user_xp FOR SELECT
  USING (true);

-- User XP: Only system can update (via function)
CREATE POLICY "System can update user XP"
  ON user_xp FOR UPDATE
  USING (false)
  WITH CHECK (false);

-- XP Transactions: Users can view their own transactions
CREATE POLICY "Users can view their own XP transactions"
  ON xp_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- XP Transactions: Only system can insert (via function)
CREATE POLICY "System can insert XP transactions"
  ON xp_transactions FOR INSERT
  WITH CHECK (false);

-- Create function to award XP
CREATE OR REPLACE FUNCTION award_xp(
  p_user_id UUID,
  p_xp_amount INTEGER,
  p_source TEXT,
  p_source_id TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_user_xp RECORD;
  v_new_total_xp INTEGER;
  v_new_level INTEGER;
  v_level_up BOOLEAN := false;
  v_xp_per_level INTEGER := 100;
  v_level_multiplier NUMERIC := 1.15;
BEGIN
  -- Get or create user XP record
  INSERT INTO user_xp (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Get current XP data
  SELECT * INTO v_user_xp FROM user_xp WHERE user_id = p_user_id FOR UPDATE;

  -- Calculate new totals
  v_new_total_xp := v_user_xp.total_xp + p_xp_amount;
  v_new_level := v_user_xp.level;

  -- Check for level up
  WHILE v_user_xp.current_level_xp + p_xp_amount >= v_user_xp.xp_to_next_level LOOP
    v_new_level := v_new_level + 1;
    p_xp_amount := p_xp_amount - (v_user_xp.xp_to_next_level - v_user_xp.current_level_xp);
    v_user_xp.current_level_xp := 0;
    v_user_xp.xp_to_next_level := FLOOR(v_xp_per_level * POWER(v_level_multiplier, v_new_level - 1));
    v_level_up := true;
  END LOOP;

  -- Update user XP
  UPDATE user_xp
  SET
    total_xp = v_new_total_xp,
    level = v_new_level,
    current_level_xp = v_user_xp.current_level_xp + p_xp_amount,
    xp_to_next_level = CASE
      WHEN v_level_up THEN FLOOR(v_xp_per_level * POWER(v_level_multiplier, v_new_level - 1))
      ELSE v_user_xp.xp_to_next_level
    END,
    last_xp_gain_at = NOW(),
    updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Insert transaction record
  INSERT INTO xp_transactions (user_id, xp_amount, source, source_id, description)
  VALUES (p_user_id, p_xp_amount, p_source, p_source_id, p_description);

  -- Return result
  RETURN jsonb_build_object(
    'success', true,
    'new_total_xp', v_new_total_xp,
    'new_level', v_new_level,
    'level_up', v_level_up,
    'xp_gained', p_xp_amount
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update streak
CREATE OR REPLACE FUNCTION update_streak(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_user_xp RECORD;
  v_today DATE := CURRENT_DATE;
  v_yesterday DATE := CURRENT_DATE - INTERVAL '1 day';
  v_new_streak INTEGER;
BEGIN
  SELECT * INTO v_user_xp FROM user_xp WHERE user_id = p_user_id FOR UPDATE;

  IF v_user_xp IS NULL THEN
    -- Create new record
    INSERT INTO user_xp (user_id, streak_days, last_activity_date)
    VALUES (p_user_id, 1, v_today)
    RETURNING * INTO v_user_xp;
    
    RETURN jsonb_build_object('streak_days', 1, 'is_new_record', true);
  END IF;

  -- Check if activity is today already
  IF v_user_xp.last_activity_date = v_today THEN
    RETURN jsonb_build_object('streak_days', v_user_xp.streak_days, 'is_new_record', false);
  END IF;

  -- Check if activity was yesterday (continue streak)
  IF v_user_xp.last_activity_date = v_yesterday THEN
    v_new_streak := v_user_xp.streak_days + 1;
  ELSE
    -- Streak broken, reset to 1
    v_new_streak := 1;
  END IF;

  -- Update streak
  UPDATE user_xp
  SET
    streak_days = v_new_streak,
    longest_streak = GREATEST(v_new_streak, COALESCE(longest_streak, 0)),
    last_activity_date = v_today,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  RETURN jsonb_build_object(
    'streak_days', v_new_streak,
    'is_new_record', v_new_streak > COALESCE(v_user_xp.longest_streak, 0)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Seed badges
INSERT INTO badges (name_en, name_es, description_en, description_es, icon, category, rarity, xp_reward, criteria)
VALUES
  -- Learning badges
  ('First Steps', 'Primeros Pasos', 'Complete your first article', 'Completa tu primer artículo', '👣', 'learning', 'common', 10, '{"type":"article_read","count":1}'),
  ('Bookworm', 'Ratón de Biblioteca', 'Read 10 articles', 'Lee 10 artículos', '📚', 'learning', 'common', 50, '{"type":"article_read","count":10}'),
  ('Scholar', 'Erudito', 'Read 50 articles', 'Lee 50 artículos', '🎓', 'learning', 'rare', 200, '{"type":"article_read","count":50}'),
  ('Knowledge Seeker', 'Buscador de Conocimiento', 'Read 100 articles', 'Lee 100 artículos', '🔍', 'learning', 'epic', 500, '{"type":"article_read","count":100}'),
  
  -- Flashcard badges
  ('Quick Learner', 'Aprendiz Rápido', 'Review 10 flashcards', 'Revisa 10 flashcards', '⚡', 'learning', 'common', 10, '{"type":"flashcard_reviewed","count":10}'),
  ('Memory Master', 'Maestro de la Memoria', 'Review 100 flashcards', 'Revisa 100 flashcards', '🧠', 'mastery', 'rare', 100, '{"type":"flashcard_reviewed","count":100}'),
  
  -- Streak badges
  ('Consistent', 'Consistente', '3-day streak', 'Racha de 3 días', '🔥', 'streak', 'common', 25, '{"type":"streak","days":3}'),
  ('Dedicated', 'Dedicado', '7-day streak', 'Racha de 7 días', '💪', 'streak', 'rare', 75, '{"type":"streak","days":7}'),
  ('Unstoppable', 'Imparable', '30-day streak', 'Racha de 30 días', '🚀', 'streak', 'epic', 300, '{"type":"streak","days":30}'),
  ('Legend', 'Leyenda', '100-day streak', 'Racha de 100 días', '👑', 'streak', 'legendary', 1000, '{"type":"streak","days":100}'),
  
  -- Engagement badges
  ('Bookmarker', 'Guardador', 'Save 10 bookmarks', 'Guarda 10 marcadores', '🔖', 'engagement', 'common', 20, '{"type":"bookmark","count":10}'),
  ('Curator', 'Curador', 'Save 50 bookmarks', 'Guarda 50 marcadores', '📌', 'engagement', 'rare', 100, '{"type":"bookmark","count":50}'),
  
  -- Course badges
  ('Course Starter', 'Iniciador de Cursos', 'Start your first course', 'Inicia tu primer curso', '🎯', 'learning', 'common', 15, '{"type":"course_started","count":1}'),
  ('Course Finisher', 'Finalizador de Cursos', 'Complete your first course', 'Completa tu primer curso', '✅', 'mastery', 'rare', 150, '{"type":"course_completed","count":1}'),
  
  -- Social badges (for future community features)
  ('Social Butterfly', 'Mariposa Social', 'Leave 10 comments', 'Deja 10 comentarios', '💬', 'social', 'common', 30, '{"type":"comment","count":10}'),
  ('Helpful', 'Útil', 'Get 10 upvotes', 'Recibe 10 votos positivos', '👍', 'social', 'rare', 50, '{"type":"upvote_received","count":10}')
ON CONFLICT DO NOTHING;

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_xp_updated_at
  BEFORE UPDATE ON user_xp
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION award_xp TO authenticated;
GRANT EXECUTE ON FUNCTION update_streak TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_leaderboard TO authenticated;
