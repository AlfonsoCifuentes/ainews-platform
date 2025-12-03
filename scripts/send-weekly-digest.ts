/**
 * Weekly Digest Email Sender Script
 * Runs every Monday at 9:00 AM to send personalized AI news digests to users
 */

import { getSupabaseServerClient } from '../lib/db/supabase';
import { generateUserDigest, generateWeeklyDigestHTML } from '../lib/email/weekly-digest';

async function sendEmailDigest(email: string, html: string): Promise<boolean> {
  // Using Resend API (free tier: 3,000 emails/month, 100 emails/day)
  const resendApiKey = process.env.RESEND_API_KEY;
  
  if (!resendApiKey) {
    console.warn('[Email] RESEND_API_KEY not configured, skipping email send');
    return false;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'ThotNet Core Weekly <noreply@thotnetcore.com>',
        to: email,
        subject: 'Your Weekly AI Digest 🤖',
        html,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`[Email] Failed to send to ${email}:`, error);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`[Email] Error sending to ${email}:`, error);
    return false;
  }
}

async function main() {
  console.log('[Weekly Digest] Starting weekly digest generation...');
  console.log('[Weekly Digest] Environment check:');
  console.log(`  - RESEND_API_KEY: ${process.env.RESEND_API_KEY ? '✓ Set' : '✗ Missing (emails will be skipped)'}`);
  console.log(`  - SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '✓ Set' : '✗ Missing'}`);

  const startTime = Date.now();
  const db = getSupabaseServerClient();

  try {
    // Get all users who have email notifications enabled
    const { data: users, error } = await db
      .from('user_profiles')
      .select('user_id, email, username, preferred_language, email_notifications')
      .eq('email_notifications', true)
      .not('email', 'is', null);

    if (error) {
      console.error('[Weekly Digest] Error fetching users:', error);
      throw error;
    }

    if (!users || users.length === 0) {
      console.log('[Weekly Digest] No users with email notifications enabled');
      return;
    }

    console.log(`[Weekly Digest] Found ${users.length} subscribed users`);

    let successCount = 0;
    let failCount = 0;
    let skippedCount = 0;

    for (const user of users) {
      try {
        const locale = (user.preferred_language || 'en') as 'en' | 'es';
        
        console.log(`[Weekly Digest] Generating digest for ${user.email}...`);
        
        const digestData = await generateUserDigest(user.user_id, locale);
        
        if (!digestData) {
          console.log(`[Weekly Digest] ⚠ No content for ${user.email}, skipping`);
          skippedCount++;
          continue;
        }

        const html = generateWeeklyDigestHTML(digestData);
        
        const sent = await sendEmailDigest(user.email, html);
        
        if (sent) {
          console.log(`[Weekly Digest] ✓ Sent to ${user.email}`);
          successCount++;
          
          // Log the email send
          await db.from('email_logs').insert({
            user_id: user.user_id,
            email_type: 'weekly_digest',
            sent_at: new Date().toISOString(),
            status: 'sent',
          });
        } else {
          console.log(`[Weekly Digest] ✗ Failed to send to ${user.email}`);
          failCount++;
          
          await db.from('email_logs').insert({
            user_id: user.user_id,
            email_type: 'weekly_digest',
            sent_at: new Date().toISOString(),
            status: 'failed',
          });
        }

        // Rate limiting: wait 100ms between emails (max 600/min)
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`[Weekly Digest] ✗ Error processing ${user.email}:`, error);
        failCount++;
      }
    }

    const executionTime = Date.now() - startTime;

    console.log('\n[Weekly Digest] Workflow completed!');
    console.log(`  - Total users: ${users.length}`);
    console.log(`  - Successfully sent: ${successCount}`);
    console.log(`  - Failed: ${failCount}`);
    console.log(`  - Skipped (no content): ${skippedCount}`);
    console.log(`  - Execution time: ${(executionTime / 1000).toFixed(2)}s`);

    // Log to ai_system_logs
    await db.from('ai_system_logs').insert({
      action_type: 'weekly_digest',
      model_used: 'email-template',
      input_tokens: 0,
      output_tokens: 0,
      execution_time: executionTime,
      success_count: successCount,
      metadata: {
        total_users: users.length,
        failed: failCount,
        skipped: skippedCount,
      },
    });

  } catch (error) {
    console.error('[Weekly Digest] ✗ Fatal error:', error);
    process.exit(1);
  }
}

main();
