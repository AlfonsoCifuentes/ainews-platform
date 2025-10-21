# Email Notifications & Analytics - Setup Guide

## Overview
This document covers the email notification system and analytics dashboard added in Phase 3.

## Features Added

### 1. Email Notification System
- **Welcome emails** when users sign up
- **Weekly digests** with top articles, course recommendations, and progress stats
- **Course completion** congratulations with badges
- Uses Resend API (free tier: 3,000 emails/month)

### 2. Analytics Dashboard
- Real-time platform metrics
- User engagement tracking
- Search analytics
- Course completion rates
- Leaderboard performance

### 3. Automated Jobs
- **Weekly digest** - Runs every Monday at 9:00 AM UTC
- **Daily XP recording** - Tracks user progress for weekly comparisons
- **Analytics refresh** - Cleans old data, refreshes leaderboards

---

## Setup Instructions

### 1. Resend API Configuration

1. Create a free account at [resend.com](https://resend.com)
2. Verify your domain (or use their test domain for development)
3. Get your API key from the dashboard
4. Add to `.env.local`:
   ```bash
   RESEND_API_KEY=re_your_key_here
   ```

5. Update the `from` address in `lib/email/email-service.ts`:
   ```typescript
   private from = 'AINews <noreply@yourdomain.com>';
   ```

### 2. Database Migration

Apply the new migration in Supabase dashboard:

```sql
-- File: supabase/migrations/20250101000003_analytics_notifications.sql
-- This adds:
-- - user_xp_history table (for weekly digest XP comparisons)
-- - search_queries table (for search analytics)
-- - analytics_overview view (aggregated metrics)
-- - refresh_analytics() function (cleanup and refresh)
```

**To apply:**
1. Go to Supabase Dashboard → SQL Editor
2. Paste the migration file content
3. Click "Run"

### 3. GitHub Actions Secrets

Add these secrets to your GitHub repository:

**Settings → Secrets and variables → Actions → New repository secret**

- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (not anon key!)
- `RESEND_API_KEY` - Your Resend API key

### 4. Email Templates Customization

Edit templates in `lib/email/email-service.ts`:

- `sendWelcomeEmail()` - Customize welcome message
- `sendWeeklyDigest()` - Adjust digest layout/content
- `sendCourseCompletionEmail()` - Change completion message

All templates support **bilingual** (English/Spanish) content.

---

## Usage

### Sending Emails Programmatically

```typescript
import { emailService } from '@/lib/email/email-service';

// Welcome email
await emailService.sendWelcomeEmail(
  'user@example.com',
  'John Doe',
  'en' // or 'es'
);

// Course completion
await emailService.sendCourseCompletionEmail(
  'user@example.com',
  'John Doe',
  'Introduction to AI',
  'en',
  ['🎓', '⚡', '🏆'] // Badge emojis
);
```

### Manual Digest Generation

Run locally or via GitHub Actions:

```bash
# Send weekly digests to all subscribed users
npx ts-node scripts/weekly-digest-generator.ts send

# Record daily XP snapshots
npx ts-node scripts/weekly-digest-generator.ts record-xp
```

### Analytics Dashboard

Access at: `/analytics` (or `/en/analytics`, `/es/analytics`)

**Metrics displayed:**
- Total users vs active users (weekly/monthly)
- Articles published (total + this week)
- Course enrollments and completion rate
- Search queries volume
- Average quiz scores
- User streak days

**Data refresh:** Every hour (materialized view + function)

---

## GitHub Actions Workflows

### Weekly Digest (`.github/workflows/weekly-digest.yml`)
- **Schedule:** Every Monday at 9:00 AM UTC
- **Jobs:**
  - `send-digests` - Emails weekly summaries
  - `record-xp` - Saves XP snapshots for next week

**Manual trigger:**
```bash
# Via GitHub UI: Actions → Weekly Digest Email → Run workflow
```

### Daily XP Recording (`.github/workflows/daily-xp-recording.yml`)
- **Schedule:** Every day at 23:59 UTC
- **Job:** Records all users' XP for weekly comparisons

---

## User Notification Preferences

Users can control email notifications in the `user_notification_preferences` table:

**Notification types:**
- `weekly_digest` - Weekly summary email
- `course_completion` - Course completion emails
- `new_badge` - Badge achievement notifications
- `streak_reminder` - Streak maintenance reminders
- `new_articles` - New article alerts
- `system_updates` - Platform updates

**Example: Check user preferences before sending**

```typescript
const { data: prefs } = await supabase
  .from('user_notification_preferences')
  .select('enabled')
  .eq('user_id', userId)
  .eq('notification_type', 'weekly_digest')
  .single();

if (prefs?.enabled) {
  await emailService.sendWeeklyDigest(data);
}
```

---

## Cost Optimization

**Free tier limits:**
- **Resend:** 3,000 emails/month
- **GitHub Actions:** 2,000 minutes/month
- **Supabase:** 50,000 monthly active users

**Estimated usage:**
- 1,000 users = ~1,000 emails/week = ~4,000/month (use batching)
- Weekly digest job = ~5 minutes/run = ~20 minutes/month
- Daily XP recording = ~2 minutes/run = ~60 minutes/month

**If you exceed Resend free tier:**
- Implement user preferences UI
- Add unsubscribe links (already in templates)
- Batch emails to stay under 3,000/month
- Or upgrade to Resend Pro ($20/month for 50,000 emails)

---

## Testing

### Test Email Locally

```typescript
// Create test script: scripts/test-email.ts
import { emailService } from '../lib/email/email-service';

emailService.sendWelcomeEmail(
  'your-email@example.com',
  'Test User',
  'en'
).then(() => console.log('Email sent!'));
```

Run:
```bash
npx ts-node scripts/test-email.ts
```

### Test Weekly Digest

```bash
# Dry run (logs to console without sending)
npx ts-node scripts/weekly-digest-generator.ts send --dry-run
```

---

## Monitoring

### Check Email Logs

**Resend Dashboard:** View all sent emails, opens, clicks, bounces

**Supabase Logs:**
```sql
SELECT * FROM ai_system_logs
WHERE agent_name = 'weekly-digest-generator'
ORDER BY created_at DESC
LIMIT 10;
```

### Analytics Performance

```sql
-- Check analytics view
SELECT * FROM analytics_overview;

-- Refresh manually if needed
SELECT refresh_analytics();
```

---

## Troubleshooting

### Emails not sending
1. Check `RESEND_API_KEY` is set correctly
2. Verify domain is verified in Resend
3. Check Resend dashboard for error logs
4. Test with Resend's test domain first

### GitHub Actions failing
1. Verify all secrets are set in repository settings
2. Check Actions logs for specific errors
3. Test scripts locally first with `.env.local`

### Analytics not loading
1. Apply migration `20250101000003_analytics_notifications.sql`
2. Grant permissions: `GRANT SELECT ON analytics_overview TO authenticated;`
3. Check browser console for API errors

---

## Next Steps

**Potential enhancements:**
- Add SMS notifications (Twilio)
- Implement in-app notifications
- Create user preferences UI page
- Add A/B testing for email templates
- Implement email open/click tracking
- Add daily digest option (not just weekly)

---

**Questions?** Check the main `PROJECT_MASTER.md` or create an issue.
