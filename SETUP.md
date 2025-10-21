# AI News Platform - Setup Guide

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Supabase account (free tier)
- Groq API key (free tier)
- OpenRouter API key (free tier)

### 1. Clone and Install
```bash
git clone <your-repo-url>
cd AINews
npm install
```

### 2. Database Setup

#### Apply Supabase Migrations
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Create a new project (or use existing)
3. Navigate to SQL Editor
4. Run migrations in order:
   - `supabase/migrations/20250101000000_initial_schema.sql`
   - `supabase/migrations/20250101000001_seed_data.sql`

**Important**: Make sure `pgvector` extension is enabled:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

#### Get Supabase Credentials
- **Project URL**: Settings → API → Project URL
- **Anon Key**: Settings → API → anon public
- **Service Role Key**: Settings → API → service_role (⚠️ Keep secret!)

### 3. LLM API Keys

#### Groq (Free Tier)
1. Visit [Groq Console](https://console.groq.com)
2. Create account
3. Generate API key
4. Free tier: 14,400 requests/day

#### OpenRouter (Free Credits)
1. Visit [OpenRouter](https://openrouter.ai)
2. Sign up
3. Go to Keys → Create Key
4. Free tier: $1 credit (renews monthly)

### 4. Environment Variables

Create `.env.local`:
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# LLM APIs
GROQ_API_KEY=gsk_...
OPENROUTER_API_KEY=sk-or-v1-...
```

### 5. Run Development Server
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

---

## 🤖 AI Automation Setup

### GitHub Actions Secrets

For automated news curation, add secrets to your GitHub repository:

1. Go to **Settings → Secrets and variables → Actions**
2. Add these secrets:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GROQ_API_KEY`
   - `OPENROUTER_API_KEY`

### Manual Curation Test

Test the curation script locally:
```bash
npm run ai:curate
```

This will:
- Fetch articles from 15+ RSS feeds
- Filter with LLM (quality scoring)
- Translate EN ↔ ES
- Generate embeddings
- Store in Supabase

### GitHub Actions Schedule

The workflow runs automatically every 6 hours:
- Cron: `0 */6 * * *` (midnight, 6am, noon, 6pm UTC)
- Manual trigger available via Actions tab

---

## 🧪 Testing Course Generation

### Via API
```bash
curl -X POST http://localhost:3000/api/courses/generate \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "Transformer Architecture",
    "difficulty": "intermediate",
    "duration": "medium",
    "locale": "en"
  }'
```

### Via UI
1. Navigate to `/en/courses` or `/es/courses`
2. Enter topic and preferences
3. Click "Generate Course"
4. AI will create curriculum with modules, quizzes, and resources

---

## 📊 Monitoring

### Supabase Dashboard
- **News Articles**: Check `news_articles` table
- **AI Logs**: Query `ai_system_logs` for performance metrics
- **Embeddings**: View `content_embeddings` for RAG setup

### GitHub Actions
- Navigate to **Actions** tab
- View curation workflow runs
- Check logs for errors/metrics

---

## 🌍 i18n (Internationalization)

All routes are bilingual by default:
- English: `/en/...`
- Spanish: `/es/...`

Content is stored with dual columns:
- `title_en` / `title_es`
- `content_en` / `content_es`

Translation happens automatically via LLM during curation.

---

## 💰 Cost Breakdown (Zero!)

| Service | Free Tier | Monthly Usage |
|---------|-----------|---------------|
| Vercel | 100 GB bandwidth | ~5 GB |
| Supabase | 500 MB DB | ~200 MB |
| Groq | 14,400 req/day | ~400 req/day |
| OpenRouter | $1/month credits | ~$0.20/month |
| GitHub Actions | 2,000 minutes | ~30 minutes |

**Total Monthly Cost: $0** (within all free tiers)

---

## 🔧 Troubleshooting

### Database Errors
**Error**: `relation "news_articles" does not exist`
- **Fix**: Apply migration SQL in Supabase dashboard

**Error**: `type "vector" does not exist`
- **Fix**: Enable pgvector extension in Supabase

### LLM API Errors
**Error**: `401 Unauthorized`
- **Fix**: Check API keys in `.env.local`

**Error**: `Rate limit exceeded`
- **Fix**: Wait or upgrade to paid tier

### GitHub Actions Failing
**Error**: Secrets not found
- **Fix**: Add all required secrets in repository settings

---

## 📚 Additional Resources

- [Supabase Docs](https://supabase.com/docs)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Groq API Docs](https://console.groq.com/docs)
- [OpenRouter Docs](https://openrouter.ai/docs)

---

## 🚀 Deployment

### Vercel (Recommended)
```bash
npm install -g vercel
vercel
```

1. Connect GitHub repository
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push to `main`

### Cloudflare Pages
1. Connect repository in Cloudflare dashboard
2. Build command: `npm run build`
3. Output directory: `.next`
4. Add environment variables

---

**Need help?** Check `PROJECT_MASTER.md` for architecture details or create an issue!
