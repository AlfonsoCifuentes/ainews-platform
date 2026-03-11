-- =====================================================
-- SCHEMA RECONCILIATION BLOCK 2
-- Runs after phase5_knowledge_graph (entities, entity_relations, citations exist)
-- and after phase5_complete (flashcards, comments, fact_checks exist)
-- Adds ALL missing columns from duplicate table definitions
-- =====================================================

-- 1. content_embeddings: add updated_at (needed by update trigger)
ALTER TABLE content_embeddings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. user_progress: add notes, updated_at
ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. flashcards: add interval_days (SRS functions use this name instead of "interval")
ALTER TABLE flashcards ADD COLUMN IF NOT EXISTS interval_days INTEGER DEFAULT 0;

-- 4. comments: add columns from explicit-FK design (article_id, course_id, parent_comment_id, is_edited)
ALTER TABLE comments ADD COLUMN IF NOT EXISTS article_id UUID;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS course_id UUID;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS parent_comment_id UUID;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE;

-- Add FKs safely
DO $$ BEGIN
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'comments_article_id_fkey') THEN
      ALTER TABLE comments ADD CONSTRAINT comments_article_id_fkey FOREIGN KEY (article_id) REFERENCES news_articles(id) ON DELETE CASCADE;
    END IF;
  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'comments_article_id_fkey: %', SQLERRM;
  END;
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'comments_course_id_fkey') THEN
      ALTER TABLE comments ADD CONSTRAINT comments_course_id_fkey FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;
    END IF;
  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'comments_course_id_fkey: %', SQLERRM;
  END;
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'comments_parent_comment_id_fkey') THEN
      ALTER TABLE comments ADD CONSTRAINT comments_parent_comment_id_fkey FOREIGN KEY (parent_comment_id) REFERENCES comments(id) ON DELETE CASCADE;
    END IF;
  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'comments_parent_comment_id_fkey: %', SQLERRM;
  END;
END $$;

-- 5. fact_checks: add all missing columns from 3 alternate definitions
ALTER TABLE fact_checks ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE fact_checks ADD COLUMN IF NOT EXISTS relation_id UUID;
ALTER TABLE fact_checks ADD COLUMN IF NOT EXISTS checked_by TEXT;
ALTER TABLE fact_checks ADD COLUMN IF NOT EXISTS checked_at TIMESTAMPTZ;
ALTER TABLE fact_checks ADD COLUMN IF NOT EXISTS claims JSONB DEFAULT '[]'::jsonb;
ALTER TABLE fact_checks ADD COLUMN IF NOT EXISTS results JSONB DEFAULT '[]'::jsonb;
ALTER TABLE fact_checks ADD COLUMN IF NOT EXISTS overall_score INTEGER;
ALTER TABLE fact_checks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add FKs for fact_checks safely
DO $$ BEGIN
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fact_checks_entity_id_fkey') THEN
      ALTER TABLE fact_checks ADD CONSTRAINT fact_checks_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE SET NULL;
    END IF;
  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'fact_checks_entity_id_fkey: %', SQLERRM;
  END;
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fact_checks_relation_id_fkey') THEN
      ALTER TABLE fact_checks ADD CONSTRAINT fact_checks_relation_id_fkey FOREIGN KEY (relation_id) REFERENCES entity_relations(id) ON DELETE SET NULL;
    END IF;
  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'fact_checks_relation_id_fkey: %', SQLERRM;
  END;
END $$;

-- 6. user_interests: add tag_id (tag-based interest system)
ALTER TABLE user_interests ADD COLUMN IF NOT EXISTS tag_id UUID;

-- 7. entity_relations: add relation_type + created_at (second def uses different column name)
ALTER TABLE entity_relations ADD COLUMN IF NOT EXISTS relation_type TEXT;
ALTER TABLE entity_relations ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
-- Sync relation_type from rel_type for any existing rows
UPDATE entity_relations SET relation_type = rel_type WHERE relation_type IS NULL AND rel_type IS NOT NULL;

-- 8. citations: add source_title, confidence_score, verified, confidence
ALTER TABLE citations ADD COLUMN IF NOT EXISTS source_title TEXT;
ALTER TABLE citations ADD COLUMN IF NOT EXISTS confidence_score NUMERIC(3,2);
ALTER TABLE citations ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE;
ALTER TABLE citations ADD COLUMN IF NOT EXISTS confidence NUMERIC(3,2) DEFAULT 1.0;
