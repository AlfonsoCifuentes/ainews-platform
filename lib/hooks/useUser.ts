"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { getClientAuthClient } from '@/lib/auth/auth-client';
import type { UserProfile } from '@/lib/types/user';

const FALLBACK_THEME: UserProfile['theme'] = 'dark';

type MinimalAuthUser = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
};

type AuthStateChangeDetail = {
  userId?: string;
  user?: MinimalAuthUser;
  profile?: UserProfile | null;
};

// Build a minimal profile when OAuth returns a user without a row in user_profiles.
function buildFallbackProfile(user: MinimalAuthUser): UserProfile {
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

  const refetch = useCallback(async () => {
    console.log('[useUser] Refetch called');
    if (refetchRef.current) {
      console.log('[useUser] Executing syncUserProfile...');
      try {
        await refetchRef.current();
        console.log('[useUser] Refetch completed successfully, profile state updated');
      } catch (error) {
        console.error('[useUser] Refetch failed:', error);
      }
    } else {
      console.warn('[useUser] Refetch called but refetchRef.current is null');
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    let clearedCookiesOnce = false;

    const syncUserProfile = async () => {
      if (!isMounted) {
        console.log('[useUser] syncUserProfile called but component is unmounted');
        return;
      }

      console.log('[useUser] syncUserProfile started');
      setIsLoading(true);

      // STEP 1: Try to get user/profile from sessionStorage (set after login)
      let storedUser: Partial<User> | null = null;
      let storedProfile: UserProfile | null = null;
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

        try {
          const storedProfileRaw = sessionStorage.getItem('ainews_auth_profile');
          if (storedProfileRaw) {
            storedProfile = JSON.parse(storedProfileRaw) as UserProfile;
            console.log('[useUser] Hydrated profile from sessionStorage:', storedProfile.display_name);
            setProfile(storedProfile);
            setLocale(storedProfile.preferred_locale ?? 'en');
          }
        } catch (profileError) {
          console.warn('[useUser] Failed to parse sessionStorage profile:', profileError);
        }
      }

      if (!storedProfile && storedUser) {
        const fallbackProfile = buildFallbackProfile(storedUser as User);
        setProfile(fallbackProfile);
        setLocale(fallbackProfile.preferred_locale);
        console.log('[useUser] Applied fallback profile from stored user metadata');
      }

      // STEP 2: Get user from Supabase auth
      let supUserResult;
      try {
        supUserResult = await supabase.auth.getUser();
        console.log('[useUser] Got user from Supabase auth:', supUserResult.data?.user?.id);
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
        console.log('[useUser] No user found, clearing profile');
        setProfile(null);
        setLocale('en');
        setIsLoading(false);
        return;
      }

      console.log('[useUser] Fetching profile for user:', user.id);
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (!isMounted) {
        console.log('[useUser] Component unmounted during profile fetch');
        return;
      }

      if (profileError) {
        console.error('[useUser] Failed to load profile', profileError);
      }

      if (profileData) {
        console.log('[useUser] Profile found, setting state:', profileData.display_name);
        setProfile(profileData as UserProfile);
        setLocale(profileData.preferred_locale ?? 'en');
      } else {
        console.log('[useUser] No profile found, creating fallback profile');
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
          console.log('[useUser] Fallback profile created in database');
        } catch (upsertError) {
          console.error('[useUser] Failed to upsert fallback profile', upsertError);
        }

        if (!isMounted) {
          return;
        }

        console.log('[useUser] Setting fallback profile state:', fallback.display_name);
        setProfile(fallback);
        setLocale(fallback.preferred_locale);
      }

      console.log('[useUser] syncUserProfile completed');
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
          sessionStorage.removeItem('ainews_auth_profile');
        }
      }
    });

    void syncUserProfile();

    return () => {
      isMounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleAuthEvent = (event: Event) => {
      const customEvent = event as CustomEvent<AuthStateChangeDetail>;
      const detail = customEvent.detail;

      if (!detail) {
        return;
      }

      console.log('[useUser] handleAuthEvent received:', { userId: detail.userId, hasProfile: !!detail.profile, hasUser: !!detail.user });

      if (detail.profile === null) {
        console.log('[useUser] Received auth event requesting profile reset');
        setProfile(null);
        setLocale('en');
        try {
          sessionStorage.removeItem('ainews_auth_user');
          sessionStorage.removeItem('ainews_auth_profile');
        } catch (storageError) {
          console.warn('[useUser] Failed clearing sessionStorage on auth reset:', storageError);
        }
        void refetch();
        return;
      }

      // Build or use provided profile
      let nextProfile: UserProfile | null = detail.profile ?? null;

      if (!nextProfile && detail.user) {
        nextProfile = buildFallbackProfile(detail.user);
        console.log('[useUser] Built fallback profile from auth event payload:', nextProfile.display_name);
      }

      // Immediately set state from event payload (don't wait for refetch)
      if (nextProfile) {
        console.log('[useUser] Setting profile immediately from event:', nextProfile.display_name);
        setProfile(nextProfile);
        setLocale(nextProfile.preferred_locale ?? 'en');

        try {
          sessionStorage.setItem('ainews_auth_profile', JSON.stringify(nextProfile));
        } catch (storageError) {
          console.warn('[useUser] Failed persisting sessionStorage profile:', storageError);
        }
      }

      if (detail.user) {
        try {
          sessionStorage.setItem('ainews_auth_user', JSON.stringify(detail.user));
        } catch (storageError) {
          console.warn('[useUser] Failed persisting sessionStorage user:', storageError);
        }
      }

      // Then sync with database in background (don't await)
      console.log('[useUser] Triggering background refetch after immediate profile update');
      void refetch();
    };

    window.addEventListener('auth-state-changed', handleAuthEvent as EventListener);
    return () => window.removeEventListener('auth-state-changed', handleAuthEvent as EventListener);
  }, [refetch]);

  return { profile, locale, isLoading, refetch };
}
