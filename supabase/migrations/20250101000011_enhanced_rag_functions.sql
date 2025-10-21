-- ============================================
-- ENHANCED EMBEDDINGS & RAG FUNCTIONS
-- ============================================

-- Function to generate embeddings (placeholder - called from application)
-- Real embedding generation happens in TypeScript with OpenRouter

-- Drop existing functions if they exist (to allow signature changes)
DROP FUNCTION IF EXISTS match_documents(vector, float, int);
DROP FUNCTION IF EXISTS find_related_articles(uuid, int);
DROP FUNCTION IF EXISTS match_entities(vector, float, int);
DROP FUNCTION IF EXISTS recommend_courses(uuid, int);

-- Function to search similar documents using pgvector
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.75,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  title_en text,
  title_es text,
  content_en text,
  content_es text,
  category text,
  published_at timestamptz,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ce.content_id as id,
    na.title_en,
    na.title_es,
    na.content_en,
    na.content_es,
    na.category,
    na.published_at,
    1 - (ce.embedding <=> query_embedding) as similarity
  FROM content_embeddings ce
  JOIN news_articles na ON ce.content_id = na.id
  WHERE ce.content_type = 'article'
    AND 1 - (ce.embedding <=> query_embedding) > match_threshold
  ORDER BY ce.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function to find related articles by similarity
CREATE OR REPLACE FUNCTION find_related_articles(
  article_id uuid,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  title_en text,
  title_es text,
  content_en text,
  content_es text,
  summary_en text,
  summary_es text,
  category text,
  image_url text,
  published_at timestamptz,
  similarity float
)
LANGUAGE plpgsql
AS $$
DECLARE
  source_embedding vector(1536);
BEGIN
  -- Get embedding of source article
  SELECT embedding INTO source_embedding
  FROM content_embeddings
  WHERE content_id = article_id AND content_type = 'article'
  LIMIT 1;
  
  IF source_embedding IS NULL THEN
    RAISE EXCEPTION 'Article embedding not found for id: %', article_id;
  END IF;
  
  -- Find similar articles
  RETURN QUERY
  SELECT
    ce.content_id as id,
    na.title_en,
    na.title_es,
    na.content_en,
    na.content_es,
    na.summary_en,
    na.summary_es,
    na.category,
    na.image_url,
    na.published_at,
    1 - (ce.embedding <=> source_embedding) as similarity
  FROM content_embeddings ce
  JOIN news_articles na ON ce.content_id = na.id
  WHERE ce.content_type = 'article'
    AND ce.content_id != article_id
  ORDER BY ce.embedding <=> source_embedding
  LIMIT match_count;
END;
$$;

-- Function to search entities (for Knowledge Graph)
CREATE OR REPLACE FUNCTION match_entities(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  similarity float,
  entity jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    1 - (ce.embedding <=> query_embedding) as similarity,
    jsonb_build_object(
      'id', e.id,
      'name', e.name,
      'type', e.type,
      'description', e.description
    ) as entity
  FROM content_embeddings ce
  JOIN entities e ON ce.content_id = e.id
  WHERE ce.content_type = 'entity'
    AND 1 - (ce.embedding <=> query_embedding) > match_threshold
  ORDER BY ce.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function to get course recommendations based on reading history
CREATE OR REPLACE FUNCTION recommend_courses(
  user_id_param uuid,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  title_en text,
  title_es text,
  description_en text,
  description_es text,
  difficulty text,
  duration_minutes int,
  relevance_score float
)
LANGUAGE plpgsql
AS $$
DECLARE
  avg_embedding vector(1536);
BEGIN
  -- Calculate average embedding from user's reading history
  SELECT AVG(ce.embedding)::vector(1536) INTO avg_embedding
  FROM reading_history rh
  JOIN content_embeddings ce ON rh.article_id = ce.content_id
  WHERE rh.user_id = user_id_param
    AND ce.content_type = 'article'
  LIMIT 20;
  
  IF avg_embedding IS NULL THEN
    -- Return popular courses if no history
    RETURN QUERY
    SELECT c.id, c.title_en, c.title_es, c.description_en, c.description_es,
           c.difficulty, c.duration_minutes, 0.5::float as relevance_score
    FROM courses c
    WHERE c.status = 'published'
    ORDER BY c.enrollment_count DESC
    LIMIT match_count;
  ELSE
    -- Return courses similar to reading preferences
    RETURN QUERY
    SELECT
      c.id,
      c.title_en,
      c.title_es,
      c.description_en,
      c.description_es,
      c.difficulty,
      c.duration_minutes,
      1 - (ce.embedding <=> avg_embedding) as relevance_score
    FROM content_embeddings ce
    JOIN courses c ON ce.content_id = c.id
    WHERE ce.content_type = 'course'
      AND c.status = 'published'
    ORDER BY ce.embedding <=> avg_embedding
    LIMIT match_count;
  END IF;
END;
$$;

-- Index for faster vector similarity search
CREATE INDEX IF NOT EXISTS idx_embeddings_vector_cosine 
ON content_embeddings 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION match_documents TO anon, authenticated;
GRANT EXECUTE ON FUNCTION find_related_articles TO anon, authenticated;
GRANT EXECUTE ON FUNCTION match_entities TO anon, authenticated;
GRANT EXECUTE ON FUNCTION recommend_courses TO authenticated;
