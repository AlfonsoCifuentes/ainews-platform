import { getSupabaseServerClient } from '@/lib/db/supabase';
import { z } from 'zod';
import { createHmac } from 'crypto';

const UnsubscribeSchema = z.object({
  userId: z.string().min(1),
  email: z.string().email(),
  token: z.string().min(1),
});

/**
 * Verify HMAC token for unsubscribe link
 * Token = HMAC-SHA256(userId:email, UNSUBSCRIBE_SECRET || SUPABASE_SERVICE_ROLE_KEY)
 */
function verifyUnsubscribeToken(userId: string, email: string, token: string): boolean {
  const secret = process.env.UNSUBSCRIBE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!secret) return false;
  const expected = createHmac('sha256', secret)
    .update(`${userId}:${email}`)
    .digest('hex');
  return token === expected;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, email, token } = UnsubscribeSchema.parse(body);

    // Verify the signed token to prevent unauthorized unsubscribes
    if (!verifyUnsubscribeToken(userId, email, token)) {
      return Response.json(
        { error: 'Invalid or expired unsubscribe link' },
        { status: 403 }
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
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: 'Invalid parameters' },
        { status: 400 }
      );
    }
    console.error('Unsubscribe API error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
