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
      
      // Create response with proper redirect
      const response = NextResponse.redirect(new URL(next, requestUrl.origin));
      
      // Set cookies on response (redundant but ensures they're sent)
      cookieStore.getAll().forEach(cookie => {
        response.cookies.set(cookie.name, cookie.value, { path: '/', sameSite: 'lax', secure: true });
      });
      
      return response;
    }

    // No code provided, redirect to auth page
    return NextResponse.redirect(new URL('/en/auth?error=no_code', requestUrl.origin));
  } catch (error) {
    console.error('[Auth Callback] Unexpected error:', error);
    return NextResponse.redirect(new URL('/en/auth?error=unexpected', request.url));
  }
}


