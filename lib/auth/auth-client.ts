/**
 * Authentication Client Functions
 * Client-side only auth functions (no next/headers dependency)
 */

'use client';

import { createBrowserClient } from '@supabase/ssr';

export type AuthProvider = 'google' | 'github' | 'email';

/**
 * Get auth client (client component)
 * CRITICAL: Must match server-side cookieEncoding configuration for OAuth tokens to be decoded correctly
 */
export function getClientAuthClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error('Supabase environment variables are missing');
  }

  // CRITICAL FIX: Use createBrowserClient with explicit cookieEncoding to match server config
  // Server sends base64url-encoded cookies, client must decode them the same way
  const client = createBrowserClient(url, anonKey, {
    cookieEncoding: 'base64url', // ← MATCHES SERVER CONFIG
  });
  
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
