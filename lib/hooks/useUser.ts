"use client";

import { useEffect, useMemo, useState } from 'react';
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

  useEffect(() => {
    let isMounted = true;

    const syncUserProfile = async () => {
      if (!isMounted) {
        return;
      }

      setIsLoading(true);

      const { data, error } = await supabase.auth.getUser();
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

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
        void syncUserProfile();
      }

      if (event === 'SIGNED_OUT') {
        setProfile(null);
        setLocale('en');
        setIsLoading(false);
      }
    });

    void syncUserProfile();

    return () => {
      isMounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, [supabase]);

  return { profile, locale, isLoading };
}
