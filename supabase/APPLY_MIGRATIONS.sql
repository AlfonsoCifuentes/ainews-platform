-- ============================================================================
-- MIGRACIONES CONSOLIDADAS - AINEWS PLATFORM
-- ============================================================================
-- Aplicar en Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql/new
--
-- Incluye:
--   1. Learning Agent (ai_prompts table)
--   2. Trending Cache (trending_cache table)
--   3. Entity Relations (entity_relations + citations tables)
--
-- Fecha: 2025-01-07
-- ============================================================================


-- ============================================================================
-- MIGRACIÓN 1/3: LEARNING AGENT - AI PROMPTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_prompts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category TEXT NOT NULL,
  prompt_text TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  active BOOLEAN DEFAULT true,
  improvement_reason TEXT,
  expected_impact TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  replaced_at TIMESTAMPTZ,
  UNIQUE(category, version)
);

CREATE INDEX IF NOT EXISTS idx_ai_prompts_category_active ON ai_prompts(category, active);
CREATE INDEX IF NOT EXISTS idx_ai_prompts_created ON ai_prompts(created_at DESC);

-- Seed inicial de prompts
INSERT INTO ai_prompts (category, prompt_text, version, active)
VALUES
  ('news_curation', E'You are an AI news curator. Analyze the following article and determine if it is relevant to AI/ML news.\n\nConsider relevant:\n- New AI models, papers, or research\n- AI company news and product launches\n- Breakthroughs in ML, NLP, Computer Vision, Robotics\n- AI ethics, policy, and regulation\n- Industry applications of AI\n\nConsider NOT relevant:\n- Generic tech news without AI focus\n- Cryptocurrency/blockchain (unless AI-related)\n- General programming tutorials\n- Marketing fluff without substance\n\nArticle:\n{article}\n\nRespond with JSON:\n{\n  "relevant": true/false,\n  "category": "machinelearning" | "nlp" | "computervision" | "robotics" | "ethics" | "general",\n  "reason": "brief explanation",\n  "quality_score": 1-10\n}', 1, true),
  ('course_generation', E'You are an expert AI educator. Generate a comprehensive course outline on the following topic.\n\nTopic: {topic}\nLevel: {level}\nDuration: {duration} minutes\n\nCreate a structured course with:\n- Clear learning objectives\n- 5-7 modules with progressive difficulty\n- Each module: title, content (500-800 words), estimated time, key takeaways\n- Include practical examples and code snippets when relevant\n- Add 3-5 quiz questions per module\n\nRespond with JSON following this schema:\n{\n  "title": "course title",\n  "description": "brief description",\n  "modules": [\n    {\n      "title": "module title",\n      "content": "detailed content in markdown",\n      "estimatedTime": minutes,\n      "keyTakeaways": ["point1", "point2"],\n      "quiz": [\n        {\n          "question": "quiz question",\n          "options": ["A", "B", "C", "D"],\n          "correctAnswer": "A",\n          "explanation": "why this is correct"\n        }\n      ]\n    }\n  ]\n}', 1, true),
  ('translation', E'You are a professional translator specializing in AI/tech content.\n\nTranslate the following text from {source_lang} to {target_lang}.\n\nRequirements:\n- Maintain technical accuracy\n- Preserve markdown formatting\n- Keep proper nouns and technical terms (GPT, Transformer, etc.)\n- Natural, fluent language\n- Adapt idioms culturally when needed\n\nText:\n{text}\n\nRespond with ONLY the translated text, no explanations.', 1, true),
  ('summarization', E'You are an expert at creating concise, informative summaries of AI news articles.\n\nCreate a summary that:\n- Captures the main points in 2-3 sentences\n- Highlights key innovations or findings\n- Mentions important people, companies, or products\n- Is accessible to both technical and non-technical readers\n\nArticle:\n{article}\n\nRespond with ONLY the summary text (100-150 words).', 1, true)
ON CONFLICT (category, version) DO NOTHING;


-- ============================================================================
-- MIGRACIÓN 2/3: TRENDING CACHE
-- ============================================================================

CREATE TABLE IF NOT EXISTS trending_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topic TEXT NOT NULL,
  count INTEGER NOT NULL,
  momentum NUMERIC(10,4) NOT NULL,
  article_ids UUID[] NOT NULL,
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trending_cache_detected ON trending_cache(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_trending_cache_momentum ON trending_cache(momentum DESC);

CREATE OR REPLACE FUNCTION delete_old_trending_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM trending_cache
  WHERE detected_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- MIGRACIÓN 3/3: ENTITY RELATIONS & CITATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS entity_relations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL,
  weight NUMERIC(3,2) DEFAULT 1.0,
  evidence JSONB DEFAULT '{}',
  first_seen TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source_id, target_id, relation_type)
);

CREATE INDEX IF NOT EXISTS idx_entity_relations_source ON entity_relations(source_id);
CREATE INDEX IF NOT EXISTS idx_entity_relations_target ON entity_relations(target_id);
CREATE INDEX IF NOT EXISTS idx_entity_relations_type ON entity_relations(relation_type);
CREATE INDEX IF NOT EXISTS idx_entity_relations_weight ON entity_relations(weight DESC);

CREATE TABLE IF NOT EXISTS citations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
  relation_id UUID REFERENCES entity_relations(id) ON DELETE CASCADE,
  article_id UUID REFERENCES news_articles(id) ON DELETE CASCADE,
  quote TEXT NOT NULL,
  source_url TEXT NOT NULL,
  published_at TIMESTAMPTZ,
  confidence NUMERIC(3,2) DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_citations_entity ON citations(entity_id);
CREATE INDEX IF NOT EXISTS idx_citations_relation ON citations(relation_id);
CREATE INDEX IF NOT EXISTS idx_citations_article ON citations(article_id);

-- Views
CREATE OR REPLACE VIEW entity_stats AS
SELECT
  e.id,
  e.name,
  e.type,
  COUNT(DISTINCT r1.id) + COUNT(DISTINCT r2.id) as total_relations,
  COUNT(DISTINCT r1.id) as outgoing_relations,
  COUNT(DISTINCT r2.id) as incoming_relations,
  COUNT(DISTINCT c.id) as citations_count
FROM entities e
LEFT JOIN entity_relations r1 ON e.id = r1.source_id
LEFT JOIN entity_relations r2 ON e.id = r2.target_id
LEFT JOIN citations c ON e.id = c.entity_id
GROUP BY e.id, e.name, e.type;

CREATE OR REPLACE VIEW top_relations AS
SELECT
  er.id,
  er.relation_type,
  e1.name as source_name,
  e1.type as source_type,
  e2.name as target_name,
  e2.type as target_type,
  er.weight,
  COUNT(c.id) as evidence_count
FROM entity_relations er
JOIN entities e1 ON er.source_id = e1.id
JOIN entities e2 ON er.target_id = e2.id
LEFT JOIN citations c ON er.id = c.relation_id
GROUP BY er.id, er.relation_type, e1.name, e1.type, e2.name, e2.type, er.weight
ORDER BY er.weight DESC, evidence_count DESC;


-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

-- Verificar tablas creadas
SELECT 
  'ai_prompts' as table_name,
  COUNT(*) as row_count
FROM ai_prompts
UNION ALL
SELECT 
  'trending_cache' as table_name,
  COUNT(*) as row_count
FROM trending_cache
UNION ALL
SELECT 
  'entity_relations' as table_name,
  COUNT(*) as row_count
FROM entity_relations
UNION ALL
SELECT 
  'citations' as table_name,
  COUNT(*) as row_count
FROM citations;

-- Verificar prompts seed
SELECT category, version, active, LEFT(prompt_text, 50) as prompt_preview
FROM ai_prompts
ORDER BY category, version DESC;


-- ============================================================================
-- ✅ MIGRACIONES APLICADAS EXITOSAMENTE
-- ============================================================================
-- 
-- Próximos pasos:
--   1. Ejecutar scripts de AI agents:
--      - npm run ai:learn (Learning Agent)
--      - npm run ai:detect-trends (Trending Detection)
--      - npm run ai:extract-entities (Entity Extraction)
--
--   2. Verificar GitHub Actions configuradas:
--      - .github/workflows/learning-agent.yml
--      - .github/workflows/detect-trending.yml
--      - .github/workflows/extract-entities.yml
--
--   3. Monitorear logs en ai_system_logs table
--
-- ============================================================================
