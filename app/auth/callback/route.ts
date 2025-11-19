import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

/**
 * OAuth Callback Handler
 * Handles OAuth redirects from Google, GitHub, etc.
 * Uses createServerClient for better cookie handling in Vercel
 */
export async function GET(request: NextRequest) {
  try {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');
    const next = requestUrl.searchParams.get('next') || '/en/courses';

    console.log('[Auth Callback] Processing OAuth callback', { code: !!code, next });

    if (code) {
      const cookieStore = await cookies();
      
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          // Explicitly set cookie encoding to match middleware and client helpers
          cookieEncoding: 'base64url',
          cookies: {
            getAll() {
              return cookieStore.getAll();
            },
            setAll(cookiesToSet) {
              try {
                cookiesToSet.forEach(({ name, value, options }) => {
                  cookieStore.set(name, value, options);
                });
              } catch (error) {
                console.error('[Auth Callback] Error setting cookies:', error);
              }
            },
          },
        }
      );
      
      // Exchange code for session
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (error) {
        console.error('[Auth Callback] Session exchange error:', error);
        return NextResponse.redirect(new URL('/en/auth?error=session_error', requestUrl.origin));
      }
      
      console.log('[Auth Callback] Session established:', { userId: data?.user?.id });

      // Debug: log cookies present after exchange to ensure correct encoding
      try {
        const cookieEntries = cookieStore.getAll();
        cookieEntries.forEach(c => {
          const preview = c.value?.slice(0, 24) ?? '';
          const isBase64 = typeof c.value === 'string' && c.value.startsWith('base64-');
          console.log(`[Auth Callback] Cookie ${c.name} set preview: ${preview}${preview.length < (c.value?.length ?? 0) ? '...' : ''}, base64?: ${isBase64}`);
        });
      } catch (err) {
        console.warn('[Auth Callback] Error enumerating cookies for debug:', err);
      }
      
      // Create response with proper redirect
      const response = NextResponse.redirect(new URL(next, requestUrl.origin));
      
      // Add flags for client-side auth detection
      response.headers.set('X-Auth-Success', 'true');
      if (data?.user?.id) {
        response.headers.set('X-Auth-User-ID', data.user.id);
      }

      // NOTE: We previously set response cookies manually here, but that can lead
      // to double-encoding or malformed values. The Supabase SSR client
      // (createServerClient) already sets cookies via the provided `setAll`
      // method, which ensures cookie chunking and encoding follow the expected
      // format. Avoid setting cookies manually to prevent double-encoded values.
      return response;
    }

    // No code provided, redirect to auth page
    return NextResponse.redirect(new URL('/en/auth?error=no_code', requestUrl.origin));
  } catch (error) {
    console.error('[Auth Callback] Unexpected error:', error);
    return NextResponse.redirect(new URL('/en/auth?error=unexpected', request.url));
  }
}


