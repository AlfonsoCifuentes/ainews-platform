-- Migration: Add comments system for articles and courses
-- Date: 2025-01-04

-- comments table: User comments on articles
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  article_id UUID REFERENCES news_articles(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_edited BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Must belong to either article or course, but not both
  CONSTRAINT comment_belongs_to_one CHECK (
    (article_id IS NOT NULL AND course_id IS NULL) OR
    (article_id IS NULL AND course_id IS NOT NULL)
  ),
  
  -- Content must not be empty
  CONSTRAINT content_not_empty CHECK (LENGTH(TRIM(content)) > 0)
);

-- comment_reactions: Likes/reactions to comments
CREATE TABLE IF NOT EXISTS comment_reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type VARCHAR(20) NOT NULL DEFAULT 'like',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(comment_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_comments_article ON comments(article_id);
CREATE INDEX IF NOT EXISTS idx_comments_course ON comments(course_id);
CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_comments_created ON comments(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reactions_comment ON comment_reactions(comment_id);
CREATE INDEX IF NOT EXISTS idx_reactions_user ON comment_reactions(user_id);

-- RLS Policies
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_reactions ENABLE ROW LEVEL SECURITY;

-- Everyone can view comments
CREATE POLICY "Anyone can view comments"
  ON comments
  FOR SELECT
  USING (true);

-- Authenticated users can create comments
CREATE POLICY "Authenticated users can create comments"
  ON comments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own comments
CREATE POLICY "Users can update own comments"
  ON comments
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments"
  ON comments
  FOR DELETE
  USING (auth.uid() = user_id);

-- Everyone can view reactions
CREATE POLICY "Anyone can view reactions"
  ON comment_reactions
  FOR SELECT
  USING (true);

-- Authenticated users can react
CREATE POLICY "Authenticated users can react"
  ON comment_reactions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can remove their own reactions
CREATE POLICY "Users can remove own reactions"
  ON comment_reactions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Comments
COMMENT ON TABLE comments IS 'User comments on articles and courses';
COMMENT ON COLUMN comments.parent_comment_id IS 'For threaded replies';
COMMENT ON COLUMN comments.is_edited IS 'Flag if comment was edited after creation';
COMMENT ON TABLE comment_reactions IS 'Reactions (likes) on comments';
