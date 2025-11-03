# 🔐 GitHub Secrets Configuration - Step by Step

## ❌ Current Error

```
Annotations
1 error and 1 warning
curate-news
Process completed with exit code 1.
```

**Root Cause**: GitHub Actions no tiene las API keys configuradas como **secrets**.

## ✅ Solution: Configure GitHub Secrets

### Step 1: Navigate to Secrets Page

Click this link (or follow manual steps below):

**👉 [Configure Secrets Now](https://github.com/AlfonsoCifuentes/ainews-platform/settings/secrets/actions)**

Manual steps:
1. Go to: https://github.com/AlfonsoCifuentes/ainews-platform
2. Click **Settings** tab (top right)
3. In left sidebar, click **Secrets and variables** → **Actions**

### Step 2: Add Each Secret

Click **"New repository secret"** button and add these **one by one**:

---

#### Secret 1: NEXT_PUBLIC_SUPABASE_URL

```
Name:  NEXT_PUBLIC_SUPABASE_URL
Value: [Copy from your .env file - your Supabase project URL]
```

**How to get the value**:
1. Open your `.env` file in VSCode
2. Copy the value after `NEXT_PUBLIC_SUPABASE_URL=`
3. Paste in GitHub Secrets

Click **"Add secret"**

---

#### Secret 2: SUPABASE_SERVICE_ROLE_KEY

```
Name:  SUPABASE_SERVICE_ROLE_KEY
Value: [Copy from your .env file - starts with sb_secret_...]
```

**How to get the value**:
1. Open your `.env` file in VSCode
2. Copy the value after `SUPABASE_SERVICE_ROLE_KEY=`
3. Paste in GitHub Secrets

**⚠️ IMPORTANT**: Use the `service_role` key (starts with `sb_secret_`), NOT the `anon` key!

Click **"Add secret"**

---

#### Secret 3: GEMINI_API_KEY (CRITICAL - NEWLY ADDED)

```
Name:  GEMINI_API_KEY
Value: [Copy from your .env file - starts with AIzaSy...]
```

**How to get the value**:
1. Open your `.env` file in VSCode
2. Copy the value after `GEMINI_API_KEY=`
3. Paste in GitHub Secrets

Click **"Add secret"**

---

#### Secret 4: OPENROUTER_API_KEY

```
Name:  OPENROUTER_API_KEY
Value: [Copy from your .env file - starts with sk-or-v1-...]
```

**How to get the value**:
1. Open your `.env` file in VSCode
2. Copy the value after `OPENROUTER_API_KEY=`
3. Paste in GitHub Secrets

Click **"Add secret"**

---

#### Secret 5: GROQ_API_KEY

```
Name:  GROQ_API_KEY
Value: [Copy from your .env file - starts with gsk_...]
```

**How to get the value**:
1. Open your `.env` file in VSCode
2. Copy the value after `GROQ_API_KEY=`
3. Paste in GitHub Secrets

Click **"Add secret"**

---

### Step 3: Verify All Secrets Are Added

After adding all secrets, you should see this list in the Secrets page:

```
✓ GEMINI_API_KEY           Updated X seconds ago
✓ GROQ_API_KEY             Updated X seconds ago
✓ NEXT_PUBLIC_SUPABASE_URL Updated X seconds ago
✓ OPENROUTER_API_KEY       Updated X seconds ago
✓ SUPABASE_SERVICE_ROLE_KEY Updated X seconds ago
```

**Important**: Values will be hidden (GitHub encrypts them). You'll only see the names.

---

## 🧪 Test the Workflow Again

### Step 1: Trigger Manually

1. Go to: https://github.com/AlfonsoCifuentes/ainews-platform/actions
2. Click **"AI News Curation"** (left sidebar)
3. Click **"Run workflow"** button (top right)
4. Select branch: **master**
5. Click green **"Run workflow"** button

### Step 2: Monitor Logs

1. Wait 5-10 seconds, refresh page
2. Click on the new run that appears
3. Click **"curate-news"** to expand logs
4. Look for these lines:

**✅ SUCCESS - You should see:**
```
[News Curator] Environment check:
  - GEMINI_API_KEY: ✓ Set
  - OPENROUTER_API_KEY: ✓ Set
  - GROQ_API_KEY: ✓ Set
  - SUPABASE_SERVICE_ROLE_KEY: ✓ Set
  - NEXT_PUBLIC_SUPABASE_URL: ✓ Set
[News Curator] ✓ Gemini client initialized
[News Curator] ✓ OpenRouter client initialized
[News Curator] ✓ Groq client initialized
[News Curator] Initialized 3 LLM provider(s) with automatic fallback
```

**❌ FAILURE - If you still see:**
```
[News Curator] Environment check:
  - GEMINI_API_KEY: ✗ Missing
  - OPENROUTER_API_KEY: ✗ Missing
  ...
```

Then secrets are NOT configured correctly. Double-check:
- Secret names match EXACTLY (case-sensitive)
- No extra spaces in secret names
- Values were pasted correctly (no line breaks)

---

## 📋 Quick Reference

**To configure GitHub Secrets, you need to copy values from your `.env` file.**

### Where to Find Your Values

1. Open your `.env` file in VSCode (in the root of your project)
2. Find each variable and copy its value
3. Paste into GitHub Secrets (one by one)

### Required Secrets (Copy from .env)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[your-project].supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_[your-key]

# LLM APIs (at least ONE required)
GEMINI_API_KEY=AIzaSy[your-key]
OPENROUTER_API_KEY=sk-or-v1-[your-key]
GROQ_API_KEY=gsk_[your-key]
```

**Important**: Copy the EXACT values from your `.env` file, including all characters.

---

## 🔍 Common Issues

### Issue 1: "Secret names must be unique"

**Cause**: Secret already exists with that name

**Solution**: Click the secret name → Update value instead of adding new

---

### Issue 2: Secrets show as "Updated" but workflow still fails

**Cause**: Secrets are cached for running workflows

**Solution**: 
1. Cancel any running workflows
2. Wait 30 seconds
3. Trigger a NEW workflow run

---

### Issue 3: Only some secrets showing as "✓ Set" in logs

**Cause**: Typo in secret name or value has line breaks

**Solution**:
1. Click the secret name in GitHub Secrets page
2. Update the value
3. Make sure to paste the ENTIRE value with no line breaks

---

## 🎯 Expected Workflow Output

After configuring secrets correctly, the workflow should:

1. **Initialize providers** (2-3 seconds)
   ```
   [News Curator] ✓ Gemini client initialized
   [News Curator] Initialized 3 LLM provider(s)
   ```

2. **Fetch RSS feeds** (30-60 seconds)
   ```
   [RSS] Fetching from 44 sources...
   [RSS] ✓ Fetched 2,453 articles from all sources
   ```

3. **Classify articles** (3-5 minutes)
   ```
   [LLM:Gemini] ✓ Classified "New GPT-4 Features..." (score: 0.9)
   [LLM] ✓ 45/2453 articles passed filter
   ```

4. **Translate content** (2-4 minutes)
   ```
   [Translation:Gemini] ✓ Translated to es
   ```

5. **Store in database** (1-2 minutes)
   ```
   [DB] Storing articles...
   [DB] ✓ Successfully stored 45 new articles
   ```

**Total time**: 6-12 minutes

---

## 🚀 After Success

Once the workflow completes successfully:

1. ✅ Check Supabase for new articles
2. ✅ Verify images are from real sources (not Unsplash)
3. ✅ Check dual-language content (EN/ES)
4. ✅ Visit production site to see new articles

The workflow will then run automatically **every 6 hours** without manual intervention.

---

## 📞 Still Having Issues?

If secrets are configured but workflow still fails:

1. **Check the error message** in workflow logs
2. **Verify API keys are valid**:
   - Gemini: https://makersuite.google.com/app/apikey
   - OpenRouter: https://openrouter.ai/keys
   - Groq: https://console.groq.com/keys
3. **Check Supabase project** isn't paused (free tier)
4. **Try with just ONE provider** (Gemini recommended)

---

**Created**: November 3, 2025  
**Issue**: GitHub Actions failing with "No LLM providers available"  
**Solution**: Configure GitHub Secrets for all API keys
