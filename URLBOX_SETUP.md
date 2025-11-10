# urlbox.io Setup Guide

## ✨ What is urlbox.io?

urlbox.io is a screenshot and rendering API that captures website screenshots. We use it as a **fallback** when direct web scraping fails (HTTP 403, 429, etc).

**Use case**: OpenAI blog blocks web scraping → urlbox.io captures a screenshot → we use that as the article image.

## 🆓 Free Tier

- **1,000 screenshots/month** (free)
- No credit card required for trial
- Perfect for our needs (~30-40 blocked articles per curation run)

## 📝 Setup Instructions

### 1. Create Account

1. Go to: https://www.urlbox.io/
2. Click **"Start Free Trial"**
3. Sign up with email (no credit card needed)
4. Verify your email

### 2. Get API Credentials

1. Log in to urlbox.io dashboard
2. Go to **"API Keys"** section
3. Copy your:
   - **Publishable Key** (this is your `URLBOX_API_KEY`)
   - **Secret Key** (this is your `URLBOX_API_SECRET`)

### 3. Add to Environment Variables

Add to your `.env.local` file:

```bash
# urlbox.io - Screenshot API for blocked sites
URLBOX_API_KEY=pub_xxxxxxxxxxxxxxxx
URLBOX_API_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 4. Test Configuration

Run the image fixing script:

```bash
npm run ai:fix-images
```

You should see output like:
```
[61/184] What could possibly go wrong if an enterprise repl...
  Scraping: https://venturebeat.com/ai/what-could-possibly-go-wrong-if-a...
  ⚠️  HTTP 403
  📸 Capturing screenshot with urlbox.io...
  ✓ Screenshot captured: https://api.urlbox.io/v1/pub_xxx/...
  ✓ Updated!
```

## 🔧 How It Works

### Fallback Chain

1. **Try direct scraping** (free, fast)
2. **If HTTP 403 or 429** → Use urlbox.io screenshot
3. **If urlbox.io fails** → Keep existing image

### Screenshot Parameters

The script uses these optimized settings:

- **Width**: 1200px (responsive)
- **Height**: 630px (social media optimal)
- **Format**: PNG (best quality)
- **Quality**: 80% (good balance)
- **Wait until**: `requestsfinished` (fully loaded page)
- **Block ads**: Yes (cleaner screenshots)
- **Hide cookie banners**: Yes (no popups)

## 📊 Usage Monitoring

### Check Monthly Usage

1. Log in to urlbox.io dashboard
2. Go to **"Usage"** section
3. View screenshot count

### Expected Usage

- **Per curation run**: ~30-40 screenshots (blocked sites)
- **Per month** (1 curation/day): ~900-1,200 screenshots
- **Free tier limit**: 1,000/month

**💡 Tip**: If you hit the limit, the script gracefully falls back to keeping existing images.

## 🚀 Advanced Configuration (Optional)

### Custom Screenshot Settings

Edit `scripts/fix-article-images.ts` line ~30:

```typescript
const queryString = `url=${encodeURIComponent(url)}&width=1200&height=630&format=png&quality=80&retina=false&thumb_width=800&wait_until=requestsfinished&block_ads=true&hide_cookie_banners=true`;
```

Available options:
- `width`, `height` - Screenshot dimensions
- `quality` - 1-100 (higher = better quality, larger file)
- `retina` - `true` for 2x resolution (uses 2 credits)
- `block_ads` - Remove ads from screenshot
- `hide_cookie_banners` - Hide GDPR popups
- `wait_until` - `requestsfinished`, `networkidle`, `domcontentloaded`
- `delay` - Wait X milliseconds before capture

See full docs: https://urlbox.io/docs

## 🎯 Benefits

### Before urlbox.io
```
[61/184] OpenAI article...
  Scraping: https://openai.com/...
  ⚠️  HTTP 403
  ✗ Failed: 31 OpenAI articles
```

### After urlbox.io
```
[61/184] OpenAI article...
  Scraping: https://openai.com/...
  ⚠️  HTTP 403
  📸 Capturing screenshot with urlbox.io...
  ✓ Screenshot captured!
  ✓ Updated!
  ✓ Fixed: 31 OpenAI articles
```

## 🔒 Security Notes

- **Never commit** `.env.local` to git
- API keys are in `.gitignore` by default
- urlbox.io uses HMAC authentication (secure)
- Screenshots are cached by urlbox.io (CDN)

## 📱 Deployment (Vercel)

Add environment variables in Vercel dashboard:

1. Go to Vercel project settings
2. Navigate to **"Environment Variables"**
3. Add:
   - `URLBOX_API_KEY`
   - `URLBOX_API_SECRET`
4. Redeploy

The script will automatically use urlbox.io in production when direct scraping fails.

## ❓ Troubleshooting

### "urlbox.io not configured (skipping screenshot fallback)"

**Solution**: Add `URLBOX_API_KEY` and `URLBOX_API_SECRET` to `.env.local`

### "Screenshot failed: HTTP 401"

**Cause**: Invalid API key or secret

**Solution**: 
1. Verify keys in urlbox.io dashboard
2. Ensure no extra spaces in `.env.local`
3. Restart script to reload environment variables

### "Screenshot failed: HTTP 402"

**Cause**: Free tier limit reached (1,000/month)

**Solution**: 
- Wait until next month (resets automatically)
- Or upgrade to paid plan if needed
- Script will gracefully fallback to existing images

### "Screenshot timeout"

**Cause**: Target website is slow to load

**Solution**: Edit timeout in `captureScreenshot()`:
```typescript
signal: AbortSignal.timeout(10000) // Increase to 10s
```

## 🎉 Success Rate Improvement

### Before urlbox.io Implementation
- Direct scraping success: **67%** (123/184 articles)
- Failed: 61 articles (33%)

### After urlbox.io Implementation (Expected)
- Direct scraping: **67%** (123 articles)
- urlbox.io fallback: **~17%** (31 OpenAI articles)
- **Total success rate: ~84%** (154/184 articles)

### Remaining Failures (Expected)
- arXiv papers: 15 (no article images by design)
- AI-news.com: 8 (truly missing images)
- DeepMind 404s: 3 (deleted articles)
- Other: 4

**Final expected success rate: ~84%** 🎯

---

**Ready to use!** Just add the API keys to `.env.local` and run `npm run ai:fix-images` 🚀
