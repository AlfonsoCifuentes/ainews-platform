/**
 * Authentication Configuration
 * Supabase Auth setup with email/password + OAuth providers
 */

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export type AuthProvider = 'google' | 'github' | 'email';

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  locale: 'en' | 'es';
  created_at: string;
}

/**
 * Get authenticated user (server component)
 */
export async function getServerAuthUser(): Promise<AuthUser | null> {
  const supabase = createServerComponentClient({ cookies });
  
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error || !session) {
    return null;
  }
  
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();
  
  return {
    id: session.user.id,
    email: session.user.email!,
    name: profile?.display_name || session.user.user_metadata?.full_name,
    avatar_url: profile?.avatar_url || session.user.user_metadata?.avatar_url,
    locale: profile?.preferred_locale || 'en',
    created_at: session.user.created_at
  };
}

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
export async function signInWithOAuth(provider: 'google' | 'github') {
  const supabase = getClientAuthClient();
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}/auth/callback`
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
 * Reset password
 */
export async function resetPassword(email: string) {
  const supabase = getClientAuthClient();
  
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`
  });
  
  if (error) throw error;
  return data;
}

/**
 * Update password
 */
export async function updatePassword(newPassword: string) {
  const supabase = getClientAuthClient();
  
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword
  });
  
  if (error) throw error;
  return data;
}
