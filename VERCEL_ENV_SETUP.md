# 🔑 Vercel Environment Variables Setup

## Problem Detected
The course generation is failing because **LLM API keys are not configured in Vercel**.

Local `.env.local` has the keys, but Vercel production environment needs them separately.

## ✅ Solution: Add Environment Variables to Vercel

### 1. Go to Vercel Dashboard
https://vercel.com/dashboard → Select `ainews-platform` project

### 2. Navigate to Settings → Environment Variables
https://vercel.com/YOUR_USERNAME/ainews-platform/settings/environment-variables

### 3. Add These Required Variables

#### LLM API Keys (at least ONE is required)

```bash
# Option 1: Groq (Recommended - Free + Fast)
GROQ_API_KEY=your-groq-api-key-here

# Option 2: OpenRouter (Fallback)
OPENROUTER_API_KEY=your-openrouter-api-key-here

# Option 3: Gemini (Translation)
GEMINI_API_KEY=your-gemini-api-key-here
```

#### Image Validation (Optional but Recommended)
```bash
# Hugging Face for Computer Vision validation
HUGGINGFACE_API_KEY=your_hf_key_here
```

### 4. Set Environment Scope
For each variable:
- ✅ **Production** (required for live site)
- ✅ **Preview** (recommended for testing)
- ⬜ **Development** (optional, uses `.env.local`)

### 5. Redeploy
After adding variables:
```bash
# Option A: Trigger redeploy from Vercel Dashboard
# Go to Deployments → Click ⋯ on latest → Redeploy

# Option B: Push a new commit
git commit --allow-empty -m "trigger redeploy with env vars"
git push origin master
```

---

## ⚠️ Security Alert: Exposed API Keys

These API keys were **publicly exposed** in commit history:
- `GROQ_API_KEY` - starts with `gsk_O3E1WU...`
- `OPENROUTER_API_KEY` - starts with `sk-or-v1-1361...`
- `GEMINI_API_KEY` - starts with `AIzaSyBGHWXD...`

### Recommended Actions (After Vercel Setup):

1. **Regenerate Groq Key**
   - Go to: https://console.groq.com/keys
   - Delete exposed key
   - Generate new key
   - Update in Vercel + `.env.local`

2. **Regenerate OpenRouter Key**
   - Go to: https://openrouter.ai/keys
   - Delete exposed key
   - Generate new key
   - Update in Vercel + `.env.local`

3. **Regenerate Gemini Key**
   - Go to: https://aistudio.google.com/app/apikey
   - Delete exposed key
   - Generate new key
   - Update in Vercel + `.env.local`

---

## ✅ Testing After Setup

### 1. Test Course Generation in Production
```bash
# Visit your production site
https://ainews-platform.vercel.app/en/courses

# Click "Generate New Course"
# Topic: "Introduction to Large Language Models"
# Difficulty: Beginner
# Duration: Short (1-2 hours)
```

### 2. Check Vercel Logs
```bash
# In Vercel Dashboard
https://vercel.com/YOUR_USERNAME/ainews-platform/logs

# Filter by: "course generation"
# Should see: "LLM provider check: Gemini ✅" or similar
```

### 3. Verify in Database
```bash
# Run diagnostics locally
$env:NEXT_PUBLIC_SUPABASE_URL="..."; $env:SUPABASE_SERVICE_ROLE_KEY="..."; npx tsx scripts/diagnose-courses.ts

# Should show new courses created
```

---

## 📊 Current Status

**Database**: ✅ Working (3 courses exist)
**Frontend**: ✅ Working (routing correct)
**API Logic**: ✅ Working (code looks good)
**LLM Keys**: ❌ **MISSING IN VERCEL** ← This is the blocker

---

## Next Steps

1. ⚠️ **URGENT**: Add LLM API keys to Vercel (at least GROQ_API_KEY)
2. 🔄 Redeploy the application
3. ✅ Test course generation in production
4. 🔑 Regenerate exposed API keys (security)
5. 🧪 Test 404 issue (likely fixed after #1)
