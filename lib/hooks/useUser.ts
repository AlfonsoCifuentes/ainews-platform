"use client";

import { useState, useEffect } from 'react';
import { getSupabaseClient } from '@/lib/db/supabase';
import type { UserProfile } from '@/lib/types/user';

export function useUser() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [locale, setLocale] = useState<'en' | 'es'>('en');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = getSupabaseClient();
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (data) {
          setProfile(data as UserProfile);
          setLocale(data.preferred_locale || 'en');
        }
      }

      setIsLoading(false);
    };

    fetchUser();
  }, []);

  return { profile, locale, isLoading };
}
