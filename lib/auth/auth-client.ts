/**
 * Authentication Client Functions
 * Client-side only auth functions (no next/headers dependency)
 */

'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export type AuthProvider = 'google' | 'github' | 'email';

/**
 * Get auth client (client component)
 */
export function getClientAuthClient() {
  const client = createClientComponentClient();
  
  // Debug: log all cookies available to the client
  if (typeof document !== 'undefined') {
    const cookieString = document.cookie;
    const cookies = cookieString.split(';').map(c => c.trim());
    const supabaseCookies = cookies.filter(c => 
      c.toLowerCase().includes('sb-') || 
      c.toLowerCase().includes('supabase') ||
      c.toLowerCase().includes('auth-token')
    );
    
    if (supabaseCookies.length > 0) {
      console.log('[Auth Client] Found Supabase cookies:', supabaseCookies.length);
      supabaseCookies.forEach(cookie => {
        const [name] = cookie.split('=');
        const value = cookie.split('=')[1]?.slice(0, 30) || '';
        console.log(`[Auth Client] Cookie: ${name} = ${value}...`);
      });
    } else {
      console.warn('[Auth Client] NO Supabase cookies found in document.cookie!');
    }
  }
  
  return client;
}

/**
 * Sign in with email/password
 */
export async function signInWithEmail(email: string, password: string) {
  const supabase = getClientAuthClient();
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  if (error) throw error;
  return data;
}

/**
 * Sign up with email/password
 */
export async function signUpWithEmail(
  email: string, 
  password: string,
  metadata?: { name?: string; locale?: 'en' | 'es' }
) {
  const supabase = getClientAuthClient();
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
      emailRedirectTo: `${window.location.origin}/auth/callback`
    }
  });
  
  if (error) throw error;
  return data;
}

/**
 * Sign in with OAuth provider
 */
export async function signInWithOAuth(provider: AuthProvider, redirectTo?: string) {
  if (provider === 'email') {
    throw new Error('Use signInWithEmail for email authentication');
  }
  
  const supabase = getClientAuthClient();
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: redirectTo || `${window.location.origin}/auth/callback`
    }
  });
  
  if (error) throw error;
  return data;
}

/**
 * Sign out
 */
export async function signOut() {
  const supabase = getClientAuthClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Get current session (client-side)
 */
export async function getClientSession() {
  const supabase = getClientAuthClient();
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error) throw error;
  return session;
}

/**
 * Listen to auth state changes
 */
export function onAuthStateChange(callback: (event: string, session: unknown) => void) {
  const supabase = getClientAuthClient();
  
  const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
  
  return subscription;
}
