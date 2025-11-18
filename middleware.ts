import createMiddleware from 'next-intl/middleware';
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const intlMiddleware = createMiddleware({
  // A list of all locales that are supported
  locales: ['en', 'es'],
  // Used when no locale matches
  defaultLocale: 'en',
  // Always use locale prefix
  localePrefix: 'always',
});

export async function middleware(request: NextRequest) {
  // First, handle i18n routing
  const response = intlMiddleware(request);

    try {
      // Logging cookie names and value prefixes for debugging session cookies
      try {
        const cookieList = request.cookies.getAll() || [];
        cookieList.forEach(cookie => {
          const preview = cookie?.value?.slice(0, 24) ?? '';
          const isBase64 = typeof cookie?.value === 'string' && cookie.value.startsWith('base64-');
          console.log(`[Middleware] Cookie: ${cookie.name}, preview: ${preview}${preview.length < (cookie.value?.length ?? 0) ? '...' : ''}, base64?: ${isBase64}`);
        });
      } catch (err) {
        console.warn('[Middleware] Error enumerating cookies for debug:', err);
      }
    // Refresh the Supabase session
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        // Force explicit cookie encoding to avoid mismatches
        cookieEncoding: 'base64url',
        cookies: {
          getAll() {
            const cookies: Array<{ name: string; value: string }> = [];
            request.cookies.getAll().forEach(cookie => {
              cookies.push({ name: cookie.name, value: cookie.value });
            });
            return cookies;
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    // Refresh the session to ensure it's valid
    await supabase.auth.getUser();
    // Session is now refreshed in the response cookies
  } catch (error) {
    console.error('[Middleware] Session refresh error:', error);
    // Don't block requests even if session refresh fails
  }

  return response;
}

export const config = {
  // Match only internationalized pathnames (exclude API routes)
  matcher: ['/', '/(en|es)/:path*'],
};
