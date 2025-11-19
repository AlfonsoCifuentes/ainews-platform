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
    // CRITICAL: Sanitize cookies BEFORE Supabase reads them
    // This prevents JSON.parse errors from base64- prefixed values
    const allCookies = request.cookies.getAll() || [];
    const sanitizedCookies: Array<{ name: string; value: string }> = [];
    
    for (const cookie of allCookies) {
      const { name, value } = cookie;
      
      // Debug log
      const valuePreview = value?.slice(0, 24) ?? '';
      const isBase64Prefixed = typeof value === 'string' && /^base64(?:url)?-/.test(value);
      if (isBase64Prefixed || name.toLowerCase().includes('auth') || name.toLowerCase().includes('supabase')) {
        console.log(
          `[Middleware] Cookie ${name}: ${valuePreview}${valuePreview.length < (value?.length ?? 0) ? '...' : ''}${isBase64Prefixed ? ' [BASE64-PREFIXED!]' : ''}`
        );
      }
      
      // If cookie starts with base64- or base64url-, try to clean it
      if (isBase64Prefixed) {
        try {
          // Decode the base64 content
          const encoded = value.replace(/^base64(?:url)?-/, '');
          let decoded = encoded.replace(/-/g, '+').replace(/_/g, '/');
          while (decoded.length % 4) decoded += '=';
          
          try {
            const decoded_str = atob(decoded);
            // Try to parse as JSON
            try {
              JSON.parse(decoded_str);
              // It's valid JSON, use the decoded value
              sanitizedCookies.push({ name, value: encodeURIComponent(decoded_str) });
              console.info(`[Middleware] Recovered cookie ${name} from base64 encoding`);
            } catch {
              // Not JSON, store as plain decoded string
              sanitizedCookies.push({ name, value: encodeURIComponent(decoded_str) });
              console.info(`[Middleware] Recovered cookie ${name} (non-JSON)`);
            }
          } catch {
            // Can't decode, expire this cookie
            response.cookies.set(name, '', { path: '/', expires: new Date(0), sameSite: 'lax', secure: true });
            console.warn(`[Middleware] Expired unparseable cookie: ${name}`);
          }
        } catch (err) {
          console.warn(`[Middleware] Error processing cookie ${name}:`, err);
          response.cookies.set(name, '', { path: '/', expires: new Date(0), sameSite: 'lax', secure: true });
        }
      } else {
        // Normal cookie, keep as-is
        sanitizedCookies.push({ name, value });
      }
    }
    
    // Now pass the sanitized cookies to Supabase
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookieEncoding: 'base64url',
        cookies: {
          getAll() {
            // Return the sanitized cookies, not the request cookies
            return sanitizedCookies;
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    // Refresh the session to ensure it's valid
    try {
      const authResult = await supabase.auth.getUser();
      if (authResult.data?.user) {
        console.info(`[Middleware] Session refreshed for user ${authResult.data.user.id}`);
      } else {
        console.info('[Middleware] No active session');
      }
    } catch (sessionErr) {
      const errMsg = sessionErr instanceof Error ? sessionErr.message : String(sessionErr);
      console.warn('[Middleware] Session refresh failed:', errMsg);
      // Don't fail the request; user may be unauthenticated which is OK
    }
  } catch (error) {
    console.error('[Middleware] Error:', error instanceof Error ? error.message : String(error));
    // Continue with response even if middleware processing fails
  }

  return response;
}

export const config = {
  // Match only internationalized pathnames
  // Exclude /auth/callback to prevent cookie corruption from middleware
  matcher: [
    '/',
    '/(en|es)/:path*',
    // Exclude auth callbacks - they must bypass middleware
    { source: '/((?!auth/callback).*)', locale: false }
  ],
};
