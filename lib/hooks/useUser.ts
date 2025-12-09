"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { getClientAuthClient } from '@/lib/auth/auth-client';
import type { UserProfile } from '@/lib/types/user';
import { normalizeVisualStyle } from '@/lib/types/illustrations';
import { loggers } from '@/lib/utils/logger';

const FALLBACK_THEME: UserProfile['theme'] = 'dark';
const AUTH_USER_KEY = 'thotnet_auth_user';
const AUTH_PROFILE_KEY = 'thotnet_auth_profile';

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
    preferred_visual_style: 'photorealistic',
    preferred_visual_density: 'balanced',
    auto_diagramming: true,
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

function ensureVisualPreferences(profile: UserProfile): UserProfile {
  return {
    ...profile,
    preferred_visual_style: normalizeVisualStyle(profile.preferred_visual_style),
    preferred_visual_density: profile.preferred_visual_density ?? 'balanced',
    auto_diagramming: typeof profile.auto_diagramming === 'boolean' ? profile.auto_diagramming : true,
  };
}

export function useUser() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [locale, setLocale] = useState<'en' | 'es'>('en');
  const [isLoading, setIsLoading] = useState(true);
  const supabase = useMemo(() => getClientAuthClient(), []);
  const refetchRef = useRef<(() => Promise<void>) | null>(null);

  const refetch = useCallback(async () => {
    loggers.user('Refetch called');
    if (refetchRef.current) {
      loggers.user('Executing syncUserProfile...');
      try {
        await refetchRef.current();
        loggers.success('user', 'Refetch completed successfully');
      } catch (error) {
        loggers.error('user', 'Refetch failed', error as Error);
      }
    } else {
      loggers.warn('user', 'Refetch called but refetchRef.current is null');
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    let clearedCookiesOnce = false;

    const syncUserProfile = async () => {
      if (!isMounted) {
        loggers.user('syncUserProfile called but component is unmounted');
        return;
      }

      loggers.user('syncUserProfile started');
      
      // CRITICAL DEBUG: Check what cookies the browser has
      if (typeof document !== 'undefined') {
        const allCookies = document.cookie.split(';').map(c => c.trim());
        const sbCookies = allCookies.filter(c => 
          c.toLowerCase().includes('sb-') || 
          c.toLowerCase().includes('supabase') ||
          c.toLowerCase().includes('auth')
        );
        loggers.user('Cookies available to client', {
          totalCookies: allCookies.length,
          supabaseCookies: sbCookies.length,
          details: sbCookies.map(c => c.split('=')[0])
        });
      }
      
      setIsLoading(true);

      // STEP 0: Check for active Supabase session on first load
      // This handles the case where user just completed OAuth login and was redirected
      let supabaseUser: User | null = null;
      try {
        const { data: { user: sessionUser } } = await supabase.auth.getUser();
        if (sessionUser) {
          loggers.success('user', 'Found active Supabase session', { userId: sessionUser.id, email: sessionUser.email });
          supabaseUser = sessionUser;
          
          // Immediately store this in sessionStorage for auth event
          if (typeof window !== 'undefined') {
            sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify({
              id: sessionUser.id,
              email: sessionUser.email,
              user_metadata: sessionUser.user_metadata,
            }));
            loggers.user('Stored session user in sessionStorage');
          }
        } else {
          loggers.user('No active Supabase session found');
        }
      } catch (err) {
        loggers.warn('user', 'Error checking initial session', err);
      }

      // STEP 1: Try to get user/profile from sessionStorage (set after login)
      let storedUser: Partial<User> | null = null;
      let storedProfile: UserProfile | null = null;
      if (typeof window !== 'undefined') {
        try {
          const stored = sessionStorage.getItem(AUTH_USER_KEY);
          if (stored) {
            storedUser = JSON.parse(stored) as Partial<User>;
            loggers.user('Found user in sessionStorage', { userId: (storedUser as Record<string, unknown>).id });
          }
        } catch (e) {
          loggers.warn('user', 'Failed to parse sessionStorage user', e as Error);
        }

        try {
          const storedProfileRaw = sessionStorage.getItem(AUTH_PROFILE_KEY);
          if (storedProfileRaw) {
            storedProfile = JSON.parse(storedProfileRaw) as UserProfile;
            const hydrated = ensureVisualPreferences(storedProfile);
            loggers.success('user', 'Hydrated profile from sessionStorage', { displayName: hydrated.display_name });
            setProfile(hydrated);
            setLocale(hydrated.preferred_locale ?? 'en');
            if (hydrated !== storedProfile) {
              sessionStorage.setItem(AUTH_PROFILE_KEY, JSON.stringify(hydrated));
            }
          }
        } catch (profileError) {
          loggers.warn('user', 'Failed to parse sessionStorage profile', profileError);
        }
      }

      if (!storedProfile && storedUser) {
        const fallbackProfile = buildFallbackProfile(storedUser as User);
        setProfile(fallbackProfile);
        setLocale(fallbackProfile.preferred_locale);
        loggers.user('Applied fallback profile from stored user metadata', { displayName: fallbackProfile.display_name });
      }

      // If we found a Supabase session but no stored profile, trigger a refetch to load it
      if (supabaseUser && !storedProfile) {
        loggers.user('Found OAuth session but no stored profile, will refetch from DB');
      }

      // STEP 2: Get user from Supabase auth
      let supUserResult;
      try {
        supUserResult = await supabase.auth.getUser();
        loggers.user('Got user from Supabase auth', { userId: supUserResult.data?.user?.id });
      } catch (err) {
        // Detect cookie parse errors caused by legacy or malformed cookies
        const message = err instanceof Error ? err.message : String(err);
        loggers.warn('user', 'Supabase getUser error', { message });
        if (!clearedCookiesOnce && message.includes('Failed to parse cookie string')) {
          clearedCookiesOnce = true;
          loggers.user('Attempting to clear malformed Supabase cookies');
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
              loggers.user('Cleared Supabase cookies');
            }
          } catch (clearError) {
            loggers.warn('user', 'Error clearing cookies for recovery', clearError);
          }

          // Attempt again after clearing cookies
          try {
            supUserResult = await supabase.auth.getUser();
            loggers.user('Retry getUser after clearing cookies succeeded');
          } catch (err2) {
            loggers.warn('user', 'getUser failed after clearing cookies', err2);
            supUserResult = null;
          }
        }
      }

      const data = supUserResult?.data;
      const error = supUserResult?.error;
      const user = data?.user ?? null;

      if (error) {
        loggers.error('user', 'Failed to get user from Supabase', error);
        setProfile(null);
        setLocale('en');
        setIsLoading(false);
        return;
      }

      if (!user) {
        loggers.user('No user found, clearing profile');
        setProfile(null);
        setLocale('en');
        setIsLoading(false);
        return;
      }

      loggers.user('Fetching profile for user', { userId: user.id, email: user.email });
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (!isMounted) {
        loggers.user('Component unmounted during profile fetch');
        return;
      }

      if (profileError) {
        loggers.error('user', 'Failed to load profile from database', profileError);
      }

      if (profileData) {
        loggers.success('user', 'Profile found from database', { displayName: profileData.display_name, locale: profileData.preferred_locale });
        const normalizedProfile = ensureVisualPreferences(profileData as UserProfile);
        setProfile(normalizedProfile);
        setLocale(normalizedProfile.preferred_locale ?? 'en');
        
        // Store in sessionStorage for future quick access
        if (typeof window !== 'undefined') {
          try {
            sessionStorage.setItem(AUTH_PROFILE_KEY, JSON.stringify(normalizedProfile));
            loggers.user('Stored profile in sessionStorage');
          } catch (e) {
            loggers.warn('user', 'Failed to store profile in sessionStorage', e);
          }
        }
      } else {
        loggers.user('No profile found in database, creating fallback profile');
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
          loggers.success('user', 'Fallback profile created in database', { displayName: fallback.display_name });
        } catch (upsertError) {
          loggers.error('user', 'Failed to upsert fallback profile', upsertError);
        }

        if (!isMounted) {
          loggers.user('Component unmounted, skipping state update');
          return;
        }

        loggers.user('Setting fallback profile state', { displayName: fallback.display_name });
        const normalizedFallback = ensureVisualPreferences(fallback);
        setProfile(normalizedFallback);
        setLocale(normalizedFallback.preferred_locale);
        
        // Store in sessionStorage
        if (typeof window !== 'undefined') {
          try {
            sessionStorage.setItem(AUTH_PROFILE_KEY, JSON.stringify(normalizedFallback));
            loggers.user('Stored fallback profile in sessionStorage');
          } catch (e) {
            loggers.warn('user', 'Failed to store fallback in sessionStorage', e);
          }
        }
      }

      loggers.success('user', 'syncUserProfile completed');
      setIsLoading(false);
    };

    // Store refetch function in ref so it can be called from outside
    refetchRef.current = syncUserProfile;

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      loggers.user('Auth state changed', { event });
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
        loggers.user('Triggering profile sync due to auth event', { event });
        void syncUserProfile();
      }

      if (event === 'SIGNED_OUT') {
        loggers.user('User signed out, clearing profile');
        setProfile(null);
        setLocale('en');
        setIsLoading(false);
        // Clear sessionStorage on logout
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem(AUTH_USER_KEY);
          sessionStorage.removeItem(AUTH_PROFILE_KEY);
          loggers.user('Cleared sessionStorage on SIGNED_OUT');
        }
      }
    });

    void syncUserProfile();

    return () => {
      isMounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, [supabase]);

  // Listen for XP award events to update the local profile instantly
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ amount: number; source?: string }>).detail;
      if (!detail) return;
      const amount = detail.amount ?? 0;
      if (amount <= 0) return;
      setProfile((prev) => {
        if (!prev) return prev;
        const newTotal = (prev.total_xp || 0) + amount;
        const updated = { ...prev, total_xp: newTotal } as typeof prev;
        try { sessionStorage.setItem(AUTH_PROFILE_KEY, JSON.stringify(updated)); } catch { }
        return updated;
      });
      // Also trigger a background refetch so server-side profile is synced
      void refetch();
    };
    window.addEventListener('xp-awarded', handler as EventListener);
    return () => window.removeEventListener('xp-awarded', handler as EventListener);
  }, [refetch]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleAuthEvent = (event: Event) => {
      const customEvent = event as CustomEvent<AuthStateChangeDetail>;
      const detail = customEvent.detail;

      if (!detail) {
        loggers.warn('auth', 'auth-state-changed event received with no detail');
        return;
      }

      loggers.user('Custom auth-state-changed event received', { userId: detail.userId, hasProfile: !!detail.profile, hasUser: !!detail.user });

      if (detail.profile === null) {
        loggers.user('Received auth event requesting profile reset');
        setProfile(null);
        setLocale('en');
        try {
          sessionStorage.removeItem(AUTH_USER_KEY);
          sessionStorage.removeItem(AUTH_PROFILE_KEY);
          loggers.user('Cleared sessionStorage on profile reset');
        } catch (storageError) {
          loggers.warn('user', 'Failed clearing sessionStorage on auth reset', storageError);
        }
        void refetch();
        return;
      }

      // Build or use provided profile
      let nextProfile: UserProfile | null = detail.profile ?? null;

      if (!nextProfile && detail.user) {
        nextProfile = buildFallbackProfile(detail.user);
        loggers.user('Built fallback profile from auth event', { displayName: nextProfile.display_name });
      }

      // Immediately set state from event payload (don't wait for refetch)
      if (nextProfile) {
        loggers.success('user', 'Setting profile immediately from auth event', { displayName: nextProfile.display_name, locale: nextProfile.preferred_locale });
        const normalized = ensureVisualPreferences(nextProfile);
        setProfile(normalized);
        setLocale(normalized.preferred_locale ?? 'en');

        try {
          sessionStorage.setItem(AUTH_PROFILE_KEY, JSON.stringify(normalized));
          loggers.user('Stored profile in sessionStorage from auth event');
        } catch (storageError) {
          loggers.warn('user', 'Failed persisting sessionStorage profile', storageError);
        }
      }

      if (detail.user) {
        try {
          sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(detail.user));
          loggers.user('Stored user in sessionStorage from auth event');
        } catch (storageError) {
          loggers.warn('user', 'Failed persisting sessionStorage user', storageError);
        }
      }

      // Then sync with database in background (don't await)
      loggers.user('Triggering background profile sync after auth event');
      void refetch();
    };

    window.addEventListener('auth-state-changed', handleAuthEvent as EventListener);
    return () => window.removeEventListener('auth-state-changed', handleAuthEvent as EventListener);
  }, [refetch]);

  return { profile, locale, isLoading, refetch };
}
