import { NextResponse } from 'next/server';
import { createClient } from '@/lib/db/supabase-server';

/**
 * GET /api/debug/session
 * Debug endpoint to check current session
 */
export async function GET() {
  try {
    const supabase = await createClient();

    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        user: null,
      });
    }

    return NextResponse.json({
      success: true,
      user: user ? {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || user.user_metadata?.full_name,
        created_at: user.created_at,
      } : null,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      user: null,
    });
  }
}
