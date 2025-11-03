import { NextResponse } from 'next/server';
import { getServerAuthUser } from '@/lib/auth/auth-config';
import { getSupabaseServerClient } from '@/lib/db/supabase';

/**
 * POST /api/notifications/mark-all-read
 * Marks all notifications as read
 */
export async function POST() {
  try {
    const user = await getServerAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getSupabaseServerClient();

    const { error } = await db
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);

    if (error) {
      console.error('Mark all read error:', error);
      return NextResponse.json(
        { error: 'Failed to mark all as read' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (error) {
    console.error('Mark all read API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
