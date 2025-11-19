"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { getClientAuthClient } from '@/lib/auth/auth-client';
import type { UserProfile } from '@/lib/types/user';

const FALLBACK_THEME: UserProfile['theme'] = 'dark';

// Build a minimal profile when OAuth returns a user without a row in user_profiles.
function buildFallbackProfile(user: User): UserProfile {
  const now = new Date().toISOString();
  const metadata = user.user_metadata ?? {};
  // Google sends 'name', GitHub sends 'user_name' or 'full_name'
  const fullName = (metadata.name as string | undefined) || (metadata.full_name as string | undefined) || (metadata.user_name as string | undefined) || null;
  const displayName = fullName || user.email?.split('@')[0] || null;
  const avatarUrl = (metadata.avatar_url as string | undefined) || (metadata.picture as string | undefined) || null;
  const preferredLocale = (metadata.locale as string | undefined)?.startsWith('es') ? 'es' : 'en';

  return {
    id: user.id,
    display_name: displayName,
    full_name: fullName,
    avatar_url: avatarUrl,
    bio: null,
    preferred_locale: preferredLocale,
    theme: FALLBACK_THEME,
    total_xp: 0,
    level: 1,
    streak_days: 0,
    last_activity_at: now,
    email_notifications: true,
    weekly_digest: true,
    created_at: now,
    updated_at: now,
  };
}

export function useUser() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [locale, setLocale] = useState<'en' | 'es'>('en');
  const [isLoading, setIsLoading] = useState(true);
  const supabase = useMemo(() => getClientAuthClient(), []);
  const refetchRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    let isMounted = true;
    let clearedCookiesOnce = false;

    const syncUserProfile = async () => {
      if (!isMounted) {
        return;
      }

      setIsLoading(true);

      // STEP 1: Try to get user from sessionStorage (set after login)
      let storedUser = null;
      if (typeof window !== 'undefined') {
        try {
          const stored = sessionStorage.getItem('ainews_auth_user');
          if (stored) {
            storedUser = JSON.parse(stored);
            console.log('[useUser] Found user in sessionStorage:', storedUser);
          }
        } catch (e) {
          console.warn('[useUser] Failed to parse sessionStorage user:', e);
        }
      }

      // STEP 2: Get user from Supabase auth
      let supUserResult;
      try {
        supUserResult = await supabase.auth.getUser();
      } catch (err) {
        // Detect cookie parse errors caused by legacy or malformed cookies
        const message = err instanceof Error ? err.message : String(err);
        console.warn('[useUser] Supabase getUser error:', message);
        if (!clearedCookiesOnce && message.includes('Failed to parse cookie string')) {
          clearedCookiesOnce = true;
          // Attempt to clear any Supabase-related cookies (avoid removing all cookies)
          try {
            if (typeof document !== 'undefined') {
              const cookieNames = document.cookie.split(';').map(c => c.split('=')[0].trim()).filter(Boolean);
              cookieNames.forEach(cn => {
                const normalized = cn.toLowerCase();
                if (normalized.startsWith('sb') || normalized.includes('supabase') || normalized.startsWith('sb-')) {
                  document.cookie = `${cn}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;`;
                }
              });
            }
          } catch (clearError) {
            console.warn('[useUser] Error clearing cookies for recovery:', clearError);
          }

          // Attempt again after clearing cookies
          try {
            supUserResult = await supabase.auth.getUser();
          } catch (err2) {
            console.warn('[useUser] getUser failed after clearing cookies:', err2);
            supUserResult = null;
          }
        }
      }

      const data = supUserResult?.data;
      const error = supUserResult?.error;
      const user = data?.user ?? null;

      if (error) {
        console.error('[useUser] Failed to get user', error);
        setProfile(null);
        setLocale('en');
        setIsLoading(false);
        return;
      }

      if (!user) {
        setProfile(null);
        setLocale('en');
        setIsLoading(false);
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (!isMounted) {
        return;
      }

      if (profileError) {
        console.error('[useUser] Failed to load profile', profileError);
      }

      if (profileData) {
        setProfile(profileData as UserProfile);
        setLocale(profileData.preferred_locale ?? 'en');
      } else {
        const fallback = buildFallbackProfile(user);

        try {
          await supabase
            .from('user_profiles')
            .upsert(
              {
                ...fallback,
                created_at: fallback.created_at,
                updated_at: fallback.updated_at,
              },
              { onConflict: 'id' },
            );
        } catch (upsertError) {
          console.error('[useUser] Failed to upsert fallback profile', upsertError);
        }

        if (!isMounted) {
          return;
        }

        setProfile(fallback);
        setLocale(fallback.preferred_locale);
      }

      setIsLoading(false);
    };

    // Store refetch function in ref so it can be called from outside
    refetchRef.current = syncUserProfile;

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
        void syncUserProfile();
      }

      if (event === 'SIGNED_OUT') {
        setProfile(null);
        setLocale('en');
        setIsLoading(false);
        // Clear sessionStorage on logout
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('ainews_auth_user');
        }
      }
    });

    void syncUserProfile();

    return () => {
      isMounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, [supabase]);

  // Return refetch function that calls the stored ref
  const refetch = useCallback(async () => {
    console.log('[useUser] Refetch called, executing syncUserProfile');
    if (refetchRef.current) {
      await refetchRef.current();
      console.log('[useUser] Refetch completed, profile should be updated');
    } else {
      console.warn('[useUser] Refetch called but refetchRef.current is null');
    }
  }, []);

  return { profile, locale, isLoading, refetch };
}
