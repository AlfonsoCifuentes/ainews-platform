# 🚀 Quick Deployment Reference

**One-page guide for deploying AINews platform to production**

---

## ✅ PRE-FLIGHT CHECKLIST

### Phase 1: Build Validation (COMPLETE ✅)

- [x] TypeScript compiles (0 errors)
- [x] Production build succeeds
- [x] Environment documented
- [x] i18n configuration updated
- [x] All tests passing

---

## 🔧 PHASE 2: DATABASE SETUP (15-30 min)

### Step 1: Create Supabase Project

```
1. Go to: https://app.supabase.com
2. Click "New Project"
3. Name: ainews-production
4. Region: Choose closest to users
5. Password: Generate strong (20+ chars)
6. Wait ~2 minutes for provisioning
```

### Step 2: Enable Extensions

```sql
-- Run in Supabase SQL Editor
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gin;
```

### Step 3: Run Migrations

```
Method A (Dashboard):
1. Open Supabase SQL Editor
2. Copy each file from supabase/migrations/
3. Run in order (000000 → 000009)
4. Verify no errors

Method B (CLI):
$ npm install -g supabase
$ supabase login
$ supabase link --project-ref YOUR_REF
$ supabase db push
```

### Step 4: Get Credentials

```
From: Project Settings > API

Copy these values:
✓ Project URL (NEXT_PUBLIC_SUPABASE_URL)
✓ anon public key (NEXT_PUBLIC_SUPABASE_ANON_KEY)
✓ service_role secret (SUPABASE_SERVICE_ROLE_KEY)
```

---

## 🌐 PHASE 3: VERCEL DEPLOYMENT (10-15 min)

### Step 1: Create Vercel Project

```
1. Go to: https://vercel.com/new
2. Import GitHub repository
3. Select AINews repo
4. Framework: Next.js (auto-detected)
5. Root: ./ (default)
6. Build: npm run build (default)
```

### Step 2: Add Environment Variables

```
In Vercel Dashboard > Settings > Environment Variables:

REQUIRED (Production only):
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
OPENROUTER_API_KEY=sk-or-v1-...
ADMIN_TOKEN=[generate with: openssl rand -hex 32]

OPTIONAL:
GROQ_API_KEY=...
RESEND_API_KEY=re_...
NEXT_PUBLIC_UMAMI_URL=...
NEXT_PUBLIC_UMAMI_SITE_ID=...
```

### Step 3: Deploy

```
Method A (Automatic):
$ git push origin main
(Vercel auto-deploys)

Method B (Manual):
Click "Deploy" in Vercel dashboard
```

---

## ✅ PHASE 4: VERIFICATION (5-10 min)

### Quick Smoke Tests

```bash
# Homepage loads
curl -I https://your-app.vercel.app/en
# Expected: 200 OK

# API works
curl https://your-app.vercel.app/api/news/sources
# Expected: JSON array

# i18n routing
curl -I https://your-app.vercel.app/es
# Expected: 200 OK
```

### Feature Checklist

```
Manual Tests:
□ Homepage loads (EN/ES)
□ News articles display
□ Course generator works
□ Knowledge graph renders
□ Flashcards functional
□ Dashboard loads (auth)
□ Trending topics show
□ Search returns results
□ Voice assistant works
□ PWA installs
```

### Performance Check

```
Run Lighthouse in Chrome DevTools:
Target Scores:
□ Performance: 90+
□ Accessibility: 95+
□ Best Practices: 95+
□ SEO: 100
□ PWA: 100
```

---

## 🔥 EMERGENCY COMMANDS

### Rollback Deployment

```bash
# Vercel CLI
vercel rollback [deployment-url]

# Or in dashboard:
Deployments > Previous > Promote to Production
```

### Check Logs

```bash
# Vercel function logs
vercel logs https://your-app.vercel.app

# Specific function
vercel logs https://your-app.vercel.app/api/news
```

### Database Backup

```sql
-- In Supabase SQL Editor
SELECT * FROM news_articles INTO OUTFILE 'backup.csv';

-- Or use Supabase CLI
supabase db dump > backup.sql
```

---

## 🚨 TROUBLESHOOTING

### Build Fails

```
1. Check Vercel build logs
2. Verify environment variables set
3. Test locally: npm run build
4. Check Node.js version (18.x required)
```

### API Returns 500

```
1. Check Vercel function logs
2. Verify Supabase credentials
3. Test database connection
4. Check RLS policies not blocking
```

### Slow Performance

```
1. Run Lighthouse audit
2. Check bundle size: npm run analyze
3. Optimize images with next/image
4. Enable CDN caching in Vercel
```

---

## 📊 SUCCESS CRITERIA

### Deployment Complete When:

- ✅ Build succeeds without errors
- ✅ Homepage loads in < 3 seconds
- ✅ All API endpoints return 200
- ✅ Database queries work
- ✅ Both locales (EN/ES) functional
- ✅ Lighthouse score > 90
- ✅ No console errors
- ✅ Auth flow works
- ✅ Features verified (all 10)
- ✅ Monitoring enabled

---

## 🎯 POST-DEPLOYMENT

### Immediate (Day 1)

```
□ Monitor error rates (Vercel dashboard)
□ Test on mobile devices
□ Verify analytics tracking
□ Share URL with stakeholders
□ Document any issues
```

### Short-term (Week 1)

```
□ Run news curation manually once
□ Enable GitHub Actions cron jobs
□ Set up uptime monitoring
□ Configure email notifications
□ Collect user feedback
```

### Medium-term (Month 1)

```
□ Analyze user behavior
□ Optimize slow queries
□ Add missing features
□ Scale if needed
□ Plan marketing campaign
```

---

## 🔗 USEFUL LINKS

```
Supabase Dashboard:
https://app.supabase.com/project/YOUR_REF

Vercel Dashboard:
https://vercel.com/your-team/ainews

GitHub Actions:
https://github.com/your-username/AINews/actions

Uptime Monitor:
https://uptimerobot.com (free 50 monitors)

Analytics:
https://umami.is (self-hosted, free)
```

---

## 📚 DETAILED GUIDES

For comprehensive step-by-step instructions, see:

- `DEPLOYMENT_PHASE_2_GUIDE.md` - Database setup
- `DEPLOYMENT_PHASE_3_VERIFICATION.md` - Feature testing
- `scripts/DEPLOYMENT_SCRIPTS.md` - Automation
- `AUTONOMOUS_DEPLOYMENT_SESSION_COMPLETE.md` - This session's report

---

## 💡 QUICK TIPS

### API Keys (Free Tiers)

```
OpenRouter: https://openrouter.ai
- Free: 10 req/min
- No credit card required

Groq: https://console.groq.com
- Free: 30 req/min
- Very fast inference

Resend: https://resend.com
- Free: 3,000 emails/month
- Transactional emails
```

### Cost Tracking

```
Supabase Free Tier:
- 500 MB database
- 1 GB storage
- 2 GB bandwidth/month

Vercel Free Tier:
- 100 GB bandwidth/month
- Unlimited deployments
- Edge network included

GitHub Actions:
- 2,000 minutes/month free
- Sufficient for 6-hour cron
```

---

## ✅ CHECKLIST SUMMARY

```
Pre-Deployment:
[x] Code compiles
[x] Build succeeds
[x] Environment documented

Database Setup:
[ ] Supabase project created
[ ] Extensions enabled
[ ] Migrations executed
[ ] Credentials copied

Vercel Setup:
[ ] Project created
[ ] Repo connected
[ ] Env vars added
[ ] Deployed

Verification:
[ ] Homepage works
[ ] APIs functional
[ ] Features tested
[ ] Performance validated
[ ] Monitoring active

Post-Launch:
[ ] Errors monitored
[ ] Feedback collected
[ ] Content seeded
[ ] Marketing started
```

---

**Estimated Total Time: 30-60 minutes**

**Zero Monthly Cost (excluding domain ~$1/month)**

**Status: Ready to Deploy** 🚀

---

*Last Updated: 2025-01-10*  
*Quick Reference v1.0*
