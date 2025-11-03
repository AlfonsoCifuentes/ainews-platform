# GitHub Actions Setup - Automated News Curation

## 🎯 Overview

This project uses **GitHub Actions** to automatically curate AI news every 6 hours. The workflow runs without manual intervention and has built-in fallback mechanisms across multiple LLM providers.

## 📋 Prerequisites

You need to configure **at least ONE** of the following LLM API keys (preferably all three for maximum reliability):

- **GEMINI_API_KEY** (Recommended - best JSON support, 60 RPM)
- **OPENROUTER_API_KEY** (Good fallback - multiple models)
- **GROQ_API_KEY** (Last resort - 30 RPM but free)

Plus these required keys:
- **NEXT_PUBLIC_SUPABASE_URL**
- **SUPABASE_SERVICE_ROLE_KEY**

## 🔧 Setup Instructions

### Step 1: Navigate to Repository Settings

1. Go to your GitHub repository: `https://github.com/AlfonsoCifuentes/ainews-platform`
2. Click **Settings** tab
3. Click **Secrets and variables** → **Actions** in the left sidebar

### Step 2: Add Repository Secrets

Click **New repository secret** and add each of the following:

#### Required Secrets

| Secret Name | Value | Where to Get It |
|-------------|-------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://[project-ref].supabase.co` | Supabase Dashboard → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbG...` (long token) | Supabase Dashboard → Project Settings → API → service_role key |

#### LLM Provider Secrets (Add at least ONE)

| Secret Name | Value | Where to Get It | Rate Limits |
|-------------|-------|-----------------|-------------|
| `GEMINI_API_KEY` | `AIzaSy...` | [Google AI Studio](https://makersuite.google.com/app/apikey) | 60 RPM |
| `OPENROUTER_API_KEY` | `sk-or-v1-...` | [OpenRouter](https://openrouter.ai/keys) | Varies by model |
| `GROQ_API_KEY` | `gsk_...` | [Groq Console](https://console.groq.com/keys) | 30 RPM |

### Step 3: Verify Secrets Configuration

After adding secrets, you should see them listed (values will be hidden):

```
✓ NEXT_PUBLIC_SUPABASE_URL
✓ SUPABASE_SERVICE_ROLE_KEY
✓ GEMINI_API_KEY (or at least one LLM key)
```

### Step 4: Enable GitHub Actions (if disabled)

1. Go to **Settings** → **Actions** → **General**
2. Under **Actions permissions**, select:
   - ✅ **Allow all actions and reusable workflows**
3. Click **Save**

### Step 5: Verify Workflow is Enabled

1. Go to **Actions** tab in your repository
2. Click **AI News Curation** in the left sidebar
3. If you see a banner saying "This workflow is disabled", click **Enable workflow**

## 🚀 Manual Trigger (Testing)

To test the curation immediately without waiting for the schedule:

1. Go to **Actions** tab
2. Click **AI News Curation** workflow
3. Click **Run workflow** button (top right)
4. Select branch: `master`
5. Click green **Run workflow** button

## 📊 Monitoring Workflow Runs

### View Run History

1. Go to **Actions** tab
2. Click **AI News Curation**
3. You'll see a list of all runs with:
   - ✅ Success (green check)
   - ❌ Failure (red X)
   - ⏳ In progress (yellow dot)

### Check Logs

Click any run to see detailed logs:
- Expand each step to see console output
- Look for `[LLM:Gemini]`, `[LLM:OpenRouter]`, `[LLM:Groq]` to see which providers were used
- Check `[News Curator]` logs for overall status

### Download Artifacts (on failure)

If a run fails, logs are automatically uploaded:
1. Click the failed run
2. Scroll to **Artifacts** section at bottom
3. Download `curation-logs` to see detailed error messages

## 🔄 How Multi-Provider Fallback Works

The curation script automatically tries providers in order:

```
1. Try Gemini (best JSON support, 60 RPM)
   ↓ (if rate limited or fails)
2. Try OpenRouter (fallback, good limits)
   ↓ (if rate limited or fails)
3. Try Groq (last resort, 30 RPM)
   ↓ (if all fail)
4. Skip article and continue
```

**Example log output:**
```
[LLM] Available providers: Gemini, OpenRouter, Groq
[LLM:Gemini] ✓ Classified "New GPT-4 Features..." (score: 0.9, category: nlp)
[LLM:Gemini] ⚠ Rate limited, trying next provider...
[LLM:OpenRouter] ✓ Classified "AI Safety Report..." (score: 0.85, category: ethics)
```

## ⏰ Schedule

The workflow runs automatically:
- **Every 6 hours** (00:00, 06:00, 12:00, 18:00 UTC)
- Cron expression: `0 */6 * * *`

To change the schedule, edit `.github/workflows/ai-curation.yml`:
```yaml
schedule:
  - cron: '0 */4 * * *'  # Every 4 hours instead
```

## 🐛 Troubleshooting

### Workflow Not Running

**Problem**: No runs appearing in Actions tab

**Solutions**:
1. Check if workflow is enabled (see Step 5 above)
2. Verify Actions are enabled in repository settings
3. Make sure workflow file is in `master` branch (not a draft PR)
4. Trigger manually to test

### All Providers Failing

**Problem**: Logs show "All providers failed"

**Solutions**:
1. Verify at least one API key is correctly set in secrets
2. Check API key hasn't expired or hit quota limits
3. For Gemini: Visit [Google AI Studio](https://makersuite.google.com/) to check quota
4. For Groq: Visit [Groq Console](https://console.groq.com/) to check usage
5. For OpenRouter: Visit [OpenRouter](https://openrouter.ai/) to check credits

### Rate Limiting Errors

**Problem**: Seeing "429 Too Many Requests"

**Expected behavior**: Script automatically switches to next provider

**If all providers rate limited**:
- This is normal when processing many articles
- Script will continue with available providers
- Some articles may be skipped (not a critical failure)
- Next run (in 6 hours) will process new articles

### Supabase Connection Errors

**Problem**: "Supabase client initialization failed"

**Solutions**:
1. Verify `NEXT_PUBLIC_SUPABASE_URL` is correct (ends with `.supabase.co`)
2. Verify `SUPABASE_SERVICE_ROLE_KEY` is the **service_role** key (not anon key)
3. Check Supabase project is not paused (free tier pauses after inactivity)
4. Verify database tables exist (run migrations if needed)

## 📈 Expected Results

After successful run, you should see:

**In Database (Supabase)**:
- New articles in `news_articles` table
- Articles have real images from source websites
- Dual language content (English + Spanish)
- Embeddings generated for RAG

**In Logs**:
```
[News Curator] Starting curation workflow...
[News Curator] ✓ Gemini client initialized
[News Curator] ✓ OpenRouter client initialized
[News Curator] ✓ Groq client initialized
[News Curator] Initialized 3 LLM provider(s) with automatic fallback
[RSS] Fetching from 44 sources...
[RSS] ✓ OpenAI Blog: 712 articles
[LLM] Filtering articles with multi-provider fallback...
[LLM] ✓ 45/2500 articles passed filter
[Translation:Gemini] ✓ Translated to es
[DB] Storing articles...
[News Curator] Workflow completed successfully
[News Curator] Execution time: 245.32s
```

## 🎯 Success Metrics

- **Articles processed**: 30-50 new articles per run
- **Success rate**: >80% classification success
- **Provider distribution**: Primarily Gemini, fallback to others as needed
- **Execution time**: 4-10 minutes per run (depends on provider availability)

## 🔐 Security Notes

- Never commit API keys to the repository
- All secrets are encrypted by GitHub
- Secrets are only accessible to workflow runs
- Logs never show secret values (they're masked)

## 📞 Need Help?

If you're still having issues:

1. Check the **Actions** tab logs for specific errors
2. Download artifacts from failed runs
3. Review `SESSION_AUTOMATED_CURATION_DEBUG.md` for detailed troubleshooting
4. Verify all secrets are correctly configured
5. Try manual trigger to test immediately

---

**Last Updated**: November 3, 2025  
**Workflow File**: `.github/workflows/ai-curation.yml`  
**Script**: `scripts/curate-news.ts`
