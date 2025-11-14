/**
 * Auth Signout API
 * 
 * POST /api/auth/signout - Sign out the current user and redirect
 * GET /api/auth/signout?locale=en - Sign out and redirect with specific locale
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/db/supabase-server';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Sign out from Supabase
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('[Signout API] Supabase error:', error);
    }

    // Get locale from request or use 'en' as default
    // Try to get from body, query, or referer
    let locale = 'en';
    
    try {
      const referer = req.headers.get('referer') || '';
      const match = referer.match(/\/(en|es)\//);
      if (match) {
        locale = match[1];
      }
    } catch {}

    // Redirect to home in the user's locale
    return NextResponse.redirect(new URL(`/${locale}`, req.url), {
      status: 303, // See Other - standard for POST-redirect-GET
    });
  } catch (error) {
    console.error('[Signout API] Unexpected error:', error);
    return NextResponse.redirect(new URL('/en', req.url), {
      status: 303,
    });
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Sign out from Supabase
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('[Signout API] Supabase error:', error);
    }

    // Get locale from query parameter
    const locale = req.nextUrl.searchParams.get('locale') || 'en';
    return NextResponse.redirect(new URL(`/${locale}`, req.url));
  } catch (error) {
    console.error('[Signout API] Unexpected error:', error);
    return NextResponse.redirect(new URL('/en', req.url));
  }
}
