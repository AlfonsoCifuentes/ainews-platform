# ✅ Deployment Checklist - GitHub Actions Automation

## 🎯 Current Status

**✅ COMPLETED**:
- Multi-provider LLM fallback system implemented (Gemini → OpenRouter → Groq)
- GitHub Actions workflow enhanced with all API keys
- Robust JSON parsing and error handling
- 60-minute timeout and artifact upload on failure
- Code committed and pushed to master

**⏳ PENDING** (do this NOW):
1. Configure GitHub Secrets
2. Manually trigger workflow to test
3. Verify articles are updating

---

## 📋 STEP 1: Configure GitHub Secrets (CRITICAL)

### Where to Go:
1. Open: https://github.com/AlfonsoCifuentes/ainews-platform/settings/secrets/actions
2. Click **"New repository secret"** for each secret below

### Secrets to Add:

#### ✅ Check if Already Configured:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENROUTER_API_KEY`
- `GROQ_API_KEY`

#### ⚠️ **CRITICAL - Add This NOW**:
```
Name:  GEMINI_API_KEY
Value: [Get from .env.local file]
```

**How to get GEMINI_API_KEY**:
1. Open your `.env.local` file in VSCode
2. Copy the value of `GEMINI_API_KEY=...`
3. Paste it in GitHub Secrets (without the `GEMINI_API_KEY=` part)

**Alternative - Generate new key**:
1. Go to: https://makersuite.google.com/app/apikey
2. Click "Create API Key"
3. Copy the key (starts with `AIzaSy...`)
4. Add it to GitHub Secrets

---

## 🚀 STEP 2: Manually Trigger Workflow (TEST)

### How to Trigger:
1. Go to: https://github.com/AlfonsoCifuentes/ainews-platform/actions
2. Click **"AI News Curation"** in the left sidebar
3. Click **"Run workflow"** button (top right, next to branch selector)
4. Select branch: **master**
5. Click green **"Run workflow"** button

### Monitor Execution:
- Refresh page to see new run appear
- Click on the run to see live logs
- Watch for status:
  - ⏳ Yellow = In progress
  - ✅ Green = Success
  - ❌ Red = Failed

### Expected Duration:
- **4-10 minutes** (depends on how many articles need processing)

---

## 📊 STEP 3: Verify Results

### Check Logs (during run):
Look for these indicators in the workflow logs:

```
✅ GOOD SIGNS:
[News Curator] Initialized 3 LLM provider(s) with automatic fallback
[LLM:Gemini] ✓ Classified (score: 0.9)
[Translation:Gemini] ✓ Translated to es
[DB] Storing articles...
[News Curator] ✓ Successfully stored 45 new articles

⚠️ WARNING SIGNS (acceptable):
[LLM:Gemini] ⚠ Rate limited, trying next provider...
[LLM:OpenRouter] ✓ Classified (score: 0.85)
(This means fallback is working - EXPECTED behavior)

❌ BAD SIGNS:
Error: No LLM providers available
Supabase client initialization failed
Error: All providers failed
```

### Check Database (after run):
1. Go to: https://supabase.com/dashboard/project/[your-project-id]/editor
2. Open table: `news_articles`
3. Order by: `created_at DESC`
4. Verify:
   - ✅ New articles added today
   - ✅ `image_url` contains real URLs (not Unsplash placeholders)
   - ✅ `title_en` and `title_es` both filled
   - ✅ `content_en` and `content_es` both filled
   - ✅ `category` is one of: machinelearning, nlp, computervision, robotics, ethics, business, research, tools, news, other

### Check Website (production):
1. Go to: https://ainews-platform.vercel.app/en/news
2. Verify new articles appear
3. Check images load correctly (not broken)
4. Switch to Spanish: https://ainews-platform.vercel.app/es/news
5. Verify translations work

---

## 🐛 Troubleshooting

### Problem: "No LLM providers available"
**Solution**: You forgot to add `GEMINI_API_KEY` to GitHub Secrets
- Go back to Step 1 and add it

### Problem: "Supabase client initialization failed"
**Solutions**:
1. Check `NEXT_PUBLIC_SUPABASE_URL` secret is correct
2. Check `SUPABASE_SERVICE_ROLE_KEY` secret is correct (use service_role, not anon)
3. Verify Supabase project isn't paused (free tier pauses after inactivity)

### Problem: All runs showing "Rate limited"
**Expected**: This is NORMAL - the fallback system should kick in
- Check logs for: `[LLM:OpenRouter] ✓ Classified` (means fallback worked)
- If ALL providers rate limited:
  - Wait 6 hours for next scheduled run
  - Providers reset their limits hourly/daily
  - Script will continue processing with available providers

### Problem: Workflow not appearing in Actions tab
**Solutions**:
1. Check workflow is enabled: Actions → AI News Curation → Enable workflow
2. Verify Actions are enabled: Settings → Actions → General → Allow all actions
3. Make sure you pushed to `master` branch (not a draft)

---

## ⏰ Automatic Schedule

After successful manual test, the workflow will run automatically:

- **Every 6 hours**: 00:00, 06:00, 12:00, 18:00 UTC
- **No manual intervention needed**
- **Auto-fallback if rate limits hit**

---

## 📈 Success Criteria

After 24 hours, you should see:

- ✅ 4 successful workflow runs (every 6 hours)
- ✅ 30-50 new articles per run (120-200 total)
- ✅ All articles have real source images
- ✅ Dual language content working
- ✅ Mix of provider usage (Gemini primary, fallbacks as needed)
- ✅ Website showing fresh content

---

## 🔄 Next Steps (After Verification)

### If Everything Works:
1. ✅ Monitor for 1 week to ensure stability
2. ✅ Check GitHub Actions tab daily for run status
3. ✅ Review article quality and categories
4. ✅ Consider adding more RSS sources (if needed)

### Optional Improvements:
- Add Slack notifications on failure
- Create admin dashboard for curation metrics
- Implement article deduplication
- Add quality scoring visualization

---

## 📞 Quick Commands

### Check Latest Articles (Supabase):
```sql
SELECT title_en, image_url, category, created_at 
FROM news_articles 
ORDER BY created_at DESC 
LIMIT 20;
```

### Check Provider Success Rate (after a few runs):
Look in workflow logs for:
```
grep -o "LLM:[^]]*" | sort | uniq -c
```

### Fix Old Article Images (manual cleanup):
```bash
npm run ai:fix-images
```

---

## 🎯 What You Just Deployed

**Multi-Provider Fallback Architecture**:
```
User Request → GitHub Actions Cron (every 6h)
  ↓
RSS Feeds (44 sources) → Fetch All Articles
  ↓
LLM Classification with Fallback:
  1. Try Gemini (60 RPM, JSON mode) ✅
     ↓ (if rate limited)
  2. Try OpenRouter (higher limits) ✅
     ↓ (if rate limited)
  3. Try Groq (30 RPM fallback) ✅
     ↓ (if all fail)
  4. Skip article, continue
  ↓
Translation with Fallback (same order)
  ↓
Store in Supabase (PostgreSQL)
  ↓
Generate Embeddings (pgvector)
  ↓
Success! New articles on website
```

**Key Benefits**:
- ✅ **Zero manual intervention** - runs automatically
- ✅ **Resilient to rate limits** - automatic provider switching
- ✅ **No single point of failure** - works if ANY provider available
- ✅ **Production-grade logging** - artifacts on failure
- ✅ **Cost: $0** - all free tiers

---

**Created**: {{ current_date }}  
**Commit**: `250afcf` - "feat: GitHub Actions automation with multi-LLM fallback system"  
**Documentation**: See `GITHUB_ACTIONS_SETUP.md` for detailed configuration
