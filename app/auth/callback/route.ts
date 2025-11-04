import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * OAuth Callback Handler
 * Handles OAuth redirects from Google, GitHub, etc.
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/en';

  if (code) {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Exchange code for session
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Redirect to next URL or home
  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
