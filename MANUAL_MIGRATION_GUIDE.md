# 🗄️ Manual Database Migration Guide

**Project:** AINews Platform  
**Supabase Project ID:** yabsciwdpblqzskfupnj  
**Supabase URL:** https://yabsciwdpblqzskfupnj.supabase.co

---

## ⚡ QUICK START (Recommended Method)

### Step 1: Open Supabase SQL Editor

1. Go to: https://supabase.com/dashboard/project/yabsciwdpblqzskfupnj/sql
2. You should see the SQL Editor interface

### Step 2: Run Migrations in Order

Copy and paste each migration file content into the SQL Editor and click **RUN**.

**Execute in this exact order:**

#### Migration 1: Initial Schema ✅
**File:** `supabase/migrations/20250101000000_initial_schema.sql`

```
Creates: news_articles, content_embeddings, news_sources tables
Extensions: uuid-ossp, vector
```

#### Migration 2: Seed Data
**File:** `supabase/migrations/20250101000001_seed_data.sql`

```
Inserts: Sample news sources, badge criteria
```

#### Migration 3: User Auth & Gamification
**File:** `supabase/migrations/20250101000002_user_auth_gamification.sql`

```
Creates: user_profiles, user_xp, user_badges, user_progress
```

#### Migration 4: Analytics & Notifications
**File:** `supabase/migrations/20250101000003_analytics_notifications.sql`

```
Creates: analytics_events, notifications, email_subscriptions
```

#### Migration 5: Phase 4 Features
**File:** `supabase/migrations/20250101000004_phase4_revolutionary_features.sql`

```
Creates: reading_history, bookmarks, user_notes
```

#### Migration 6: Phase 5 Knowledge Graph
**File:** `supabase/migrations/20250101000005_phase5_knowledge_graph.sql`

```
Creates: entities, entity_relations, citations
```

#### Migration 7: Semantic Search Functions
**File:** `supabase/migrations/20250101000006_semantic_search_functions.sql`

```
Creates: match_documents(), search_articles() functions
```

#### Migration 8: User Engagement
**File:** `supabase/migrations/20250101000007_user_engagement.sql`

```
Creates: user_sessions, user_feedback tables
```

#### Migration 9: Flashcards & SRS
**File:** `supabase/migrations/20250101000008_flashcards_srs.sql`

```
Creates: flashcards, flashcard_reviews tables
```

#### Migration 10: Citations & Fact Checking
**File:** `supabase/migrations/20250101000009_citations_fact_checking.sql`

```
Creates: fact_checks, source_credibility tables
```

#### Migration 11: Gamification System
**File:** `supabase/migrations/20250101000010_gamification_system.sql`

```
Creates: badge_criteria, leaderboard views
```

---

## ✅ VERIFICATION STEPS

After running all migrations, verify the setup:

### 1. Check Tables Created

Run this query in SQL Editor:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

**Expected tables (25+):**
- analytics_events
- badge_criteria
- bookmarks
- citations
- content_embeddings
- courses
- course_modules
- email_subscriptions
- entities
- entity_relations
- fact_checks
- flashcards
- flashcard_reviews
- news_articles
- news_sources
- notifications
- reading_history
- source_credibility
- user_badges
- user_feedback
- user_notes
- user_profiles
- user_progress
- user_sessions
- user_xp

### 2. Check Extensions Enabled

```sql
SELECT * FROM pg_extension 
WHERE extname IN ('uuid-ossp', 'vector', 'pg_trgm', 'btree_gin');
```

**Expected:** All 4 extensions listed

### 3. Check RLS Policies

```sql
SELECT tablename, policyname, permissive, roles, cmd
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename;
```

**Expected:** Multiple policies for user-specific tables

### 4. Test Sample Query

```sql
-- Should return empty result (no articles yet)
SELECT COUNT(*) FROM news_articles;

-- Should return badge criteria rows
SELECT * FROM badge_criteria;

-- Should return news sources
SELECT * FROM news_sources;
```

---

## 🚨 TROUBLESHOOTING

### Error: "extension vector does not exist"

**Solution:**
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Then re-run the migration.

### Error: "relation already exists"

**Solution:** The table was already created. This is safe to ignore, or you can:
```sql
DROP TABLE IF EXISTS [table_name] CASCADE;
```
Then re-run the migration.

### Error: "permission denied"

**Solution:** Make sure you're using the service role key, not the anon key.

---

## 🔄 ALTERNATIVE: Automated Script

If you prefer automation, run:

```bash
npm install -g supabase
supabase login
supabase link --project-ref yabsciwdpblqzskfupnj
supabase db push
```

---

## ✅ SUCCESS CRITERIA

✅ All 25+ tables created  
✅ Vector extension enabled  
✅ RLS policies active  
✅ Sample data inserted (sources, badge criteria)  
✅ No errors in migration logs

---

**Next Step:** Once migrations complete, proceed to Vercel deployment setup.

**Status:** Ready to execute manually via Supabase dashboard
