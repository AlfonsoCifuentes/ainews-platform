import createMiddleware from 'next-intl/middleware';
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
  const { pathname } = request.nextUrl;

  // Normalize accidental double-locale prefixes (e.g. /en/en/leaderboard)
  const doubleLocaleMatch = pathname.match(/^\/(en|es)\/\1(\/|$)/);
  if (doubleLocaleMatch) {
    const locale = doubleLocaleMatch[1];
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace(`/${locale}/${locale}`, `/${locale}`);
    return NextResponse.redirect(url, 308);
  }

  // Handle i18n routing only
  // DO NOT touch cookies - they can be corrupted!
  return intlMiddleware(request);
}

export const config = {
  // Only match i18n routes, exclude API and auth routes completely
  matcher: [
    '/',
    '/(en|es)/:path*',
  ],
};
