# Deployment Automation Scripts

This directory contains scripts to automate deployment tasks and production operations.

## 🔧 Available Scripts

### 1. Database Migration Runner

**File:** `deploy-migrations.js`

**Purpose:** Executes all pending database migrations on production Supabase instance

**Usage:**

```bash
node scripts/deploy-migrations.js
```

**Environment Variables Required:**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

**Features:**
- Sequential migration execution
- Rollback on failure
- Migration status tracking
- Detailed logging

---

### 2. Environment Validator

**File:** `validate-env.js`

**Purpose:** Validates all required environment variables are set before deployment

**Usage:**

```bash
node scripts/validate-env.js
```

**Checks:**
- All required variables present
- Correct format (URLs, keys)
- No placeholder values
- API keys valid (test request)

---

### 3. Health Check Script

**File:** `health-check.js`

**Purpose:** Verifies all services are operational after deployment

**Usage:**

```bash
node scripts/health-check.js https://your-app.vercel.app
```

**Tests:**
- Homepage responds (200 OK)
- API endpoints functional
- Database connectivity
- Auth flow working
- i18n routing correct

---

### 4. News Curator (Production)

**File:** `curate-news.ts` (existing)

**Purpose:** Automated news curation for production

**Usage:**

```bash
npm run curate-news
```

**Triggered by:**
- GitHub Actions (every 6 hours)
- Manual workflow dispatch
- Vercel cron job

---

### 5. Weekly Digest Generator

**File:** `weekly-digest-generator.ts` (existing)

**Purpose:** Sends weekly email digest to subscribers

**Usage:**

```bash
npm run weekly-digest
```

**Triggered by:**
- GitHub Actions (Sundays at 8 AM)
- Manual run for testing

---

### 6. Deployment Checklist Script

**File:** `deployment-checklist.js`

**Purpose:** Interactive checklist to guide deployment process

**Usage:**

```bash
node scripts/deployment-checklist.js
```

**Steps:**
1. Validate environment
2. Test database connection
3. Run migrations
4. Verify build
5. Deploy to Vercel
6. Run health checks
7. Verify features

---

## 🚀 DEPLOYMENT WORKFLOW

### Full Deployment (Fresh Start)

```bash
# 1. Validate environment
node scripts/validate-env.js

# 2. Run database migrations
node scripts/deploy-migrations.js

# 3. Run production build locally
npm run build

# 4. Deploy to Vercel
vercel --prod

# 5. Run health checks
node scripts/health-check.js https://your-app.vercel.app

# 6. Seed initial content
npm run curate-news
```

---

### Update Deployment (Code Changes Only)

```bash
# 1. Run build test
npm run build

# 2. Deploy to Vercel
git push origin main  # Auto-deploys

# 3. Health check
node scripts/health-check.js https://your-app.vercel.app
```

---

### Database-Only Update (Schema Changes)

```bash
# 1. Create new migration file
# supabase/migrations/NNNNNN_description.sql

# 2. Test locally (if Supabase CLI installed)
supabase db push

# 3. Deploy to production
node scripts/deploy-migrations.js

# 4. Verify schema
node scripts/health-check.js https://your-app.vercel.app
```

---

## 📋 SCRIPT IMPLEMENTATION

### deploy-migrations.js

```javascript
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runMigrations() {
  const migrationsDir = path.join(__dirname, '../supabase/migrations');
  const files = fs.readdirSync(migrationsDir).sort();

  console.log(`Found ${files.length} migration files`);

  for (const file of files) {
    if (!file.endsWith('.sql')) continue;

    console.log(`Running migration: ${file}`);
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

    try {
      const { error } = await supabase.rpc('exec_sql', { sql });
      if (error) throw error;
      console.log(`✓ ${file} completed`);
    } catch (error) {
      console.error(`✗ ${file} failed:`, error.message);
      process.exit(1);
    }
  }

  console.log('All migrations completed successfully');
}

runMigrations();
```

---

### validate-env.js

```javascript
const requiredVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'OPENROUTER_API_KEY',
  'ADMIN_TOKEN'
];

function validateEnv() {
  const missing = [];
  const invalid = [];

  for (const varName of requiredVars) {
    const value = process.env[varName];

    if (!value) {
      missing.push(varName);
      continue;
    }

    // Check for placeholder values
    if (value.includes('placeholder') || value.includes('your-')) {
      invalid.push(varName);
    }

    // Validate format
    if (varName.includes('URL') && !value.startsWith('http')) {
      invalid.push(varName);
    }
  }

  if (missing.length > 0) {
    console.error('Missing environment variables:');
    missing.forEach(v => console.error(`  - ${v}`));
    process.exit(1);
  }

  if (invalid.length > 0) {
    console.error('Invalid environment variables (placeholder values):');
    invalid.forEach(v => console.error(`  - ${v}`));
    process.exit(1);
  }

  console.log('✓ All environment variables valid');
}

validateEnv();
```

---

### health-check.js

```javascript
const https = require('https');

async function healthCheck(baseUrl) {
  const tests = [
    { name: 'Homepage (EN)', url: `${baseUrl}/en` },
    { name: 'Homepage (ES)', url: `${baseUrl}/es` },
    { name: 'News API', url: `${baseUrl}/api/news?locale=en&limit=1` },
    { name: 'Trending API', url: `${baseUrl}/api/trending?hours=24` },
    { name: 'Sources API', url: `${baseUrl}/api/news/sources` }
  ];

  console.log(`Running health checks for ${baseUrl}\n`);

  for (const test of tests) {
    try {
      const status = await checkUrl(test.url);
      const icon = status === 200 ? '✓' : '✗';
      console.log(`${icon} ${test.name}: ${status}`);
    } catch (error) {
      console.log(`✗ ${test.name}: ${error.message}`);
    }
  }
}

function checkUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      resolve(res.statusCode);
    }).on('error', reject);
  });
}

const baseUrl = process.argv[2] || 'https://localhost:3000';
healthCheck(baseUrl);
```

---

### deployment-checklist.js

```javascript
const readline = require('readline');
const { exec } = require('child_process');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const steps = [
  {
    title: 'Validate Environment Variables',
    command: 'node scripts/validate-env.js'
  },
  {
    title: 'Test Database Connection',
    command: 'node -e "require(\'@supabase/supabase-js\').createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)"'
  },
  {
    title: 'Run Database Migrations',
    command: 'node scripts/deploy-migrations.js'
  },
  {
    title: 'Build Production Bundle',
    command: 'npm run build'
  },
  {
    title: 'Deploy to Vercel',
    command: 'vercel --prod',
    manual: true
  },
  {
    title: 'Run Health Checks',
    command: 'node scripts/health-check.js https://your-app.vercel.app',
    manual: true
  }
];

async function runChecklist() {
  console.log('🚀 Deployment Checklist\n');

  for (const [index, step] of steps.entries()) {
    console.log(`\n[${index + 1}/${steps.length}] ${step.title}`);

    if (step.manual) {
      await askToContinue(`Run manually: ${step.command}`);
    } else {
      await runCommand(step.command);
    }
  }

  console.log('\n✓ Deployment checklist complete!');
  rl.close();
}

function runCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error: ${error.message}`);
        reject(error);
      } else {
        console.log(stdout);
        resolve();
      }
    });
  });
}

function askToContinue(message) {
  return new Promise((resolve) => {
    rl.question(`${message}\nPress Enter to continue...`, () => resolve());
  });
}

runChecklist();
```

---

## 🔐 SECURITY NOTES

### Environment Variables

**Never commit:**
- `.env.local`
- `.env.production`
- Any file containing real API keys

**Always use:**
- Vercel environment variables UI
- GitHub Secrets for Actions
- Encrypted storage for backups

### Database Migrations

**Best Practices:**
- Always backup before migration
- Test migrations locally first
- Use transactions where possible
- Keep migrations idempotent

### API Keys

**Rotation Schedule:**
- Supabase keys: Every 6 months
- LLM API keys: Every 3 months
- Admin token: Every 90 days

---

## 📊 MONITORING

### Logs to Monitor

**Vercel Function Logs:**
```bash
vercel logs https://your-app.vercel.app
```

**GitHub Actions Logs:**
- Check "Actions" tab in repository
- Monitor scheduled workflows
- Review failed runs

**Supabase Logs:**
- Database queries
- Auth events
- Storage operations

### Alerts to Configure

1. **Error Rate > 5%**
   - Action: Investigate immediately
   - Channel: Email + Slack

2. **Response Time > 3s**
   - Action: Check performance
   - Channel: Slack

3. **Failed Migration**
   - Action: Rollback + investigate
   - Channel: Email

---

## 🎯 AUTOMATION GOALS

### Current State

- ✅ News curation automated (6-hour schedule)
- ✅ Weekly digest automated (Sunday mornings)
- ⏳ Database migrations (manual)
- ⏳ Health checks (manual)
- ⏳ Performance monitoring (manual)

### Future Enhancements

- [ ] Automated database backups (daily)
- [ ] Automated rollback on failed deploy
- [ ] Load testing before production
- [ ] Automated security scanning
- [ ] Performance regression detection

---

**Last Updated:** 2025-01-10  
**Maintainer:** Development Team  
**Status:** Production Ready
