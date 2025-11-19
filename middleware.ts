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
  // Handle i18n routing only
  // DO NOT touch cookies - they can be corrupted!
  const response = intlMiddleware(request);
  return response;
}

export const config = {
  // Only match i18n routes, exclude API and auth routes completely
  matcher: [
    '/',
    '/(en|es)/:path*',
  ],
};
