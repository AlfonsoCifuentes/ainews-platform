-- Fix content_embeddings unique constraint
-- Add unique constraint for ON CONFLICT to work properly

ALTER TABLE content_embeddings
DROP CONSTRAINT IF EXISTS content_embeddings_content_id_content_type_key;

ALTER TABLE content_embeddings
ADD CONSTRAINT content_embeddings_content_id_content_type_key 
UNIQUE (content_id, content_type);

-- Also ensure the table exists with proper structure
CREATE TABLE IF NOT EXISTS content_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL,
  content_type text NOT NULL CHECK (content_type IN ('article', 'course', 'entity')),
  embedding vector(1536) NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT content_embeddings_content_id_content_type_key UNIQUE (content_id, content_type)
);

-- Create index if not exists
CREATE INDEX IF NOT EXISTS idx_content_embeddings_type ON content_embeddings(content_type);
CREATE INDEX IF NOT EXISTS idx_content_embeddings_content_id ON content_embeddings(content_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_content_embeddings_updated_at ON content_embeddings;
CREATE TRIGGER update_content_embeddings_updated_at
  BEFORE UPDATE ON content_embeddings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
