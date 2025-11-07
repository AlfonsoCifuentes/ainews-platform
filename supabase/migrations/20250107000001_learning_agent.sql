-- ============================================
-- LEARNING AGENT: AI PROMPTS TABLE
-- ============================================
-- Almacena versiones de prompts con historial de mejoras
-- El Learning Agent crea nuevas versiones basadas en feedback

CREATE TABLE IF NOT EXISTS ai_prompts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Categoría del prompt
  category TEXT NOT NULL, -- 'news_curation', 'course_generation', 'translation', 'summarization'
  
  -- Contenido del prompt
  prompt_text TEXT NOT NULL,
  
  -- Versionado
  version INTEGER NOT NULL DEFAULT 1,
  active BOOLEAN DEFAULT true,
  
  -- Metadata de mejora
  improvement_reason TEXT, -- Por qué se mejoró este prompt
  expected_impact TEXT, -- Impacto esperado de la mejora
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  replaced_at TIMESTAMPTZ, -- Cuándo fue reemplazado por nueva versión
  
  -- Constraints
  UNIQUE(category, version)
);

-- Índices para performance
CREATE INDEX idx_ai_prompts_category_active ON ai_prompts(category, active);
CREATE INDEX idx_ai_prompts_created ON ai_prompts(created_at DESC);

-- ============================================
-- SEED: Prompts iniciales
-- ============================================

INSERT INTO ai_prompts (category, prompt_text, version, active) VALUES
(
  'news_curation',
  E'You are an AI news curator. Analyze the following article and determine if it is relevant to AI/ML news.

Consider relevant:
- New AI models, papers, or research
- AI company news and product launches
- Breakthroughs in ML, NLP, Computer Vision, Robotics
- AI ethics, policy, and regulation
- Industry applications of AI

Consider NOT relevant:
- Generic tech news without AI focus
- Cryptocurrency/blockchain (unless AI-related)
- General programming tutorials
- Marketing fluff without substance

Article:
{article}

Respond with JSON:
{
  "relevant": true/false,
  "category": "machinelearning" | "nlp" | "computervision" | "robotics" | "ethics" | "general",
  "reason": "brief explanation",
  "quality_score": 1-10
}',
  1,
  true
),
(
  'course_generation',
  E'You are an expert AI educator. Generate a comprehensive course outline on the following topic.

Topic: {topic}
Level: {level}
Duration: {duration} minutes

Create a structured course with:
- Clear learning objectives
- 5-7 modules with progressive difficulty
- Each module: title, content (500-800 words), estimated time, key takeaways
- Include practical examples and code snippets when relevant
- Add 3-5 quiz questions per module

Respond with JSON following this schema:
{
  "title": "course title",
  "description": "brief description",
  "modules": [
    {
      "title": "module title",
      "content": "detailed content in markdown",
      "estimatedTime": minutes,
      "keyTakeaways": ["point1", "point2"],
      "quiz": [
        {
          "question": "quiz question",
          "options": ["A", "B", "C", "D"],
          "correctAnswer": "A",
          "explanation": "why this is correct"
        }
      ]
    }
  ]
}',
  1,
  true
),
(
  'translation',
  E'You are a professional translator specializing in AI/tech content.

Translate the following text from {source_lang} to {target_lang}.

Requirements:
- Maintain technical accuracy
- Preserve markdown formatting
- Keep proper nouns and technical terms (GPT, Transformer, etc.)
- Natural, fluent language
- Adapt idioms culturally when needed

Text:
{text}

Respond with ONLY the translated text, no explanations.',
  1,
  true
),
(
  'summarization',
  E'You are an expert at creating concise, informative summaries of AI news articles.

Create a summary that:
- Captures the main points in 2-3 sentences
- Highlights key innovations or findings
- Mentions important people, companies, or products
- Is accessible to both technical and non-technical readers

Article:
{article}

Respond with ONLY the summary text (100-150 words).',
  1,
  true
);

-- ============================================
-- VERIFY
-- ============================================

SELECT category, version, active, created_at 
FROM ai_prompts 
ORDER BY category, version DESC;
