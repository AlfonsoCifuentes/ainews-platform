import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthUser } from '@/lib/auth/auth-config';
import { getSupabaseServerClient } from '@/lib/db/supabase';
import { z } from 'zod';

const SettingsSchema = z.object({
  displayName: z.string().min(3).max(30).optional(),
  bio: z.string().max(500).optional(),
  preferredLocale: z.enum(['en', 'es']).optional(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
  emailNotifications: z.boolean().optional(),
  weeklyDigest: z.boolean().optional(),
  achievementNotifications: z.boolean().optional(),
  courseReminders: z.boolean().optional(),
});

/**
 * GET /api/user/settings
 * Gets user settings
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getServerAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getSupabaseServerClient();

    const { data: profile } = await db
      .from('user_profiles')
      .select('display_name, bio, preferred_locale, theme, email_notifications, weekly_digest, achievement_notifications, course_reminders')
      .eq('id', user.id)
      .single();

    return NextResponse.json({ settings: profile || {} });
  } catch (error) {
    console.error('Get settings error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/user/settings
 * Updates user settings
 */
export async function PATCH(req: NextRequest) {
  try {
    const user = await getServerAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validated = SettingsSchema.parse(body);

    const db = getSupabaseServerClient();

    const updates: Record<string, any> = {};
    if (validated.displayName) updates.display_name = validated.displayName;
    if (validated.bio !== undefined) updates.bio = validated.bio;
    if (validated.preferredLocale) updates.preferred_locale = validated.preferredLocale;
    if (validated.theme) updates.theme = validated.theme;
    if (validated.emailNotifications !== undefined) updates.email_notifications = validated.emailNotifications;
    if (validated.weeklyDigest !== undefined) updates.weekly_digest = validated.weeklyDigest;
    if (validated.achievementNotifications !== undefined) updates.achievement_notifications = validated.achievementNotifications;
    if (validated.courseReminders !== undefined) updates.course_reminders = validated.courseReminders;

    updates.updated_at = new Date().toISOString();

    const { data, error } = await db
      .from('user_profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Update settings error:', error);
      return NextResponse.json(
        { error: 'Failed to update settings' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      settings: data,
      message: 'Settings updated successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Settings API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
