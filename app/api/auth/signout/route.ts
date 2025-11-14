/**
 * Auth Signout API
 * 
 * POST /api/auth/signout - Sign out the current user
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/db/supabase-server';

export async function POST(_req: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Sign out from Supabase
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('[Signout API] Supabase error:', error);
      // Return success anyway - client will handle clearing local state
      return NextResponse.json({ 
        success: true,
        message: 'Signed out (local)' 
      });
    }

    return NextResponse.json({ 
      success: true,
      message: 'Successfully signed out' 
    });
  } catch (error) {
    console.error('[Signout API] Unexpected error:', error);
    // Return success anyway - important to clear client-side state
    return NextResponse.json({ 
      success: true,
      message: 'Signed out (local)' 
    });
  }
}

// Handle GET as well for convenience
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Sign out from Supabase
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('[Signout API] Supabase error:', error);
    }

    // Redirect to home on signout
    const locale = req.nextUrl.searchParams.get('locale') || 'en';
    return NextResponse.redirect(new URL(`/${locale}`, req.url));
  } catch (error) {
    console.error('[Signout API] Unexpected error:', error);
    return NextResponse.redirect(new URL('/en', req.url));
  }
}
