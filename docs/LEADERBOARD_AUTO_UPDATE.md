# 🤖 Automatic AI Leaderboard Updates

## Overview

The AINews platform now automatically syncs AI model rankings from [Artificial Analysis](https://artificialanalysis.ai/leaderboards/models) every 6 hours using GitHub Actions.

## How It Works

### 1. **GitHub Actions Workflow** (`.github/workflows/update-leaderboard.yml`)
- **Trigger**: Every 6 hours at 0:00, 6:00, 12:00, 18:00 UTC
- **Also manually triggered**: Via `workflow_dispatch` in GitHub UI
- **Process**:
  1. Checks out the latest code
  2. Runs the scraping script
  3. Verifies build still works
  4. Auto-commits if data changed
  5. Pushes to master automatically

### 2. **Scraping Script** (`scripts/scrape-artificial-analysis.ts`)
Attempts multiple strategies to fetch leaderboard data:

#### Strategy 1: Direct API
```
https://artificialanalysis.ai/api/models/leaderboard
```

#### Strategy 2: GraphQL Query
```graphql
query {
  leaderboard {
    models {
      rank
      name
      provider
      score
    }
  }
}
```

#### Strategy 3: HTML Parsing
- Fetches the webpage HTML
- Looks for JSON in `<script>` tags
- Extracts model data

#### Strategy 4: Environment Variable
- If strategies 1-3 fail, checks `LEADERBOARD_JSON` env var
- Useful for GitHub Actions secrets or manual control

### 3. **Data Flow**
```
Artificial Analysis Website
         ↓
    (Fetch Data)
         ↓
   Clean & Validate
         ↓
Update TypeScript File
         ↓
Build Verification
         ↓
Git Commit & Push
```

## Usage

### Automatic Updates
- No action needed - GitHub Actions handles it every 6 hours
- Auto-commits to `master` when rankings change
- Build must pass before committing

### Manual Update (Local)
```bash
npm run ai:update-leaderboard
```

**Note**: This will fail gracefully if web scraping doesn't work locally (browser environment requirements).

### Manual Update (GitHub Actions)
1. Go to [Actions](../../actions)
2. Click "🤖 Auto-update AI Leaderboard"
3. Click "Run workflow"
4. Select `master` branch
5. Click "Run workflow"

## Data Structure

The script updates `lib/ai/fetch-real-leaderboard.ts` with:

```typescript
export function getOfficialLeaderboardData(): LeaderboardModel[] {
  return [
    {
      rank: 1,
      name: "Gemini 3",
      provider: "Google DeepMind",
      performance_score: 99.2,
      description: "...",
      url: "...",
      company_logo_url: "google-deepmind"
    },
    // ... more models
  ];
}
```

## Source of Truth

- **Primary Source**: https://artificialanalysis.ai/leaderboards/models
- **Fallback**: Hardcoded data in `lib/ai/fetch-real-leaderboard.ts`
- **Update Frequency**: Every 6 hours automatically

## Limitations & Notes

### Current Challenges
1. **JavaScript-Rendered Pages**: Artificial Analysis might use JS rendering, making direct scraping difficult
2. **No Public API**: If AA doesn't expose an API, scraping becomes fragile
3. **Rate Limiting**: Multiple requests might trigger rate limits

### Solutions
- GitHub Actions can wait between retries
- Script validates and cleans data before committing
- Fallback to hardcoded data if scraping fails
- Manual override via environment variables

## Future Enhancements

### Option 1: Webhook Integration
- Have Artificial Analysis notify us when rankings change
- Trigger updates only when needed (not every 6 hours)

### Option 2: Reverse Engineering
- If AA provides an API, document and use it directly
- Reduce reliance on web scraping

### Option 3: Supabase Sync
- Store rankings in Supabase `ai_leaderboard` table
- Use GitHub Actions to sync database
- API endpoint serves from database (live updates)

## Monitoring

### Check Last Update
```bash
# View last commit for leaderboard updates
git log --oneline --grep="leaderboard" | head -5
```

### View Workflow Runs
GitHub Actions > 🤖 Auto-update AI Leaderboard > See all runs

### Alerts
- If scraping fails consistently, GitHub Actions will show warnings
- Manual intervention: Update environment variable or hardcoded data

## Files Involved

| File | Purpose |
|------|---------|
| `.github/workflows/update-leaderboard.yml` | GitHub Actions workflow (runs every 6 hours) |
| `scripts/scrape-artificial-analysis.ts` | Scraping script with multi-strategy approach |
| `lib/ai/fetch-real-leaderboard.ts` | Generated file with official rankings |
| `package.json` | npm script: `ai:update-leaderboard` |

## Support

If rankings aren't updating:
1. Check GitHub Actions logs (`.github/workflows/update-leaderboard.yml`)
2. Verify Artificial Analysis website is accessible
3. Manual update: `npm run ai:update-leaderboard`
4. Last resort: Update `getOfficialLeaderboardData()` manually

---

**Last Updated**: November 19, 2025
**Commit**: 953a869 - Add automatic leaderboard update via GitHub Actions
