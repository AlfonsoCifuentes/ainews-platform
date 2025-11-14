/**
 * API Authentication Helpers
 * Centralized functions for authentication in API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/db/supabase-server';

/**
 * Get authenticated user from request
 * Handles session extraction from Supabase SSR client
 */
export async function getAuthenticatedUser(_req?: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.warn('[Auth] Error getting user:', error.message);
      return { user: null, error: 'Authentication failed' };
    }

    if (!user) {
      console.warn('[Auth] No user found in session');
      return { user: null, error: 'Not authenticated' };
    }

    return { user, error: null };
  } catch (error) {
    console.error('[Auth] Unexpected error:', error);
    return { user: null, error: 'Internal authentication error' };
  }
}

/**
 * Middleware to check authentication and return error if not authenticated
 * Usage: const { user, response } = await requireAuth();
 * if (response) return response; // User not authenticated
 */
export async function requireAuth(_req?: NextRequest) {
  const { user, error } = await getAuthenticatedUser();
  
  if (!user || error) {
    return {
      user: null,
      response: NextResponse.json(
        { error: error || 'Unauthorized' },
        { status: 401 }
      )
    };
  }

  return { user, response: null };
}

/**
 * Get Supabase client for API routes
 * Used in endpoints that need database access
 */
export async function getSupabaseClient() {
  return createClient();
}
