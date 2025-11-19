import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

/**
 * OAuth Callback Handler
 * Handles OAuth redirects from Google, GitHub, etc.
 * Uses createServerClient with proper cookie handling
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
          cookieEncoding: 'base64url',
          cookies: {
            getAll() {
              return cookieStore.getAll();
            },
            setAll(cookiesToSet) {
              try {
                cookiesToSet.forEach(({ name, value, options }) => {
                  cookieStore.set(name, value, options);
                  console.log('[Auth Callback] Cookie set:', { name, size: value?.length || 0 });
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
      
      console.log('[Auth Callback] Session established:', { 
        userId: data?.user?.id, 
        email: data?.user?.email,
        hasSession: !!data.session
      });

      // Debug: log cookies present after exchange to ensure correct encoding
      try {
        const cookieEntries = cookieStore.getAll();
        console.log('[Auth Callback] Cookies after exchange:', { count: cookieEntries.length });
        cookieEntries.forEach(c => {
          const isBase64 = typeof c.value === 'string' && c.value.startsWith('base64-');
          console.log(`[Auth Callback] Cookie ${c.name}: size=${c.value?.length || 0}, isBase64=${isBase64}`);
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

      console.log('[Auth Callback] Redirecting to:', next);
      return response;
    }

    // No code provided, redirect to auth page
    return NextResponse.redirect(new URL('/en/auth?error=no_code', requestUrl.origin));
  } catch (error) {
    console.error('[Auth Callback] Unexpected error:', error);
    return NextResponse.redirect(new URL('/en/auth?error=unexpected', request.url));
  }
}


