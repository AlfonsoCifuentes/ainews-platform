import { getSupabaseServerClient } from '@/lib/db/supabase';

export async function POST(request: Request) {
  try {
    const { userId, email } = await request.json();

    if (!userId || !email) {
      return Response.json(
        { error: 'userId and email required' },
        { status: 400 }
      );
    }

    const db = getSupabaseServerClient();

    // Update user email notifications preference
    const { error } = await db
      .from('user_profiles')
      .update({ 
        email_notifications: false,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('email', email);

    if (error) {
      console.error('Unsubscribe error:', error);
      return Response.json(
        { error: 'Failed to unsubscribe' },
        { status: 500 }
      );
    }

    // Log the unsubscribe
    await db.from('email_logs').insert({
      user_id: userId,
      email_type: 'notification',
      sent_at: new Date().toISOString(),
      status: 'sent',
      metadata: {
        action: 'unsubscribed',
        reason: 'user_requested',
      },
    });

    return Response.json({
      success: true,
      message: 'Successfully unsubscribed from emails'
    });

  } catch (error) {
    console.error('Unsubscribe API error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
