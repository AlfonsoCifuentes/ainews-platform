import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * Synchronizes the user session between client and server.
 * This endpoint:
 * 1. Reads all cookies from the request
 * 2. Validates them with Supabase
 * 3. Returns the current user and refreshed auth state
 * 4. Sets proper cookies in the response
 */
export async function GET() {
  try {
    const cookieStore = await cookies();

    // Create a Supabase client with the request cookies
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookieEncoding: 'base64url',
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    // Get the current user from the session
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error('[Auth Sync] Error getting user:', userError);
      return NextResponse.json(
        { user: null, error: 'Failed to sync session' },
        { status: 401 }
      );
    }

    if (!user) {
      console.info('[Auth Sync] No active session');
      return NextResponse.json({ user: null, authenticated: false });
    }

    console.info('[Auth Sync] Session synced for user:', user.id);

    // Return the synced user data
    const response = NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        user_metadata: user.user_metadata,
      },
    });

    // Ensure cookies are set in the response
    const allCookies = cookieStore.getAll();
    allCookies.forEach(({ name, value }) => {
      response.cookies.set(name, value, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 365, // 1 year
      });
    });

    return response;
  } catch (error) {
    console.error('[Auth Sync] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', user: null },
      { status: 500 }
    );
  }
}
