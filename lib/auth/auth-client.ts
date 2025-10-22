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
  return createClientComponentClient();
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
