/**
 * Weekly Digest Generator
 * Runs via GitHub Actions every Monday
 * Sends personalized weekly summaries to all subscribed users
 */

import { createClient } from '@supabase/supabase-js';
import { emailService } from '../lib/email/email-service';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export class WeeklyDigestGenerator {
  /**
   * Generate and send weekly digests to all subscribed users
   */
  async generateDigests() {
    console.log('[Digest] Starting weekly digest generation...');

    try {
      // Get all users who want weekly digests
      const { data: users, error: usersError } = await supabase
        .from('user_notification_preferences')
        .select(
          `
          user_id,
          user_profiles!inner (
            email,
            display_name,
            locale,
            total_xp,
            streak_days
          )
        `
        )
        .eq('notification_type', 'weekly_digest')
        .eq('enabled', true)
        .eq('frequency', 'weekly');

      if (usersError) throw usersError;
      if (!users || users.length === 0) {
        console.log('[Digest] No users subscribed to weekly digests');
        return;
      }

      console.log(`[Digest] Generating digests for ${users.length} users`);

      // Get top articles from last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: topArticles, error: articlesError } = await supabase
        .from('news_articles')
        .select('id, title_en, title_es, summary_en, summary_es, category, quality_score, published_at')
        .gte('published_at', sevenDaysAgo.toISOString())
        .order('quality_score', { ascending: false })
        .order('published_at', { ascending: false })
        .limit(10);

      if (articlesError) throw articlesError;

      // Get new courses from last 7 days
      const { data: newCourses, error: coursesError } = await supabase
        .from('courses')
        .select('id, title_en, title_es, description_en, description_es, created_at')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(5);

      if (coursesError) throw coursesError;

      // Send digest to each user
      let sentCount = 0;
      let errorCount = 0;

      for (const user of users) {
        try {
          const profile = (user as unknown as { user_profiles: { email: string; display_name: string; locale: 'en' | 'es'; total_xp: number; streak_days: number } }).user_profiles;

          // Get user's XP from 7 days ago
          const { data: xpHistory } = await supabase
            .from('user_xp_history')
            .select('total_xp')
            .eq('user_id', user.user_id)
            .lte('recorded_at', sevenDaysAgo.toISOString())
            .order('recorded_at', { ascending: false })
            .limit(1);

          const xpGained = profile.total_xp - (xpHistory?.[0]?.total_xp || 0);

          // Get user's course progress
          const { data: enrollments } = await supabase
            .from('user_course_enrollments')
            .select('progress_percentage')
            .eq('user_id', user.user_id);

          const avgProgress =
            enrollments && enrollments.length > 0
              ? enrollments.reduce((sum, e) => sum + (e.progress_percentage || 0), 0) / enrollments.length
              : 0;

          // Prepare articles in user's locale
          const articles = topArticles.slice(0, 5).map((article) => ({
            title: profile.locale === 'en' ? article.title_en : article.title_es,
            summary: profile.locale === 'en' ? article.summary_en : article.summary_es,
            url: `https://ainews.dev/${profile.locale}/news/${article.id}`,
            category: article.category
          }));

          // Prepare courses in user's locale
          const courses = (newCourses || []).map((course) => ({
            title: profile.locale === 'en' ? course.title_en : course.title_es,
            description: profile.locale === 'en' ? course.description_en : course.description_es,
            url: `https://ainews.dev/${profile.locale}/courses/${course.id}`
          }));

          // Send email
          await emailService.sendWeeklyDigest({
            user: {
              name: profile.display_name,
              email: profile.email,
              locale: profile.locale
            },
            topArticles: articles,
            newCourses: courses,
            stats: {
              xp_gained: Math.max(0, xpGained),
              courses_progress: Math.round(avgProgress),
              streak_days: profile.streak_days
            }
          });

          sentCount++;
          console.log(`[Digest] Sent to ${profile.email}`);

          // Rate limiting: wait 100ms between emails
          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`[Digest] Error sending to user ${user.user_id}:`, error);
          errorCount++;
        }
      }

      console.log(`[Digest] Complete: ${sentCount} sent, ${errorCount} errors`);

      // Log to database
      await supabase.from('ai_system_logs').insert({
        agent_name: 'weekly-digest-generator',
        operation: 'generate_digests',
        status: 'success',
        details: {
          users_total: users.length,
          emails_sent: sentCount,
          errors: errorCount
        }
      });
    } catch (error) {
      console.error('[Digest] Fatal error:', error);

      await supabase.from('ai_system_logs').insert({
        agent_name: 'weekly-digest-generator',
        operation: 'generate_digests',
        status: 'error',
        error_message: String(error)
      });

      throw error;
    }
  }

  /**
   * Record user's XP for weekly tracking
   * Run this daily to track XP history
   */
  async recordDailyXP() {
    console.log('[Digest] Recording daily XP snapshots...');

    try {
      const { data: profiles, error } = await supabase
        .from('user_profiles')
        .select('user_id, total_xp');

      if (error) throw error;

      for (const profile of profiles) {
        await supabase.from('user_xp_history').insert({
          user_id: profile.user_id,
          total_xp: profile.total_xp,
          recorded_at: new Date().toISOString()
        });
      }

      console.log(`[Digest] Recorded XP for ${profiles.length} users`);
    } catch (error) {
      console.error('[Digest] Error recording XP:', error);
      throw error;
    }
  }
}

// CLI execution
if (require.main === module) {
  const generator = new WeeklyDigestGenerator();

  const command = process.argv[2];

  if (command === 'send') {
    generator
      .generateDigests()
      .then(() => {
        console.log('✅ Digests sent successfully');
        process.exit(0);
      })
      .catch((error) => {
        console.error('❌ Error:', error);
        process.exit(1);
      });
  } else if (command === 'record-xp') {
    generator
      .recordDailyXP()
      .then(() => {
        console.log('✅ XP recorded successfully');
        process.exit(0);
      })
      .catch((error) => {
        console.error('❌ Error:', error);
        process.exit(1);
      });
  } else {
    console.log('Usage: ts-node weekly-digest-generator.ts [send|record-xp]');
    process.exit(1);
  }
}
