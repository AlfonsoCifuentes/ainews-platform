-- ============================================
-- TRENDING CACHE TABLE
-- ============================================
-- Almacena trending topics detectados automáticamente cada 6 horas

CREATE TABLE IF NOT EXISTS trending_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Topic data
  topic TEXT NOT NULL,
  count INTEGER NOT NULL, -- Número de menciones
  momentum NUMERIC(10,4) NOT NULL, -- Score de momentum (menciones/hora)
  article_ids UUID[] NOT NULL, -- IDs de artículos relacionados
  
  -- Timestamp
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Index
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_trending_cache_detected ON trending_cache(detected_at DESC);
CREATE INDEX idx_trending_cache_momentum ON trending_cache(momentum DESC);

-- Auto-delete cache older than 7 days
CREATE OR REPLACE FUNCTION delete_old_trending_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM trending_cache
  WHERE detected_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Opcional: Trigger automático (requiere pg_cron extension)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule('delete-old-trending', '0 0 * * *', 'SELECT delete_old_trending_cache()');
