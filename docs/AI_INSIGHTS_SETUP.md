# AI News Insights System - Setup Instructions

## 🎯 Overview

This system provides real-time AI-powered insights about news articles:
- **Hype Detector**: Measures hype vs substance in articles
- **Domain Distribution**: Shows distribution across AI subdomains (CV, NLP, Robotics, etc.)
- **Trending Topics**: Identifies hot topics and their trends

## 📊 Database Setup

### Step 1: Create the `news_analytics` Table

The table stores AI-analyzed insights. **Run this SQL in your Supabase SQL Editor:**

```sql
-- Migration: Create news_analytics table for AI-generated insights

CREATE TABLE IF NOT EXISTS news_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Hype Detector metrics
  hype_score NUMERIC(5,2) DEFAULT 0 CHECK (hype_score >= 0 AND hype_score <= 100),
  substance_score NUMERIC(5,2) DEFAULT 0 CHECK (substance_score >= 0 AND substance_score <= 100),
  hype_keywords TEXT[] DEFAULT '{}',
  substance_keywords TEXT[] DEFAULT '{}',
  
  -- Domain Distribution (CV, NLP, Robotics, Ethics, Tools)
  domain_distribution JSONB DEFAULT '{}',
  
  -- Trending Topics
  trending_topics JSONB DEFAULT '[]',
  
  -- Sentiment Analysis by category
  sentiment_by_category JSONB DEFAULT '{}',
  
  -- Company activity tracking
  company_activity JSONB DEFAULT '[]',
  
  -- Metadata
  analysis_period_start TIMESTAMPTZ NOT NULL,
  analysis_period_end TIMESTAMPTZ NOT NULL,
  articles_analyzed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_news_analytics_updated 
ON news_analytics(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_news_analytics_period 
ON news_analytics(analysis_period_end DESC);

-- Enable Row Level Security
ALTER TABLE news_analytics ENABLE ROW LEVEL SECURITY;

-- Policy: Public read access
CREATE POLICY "Public read access for news_analytics" 
ON news_analytics FOR SELECT 
USING (true);

-- Policy: Only service role can insert/update
CREATE POLICY "Service role can insert/update news_analytics" 
ON news_analytics FOR ALL 
USING (auth.role() = 'service_role');
```

### Step 2: Verify Table Creation

Run this query to verify:

```sql
SELECT * FROM news_analytics LIMIT 1;
```

You should see an empty result set (no error).

## 🤖 Running the Analysis

### Manual Execution

Generate insights from your existing articles:

```bash
npm run analyze:insights
```

Or:

```bash
npx tsx scripts/analyze-news-insights.ts
```

### Automated Execution

The system runs automatically every 2 hours via GitHub Actions (see `.github/workflows/analyze-news-insights.yml`).

**Required GitHub Secrets:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENROUTER_API_KEY` (optional)
- `GROQ_API_KEY` (optional)

## 📈 How It Works

1. **Fetch**: Script fetches last 100 articles from `news_articles` table
2. **Analyze**: 
   - Detects hype keywords (revolutionary, game-changer, etc.)
   - Detects substance keywords (benchmark, performance, etc.)
   - Classifies articles into AI domains using keyword matching
3. **Store**: Saves aggregated insights to `news_analytics` table
4. **Serve**: `/api/news/insights` endpoint returns cached data (2h revalidation)
5. **Display**: UI components fetch and visualize the data

## 🎨 UI Components

- **NewsInsights**: Container with 3 equal-width columns
  - AILeaderboardPodium (left)
  - HypeDetector (center)
  - DomainDistribution (right)
- **CategoryFilters**: Full-width filter strip above news grid
- **NewsStats**: 4-card stats display

## 🔧 Configuration

### Keywords (in `scripts/analyze-news-insights.ts`)

**Hype Keywords:**
```typescript
const HYPE_KEYWORDS = [
  'revolutionary', 'game-changer', 'breakthrough', 'unprecedented',
  'never before', 'world-first', 'transformative', 'disrupting',
  'next generation', 'cutting-edge', 'paradigm shift', 'moonshot'
];
```

**Substance Keywords:**
```typescript
const SUBSTANCE_KEYWORDS = [
  'benchmark', 'performance', 'accuracy', 'implementation',
  'dataset', 'methodology', 'results', 'evaluation',
  'architecture', 'algorithm', 'metrics', 'validation',
  'peer-reviewed', 'experiment', 'analysis', 'research'
];
```

**Domain Keywords:**
```typescript
const DOMAIN_KEYWORDS = {
  cv: ['computer vision', 'image', 'video', 'visual', 'object detection'],
  nlp: ['language model', 'llm', 'gpt', 'nlp', 'text', 'chatbot'],
  robotics: ['robot', 'robotics', 'autonomous', 'drone'],
  ethics: ['ethics', 'bias', 'fairness', 'policy', 'regulation'],
  tools: ['framework', 'library', 'api', 'sdk', 'tool', 'platform']
};
```

## 🚀 Testing

1. **Create table** in Supabase (SQL above)
2. **Run analysis**: `npx tsx scripts/analyze-news-insights.ts`
3. **Check data**: Query `SELECT * FROM news_analytics ORDER BY updated_at DESC LIMIT 1;`
4. **Test API**: Visit `/api/news/insights` in browser
5. **View UI**: Visit `/en/news` or `/es/news`

## 📝 Notes

- Analysis runs every 2 hours automatically
- Fallback data is provided if no analysis exists yet
- All scores are 0-100 percentages
- Domain distribution must sum to 100%

## 🐛 Troubleshooting

**Error: "Could not find table news_analytics"**
→ Run the CREATE TABLE SQL in Supabase dashboard

**Error: "No articles found"**
→ Make sure you have articles in `news_articles` table

**GitHub Action fails**
→ Check that all secrets are configured correctly

**Data not updating**
→ Check GitHub Actions logs, ensure script runs successfully
