# Phase 2: Database Migration & Production Setup

## 🎯 OBJECTIVES

This phase focuses on setting up the production database infrastructure and preparing for deployment.

---

## 📋 TASK BREAKDOWN

### Task 1: Supabase Production Setup (30 minutes)

#### Step 1.1: Create Production Project
- [ ] Go to https://app.supabase.com
- [ ] Create new project: `ainews-production`
- [ ] Select region: Choose closest to target users (US East or EU West)
- [ ] Generate strong database password
- [ ] Wait for project provisioning (~2 minutes)

#### Step 1.2: Enable Required Extensions
```sql
-- Run in Supabase SQL Editor
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gin;
```

#### Step 1.3: Configure Database Settings
- [ ] Enable "Use pooler" in Database settings
- [ ] Set connection pooling mode: Transaction
- [ ] Configure statement timeout: 60 seconds
- [ ] Enable Row Level Security by default

---

### Task 2: Run Database Migrations (20 minutes)

#### Migration Order (Sequential Execution):
```bash
# From supabase/migrations/ directory
1. 000000_initial_schema.sql       # Base tables
2. 000001_auth_enhancements.sql    # User profiles
3. 000002_news_system.sql          # Articles + sources
4. 000003_courses.sql              # Course modules
5. 000004_gamification.sql         # XP + badges
6. 000005_knowledge_graph.sql      # Entities + relations
7. 000006_flashcards.sql           # SRS system
8. 000007_analytics.sql            # User tracking
9. 000008_learning_paths.sql       # Custom paths
10. 000009_embeddings_rls.sql      # Vector search + RLS
```

#### Execution Method:
**Option A: Supabase Dashboard** (Recommended)
1. Open SQL Editor in Supabase dashboard
2. Paste migration content
3. Run each migration individually
4. Verify no errors in output

**Option B: Supabase CLI**
```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Login
supabase login

# Link to project
supabase link --project-ref YOUR_PROJECT_REF

# Run all migrations
supabase db push
```

#### Verification Queries:
```sql
-- Check tables created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check RLS policies enabled
SELECT tablename, policyname FROM pg_policies 
WHERE schemaname = 'public';

-- Verify vector extension
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Count total tables (should be ~25)
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public';
```

---

### Task 3: Environment Variables Configuration (15 minutes)

#### Step 3.1: Gather Supabase Credentials
**From Project Settings > API**:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-public-key]
SUPABASE_SERVICE_ROLE_KEY=[service-role-secret-key]
```

#### Step 3.2: Configure LLM API Keys

**OpenRouter** (Free Tier):
1. Sign up at https://openrouter.ai
2. Get API key from dashboard
3. Free tier: 10 requests/minute
```bash
OPENROUTER_API_KEY=sk-or-v1-[your-key]
```

**Groq** (Optional - Faster inference):
1. Sign up at https://console.groq.com
2. Get API key
3. Free tier: 30 requests/minute
```bash
GROQ_API_KEY=[your-groq-key]
```

#### Step 3.3: Generate Secure Tokens
```bash
# Admin token for cron jobs (Node.js)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or using OpenSSL (PowerShell)
openssl rand -hex 32
```

#### Step 3.4: Update .env.local
Replace all placeholder values in `.env.local`:
```bash
# Core (Required)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
OPENROUTER_API_KEY=sk-or-v1-...
ADMIN_TOKEN=[64-char-hex-string]

# Optional Analytics
NEXT_PUBLIC_UMAMI_URL=https://analytics.yourdomain.com
NEXT_PUBLIC_UMAMI_SITE_ID=[site-id]

# Optional Email
RESEND_API_KEY=re_...
```

---

### Task 4: Seed Initial Data (Optional - 10 minutes)

#### Create Sample Content:
```sql
-- Insert sample news sources
INSERT INTO news_sources (name, url, language, category) VALUES
  ('OpenAI Blog', 'https://openai.com/blog/rss', 'en', 'research'),
  ('Google AI Blog', 'https://ai.googleblog.com/feeds/posts/default', 'en', 'research'),
  ('Anthropic News', 'https://www.anthropic.com/news/rss', 'en', 'research');

-- Insert sample badge criteria
INSERT INTO badge_criteria (badge_name, criteria_type, count, days) VALUES
  ('First Steps', 'articles_read', 1, NULL),
  ('Knowledge Seeker', 'articles_read', 10, NULL),
  ('Week Warrior', 'login_streak', NULL, 7),
  ('Course Complete', 'courses_completed', 1, NULL);
```

---

### Task 5: Vercel Deployment Setup (20 minutes)

#### Step 5.1: Create Vercel Project
1. Go to https://vercel.com/new
2. Import GitHub repository
3. Select `AINews` repository
4. Framework preset: Next.js (auto-detected)
5. Root directory: `./`
6. Build command: `npm run build` (default)
7. Output directory: `.next` (default)

#### Step 5.2: Configure Environment Variables
**In Vercel Dashboard > Settings > Environment Variables**:

Add all variables from `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL` → Production, Preview, Development
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` → Production, Preview, Development
- `SUPABASE_SERVICE_ROLE_KEY` → Production only (sensitive)
- `OPENROUTER_API_KEY` → Production only
- `ADMIN_TOKEN` → Production only
- `GROQ_API_KEY` → Production only (if using)
- `RESEND_API_KEY` → Production only (if using)
- Analytics variables → All environments

#### Step 5.3: Configure Build Settings
- **Framework**: Next.js
- **Node Version**: 18.x (or latest LTS)
- **Install Command**: `npm install`
- **Build Command**: `npm run build`
- **Output Directory**: `.next`

#### Step 5.4: Domain Configuration (Optional)
- Add custom domain in Vercel dashboard
- Configure DNS records:
  - `A` record: Vercel's IP
  - `CNAME` record: `cname.vercel-dns.com`
- Enable automatic HTTPS

---

### Task 6: GitHub Actions Setup (10 minutes)

#### Configure Repository Secrets:
**Settings > Secrets and variables > Actions**

Add the following secrets:
```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
OPENROUTER_API_KEY=sk-or-v1-...
ADMIN_TOKEN=[64-char-hex]
```

#### Verify Workflow Files:
Check `.github/workflows/ai-curation.yml` exists and is configured:
```yaml
name: AI News Curation
on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
  workflow_dispatch:  # Manual trigger
```

---

## 🔍 VERIFICATION CHECKLIST

### Database Verification:
- [ ] All 10 migrations executed successfully
- [ ] Vector extension enabled
- [ ] RLS policies active on all tables
- [ ] Sample data inserted (if applicable)
- [ ] Connection pooling configured

### Environment Verification:
- [ ] All Supabase credentials valid
- [ ] LLM API keys tested (make test request)
- [ ] Admin token generated and secure
- [ ] No placeholder values in production .env

### Vercel Verification:
- [ ] Project created and linked to GitHub
- [ ] All environment variables added
- [ ] Build settings configured correctly
- [ ] Domain configured (if applicable)
- [ ] Initial deployment triggered

### GitHub Actions Verification:
- [ ] All secrets added to repository
- [ ] Workflow files present in `.github/workflows/`
- [ ] Manual workflow trigger works
- [ ] Scheduled cron jobs configured

---

## 🚨 TROUBLESHOOTING

### Common Issues:

#### Issue 1: Migration Fails
**Symptoms**: Error during SQL execution
**Solutions**:
- Check Supabase logs in dashboard
- Verify vector extension installed first
- Run migrations one-by-one to isolate error
- Check for syntax errors in migration files

#### Issue 2: Vercel Build Fails
**Symptoms**: "Build failed" in Vercel dashboard
**Solutions**:
- Check build logs for specific error
- Verify all environment variables set
- Test build locally: `npm run build`
- Check Node.js version compatibility

#### Issue 3: API Keys Invalid
**Symptoms**: 401/403 errors from LLM APIs
**Solutions**:
- Regenerate API keys
- Check rate limits not exceeded
- Verify keys copied correctly (no extra spaces)
- Test with curl or Postman first

#### Issue 4: RLS Policies Block Access
**Symptoms**: Database queries return empty results
**Solutions**:
- Temporarily disable RLS for testing
- Check policy definitions in migration files
- Verify JWT tokens being passed correctly
- Test queries in Supabase SQL editor

---

## 📊 SUCCESS CRITERIA

### Database Setup Complete When:
- ✅ All 25+ tables created
- ✅ Vector extension active
- ✅ RLS policies enabled
- ✅ Connection pooling configured
- ✅ Test query returns expected results

### Environment Config Complete When:
- ✅ All real values (no placeholders)
- ✅ API keys tested and working
- ✅ Admin token secure (64+ chars)
- ✅ Vercel environment variables added
- ✅ Local .env.local updated

### Vercel Setup Complete When:
- ✅ Project linked to GitHub
- ✅ Initial build succeeds
- ✅ Environment variables validated
- ✅ Preview deployments working
- ✅ Domain configured (if applicable)

---

## ⏱️ ESTIMATED TIME

| Task | Duration |
|------|----------|
| Supabase Setup | 30 min |
| Database Migrations | 20 min |
| Environment Config | 15 min |
| Seed Data | 10 min |
| Vercel Setup | 20 min |
| GitHub Actions | 10 min |
| **Total** | **~105 min** |

---

## 🔒 SECURITY NOTES

### Critical Reminders:
1. **Never commit** `.env.local` to Git
2. **Use strong passwords** for Supabase (20+ chars)
3. **Rotate admin token** regularly (every 90 days)
4. **Enable 2FA** on Supabase and Vercel accounts
5. **Limit service role key** usage (use anon key when possible)
6. **Monitor API usage** to detect abuse
7. **Review RLS policies** before production traffic

---

## 📝 NEXT PHASE

After Phase 2 completion, proceed to **Phase 3: Production Deployment**:
- Trigger production deployment
- Monitor build process
- Verify all features working
- Run Lighthouse audit
- Configure monitoring

---

**Status**: Ready to execute (requires user action for credentials)

**Blocking**: Needs real Supabase credentials and Vercel account

**Recommendation**: Execute tasks 1-4 first, then proceed with Vercel setup
