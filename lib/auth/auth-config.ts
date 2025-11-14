/**
 * Authentication Configuration
 * Supabase Auth setup with email/password + OAuth providers
 */

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { createClient as createSSRClient } from '@/lib/db/supabase-server';

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
 * Get authenticated user (server component or API route)
 * Works in both server components and API routes
 */
export async function getServerAuthUser(): Promise<AuthUser | null> {
  try {
    // Use SSR client which works in both server components and API routes
    const supabase = await createSSRClient();
    
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return null;
    }
    
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    return {
      id: user.id,
      email: user.email!,
      name: profile?.display_name || user.user_metadata?.full_name || user.user_metadata?.name,
      avatar_url: profile?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture,
      locale: profile?.preferred_locale || 'en',
      created_at: user.created_at
    };
  } catch (error) {
    console.error('[getServerAuthUser] Error:', error);
    return null;
  }
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
