# Deployment Instructions

## Pre-Deployment Checklist

- [ ] All tests passing: `npm run ai:test-courses`
- [ ] Build successful: `npm run build`
- [ ] No TypeScript errors: `npm run type-check`
- [ ] Linting passes: `npm run lint`
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Playwright installed: `npx playwright install`

## Local Testing

### 1. Test Course System

```bash
npm run ai:test-courses
```

Expected output:
```
✅ PASS - Database Connection
✅ PASS - Courses Schema
✅ PASS - Course Modules Schema
✅ PASS - Course API
✅ PASS - Course Generation
✅ PASS - Course Access

Total: 6 passed, 0 failed
🎉 ALL TESTS PASSED!
```

### 2. Test News Curation

```bash
npm run ai:curate
```

Expected output:
```
[News Curator] Starting curation workflow...
[RSS] Fetching from X sources...
[LLM] Filtering articles...
[ImageValidator] Finding best image...
[Translation] Generating bilingual content...
[DB] Storing articles...
[News Curator] Workflow completed successfully
```

### 3. Build Application

```bash
npm run build
```

Expected output:
```
✓ Compiled successfully
✓ Linting and type checking
✓ Build complete
```

## Environment Setup

### Required Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# LLM APIs (at least one required)
GEMINI_API_KEY=your-gemini-key
OPENROUTER_API_KEY=your-openrouter-key
GROQ_API_KEY=your-groq-key

# Analytics (optional)
NEXT_PUBLIC_UMAMI_SITE_ID=your-site-id
NEXT_PUBLIC_UMAMI_URL=https://your-umami-instance.com

# Email (optional)
RESEND_API_KEY=your-resend-key
```

### Optional Variables

```bash
# Image APIs (for stock photo fallback - optional)
PEXELS_API_KEY=your-pexels-key
PIXABAY_API_KEY=your-pixabay-key
```

## Vercel Deployment

### 1. Connect Repository

```bash
vercel link
```

### 2. Set Environment Variables

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add GEMINI_API_KEY
vercel env add OPENROUTER_API_KEY
vercel env add GROQ_API_KEY
```

### 3. Deploy

```bash
vercel deploy --prod
```

### 4. Verify Deployment

```bash
# Check course API
curl https://your-domain.vercel.app/api/courses

# Check course generation
curl -X POST https://your-domain.vercel.app/api/courses/generate \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "Machine Learning",
    "difficulty": "beginner",
    "duration": "short",
    "locale": "en"
  }'
```

## GitHub Actions Setup

### 1. Add Secrets

Go to: Settings → Secrets and variables → Actions

Add:
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`
- `OPENROUTER_API_KEY`
- `GROQ_API_KEY`
- `PEXELS_API_KEY` (optional)
- `PIXABAY_API_KEY` (optional)

### 2. Create Workflow

Create `.github/workflows/curate-news.yml`:

```yaml
name: Curate News

on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
  workflow_dispatch:

jobs:
  curate:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright
        run: npx playwright install --with-deps
      
      - name: Curate news
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
          OPENROUTER_API_KEY: ${{ secrets.OPENROUTER_API_KEY }}
          GROQ_API_KEY: ${{ secrets.GROQ_API_KEY }}
          PEXELS_API_KEY: ${{ secrets.PEXELS_API_KEY }}
          PIXABAY_API_KEY: ${{ secrets.PIXABAY_API_KEY }}
        run: npm run ai:curate
```

### 3. Create Course Generation Workflow

Create `.github/workflows/generate-courses.yml`:

```yaml
name: Generate Courses

on:
  schedule:
    - cron: '0 0 * * 0'  # Weekly on Sunday
  workflow_dispatch:

jobs:
  generate:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Generate courses
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
          OPENROUTER_API_KEY: ${{ secrets.OPENROUTER_API_KEY }}
          GROQ_API_KEY: ${{ secrets.GROQ_API_KEY }}
        run: |
          # Generate a few courses
          curl -X POST http://localhost:3000/api/courses/generate \
            -H "Content-Type: application/json" \
            -d '{
              "topic": "Advanced Machine Learning",
              "difficulty": "advanced",
              "duration": "long",
              "locale": "en"
            }'
```

## Post-Deployment Verification

### 1. Check Application Health

```bash
# Check homepage
curl https://your-domain.vercel.app/

# Check API
curl https://your-domain.vercel.app/api/courses

# Check course page
curl https://your-domain.vercel.app/en/courses/[course-id]
```

### 2. Test Course Generation

```bash
curl -X POST https://your-domain.vercel.app/api/courses/generate \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "AI Ethics",
    "difficulty": "intermediate",
    "duration": "medium",
    "locale": "en"
  }'
```

### 3. Test News Curation

Manually trigger GitHub Actions workflow or wait for scheduled run.

### 4. Monitor Logs

```bash
# Vercel logs
vercel logs

# GitHub Actions logs
# Go to: Actions → Curate News → Latest run
```

## Troubleshooting

### Course Generation Fails

**Error:** `Failed to generate course`

**Solutions:**
1. Check LLM API keys are set
2. Check rate limits not exceeded
3. Check database connection
4. Review logs for specific error

### Images Not Scraping

**Error:** `No image found across all layers`

**Solutions:**
1. Check article URL is valid
2. Verify article has images
3. Check network connectivity
4. Try with different article

### Playwright Errors

**Error:** `Failed to launch browser`

**Solutions:**
1. Install Chromium: `npx playwright install`
2. Check system has enough memory
3. Check no port conflicts
4. Try with `--no-sandbox` flag

### Database Errors

**Error:** `Failed to connect to database`

**Solutions:**
1. Check SUPABASE_SERVICE_ROLE_KEY is correct
2. Check NEXT_PUBLIC_SUPABASE_URL is correct
3. Check database is accessible
4. Check RLS policies allow access

## Rollback Procedure

If deployment fails:

### 1. Revert to Previous Version

```bash
vercel rollback
```

### 2. Check Previous Deployment

```bash
vercel deployments
```

### 3. Redeploy Previous Version

```bash
vercel deploy --prod --target [deployment-id]
```

## Monitoring

### Key Metrics to Monitor

1. **Course Generation**
   - Success rate
   - Average generation time
   - Error rate

2. **News Curation**
   - Articles processed
   - Images scraped
   - Translation success rate

3. **API Performance**
   - Response time
   - Error rate
   - Uptime

### Set Up Alerts

1. **Vercel Alerts**
   - Go to: Settings → Alerts
   - Set up email notifications

2. **GitHub Actions Alerts**
   - Go to: Settings → Notifications
   - Enable workflow failure notifications

3. **Custom Monitoring**
   - Use Sentry for error tracking
   - Use DataDog for performance monitoring
   - Use LogRocket for user session replay

## Maintenance

### Regular Tasks

- [ ] Weekly: Check logs for errors
- [ ] Weekly: Verify course generation working
- [ ] Weekly: Verify news curation working
- [ ] Monthly: Review performance metrics
- [ ] Monthly: Update dependencies
- [ ] Quarterly: Review and optimize code

### Backup Procedures

```bash
# Backup database
supabase db dump --db-url $DATABASE_URL > backup.sql

# Backup to S3
aws s3 cp backup.sql s3://your-bucket/backups/
```

## Support

For deployment issues:

1. Check logs: `vercel logs`
2. Check GitHub Actions: Actions tab
3. Check Supabase: Dashboard
4. Review documentation: This file
5. Check error messages carefully

---

**Last Updated:** 2024
**Status:** Ready for Production
