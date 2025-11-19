'use client';

import { useEffect } from 'react';
import { getClientAuthClient } from '@/lib/auth/auth-client';

/**
 * OAuthCallbackHandler
 * 
 * Runs on every page load and checks if we just completed an OAuth login.
 * If so, it fetches the user profile and dispatches an auth-state-changed event.
 * 
 * This handles the case where the user is redirected back from Google/GitHub
 * OAuth and we need to update the client-side state (header, nav, etc).
 */
export function OAuthCallbackHandler() {
  useEffect(() => {
    const handleOAuthCallback = async () => {
      // Give the supabase client a moment to establish the session from cookies
      await new Promise(resolve => setTimeout(resolve, 100));

      const supabase = getClientAuthClient();
      
      try {
        // Check if we have an active user session
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError) {
          console.log('[OAuthCallbackHandler] No active session:', authError.message);
          return;
        }

        if (!user) {
          console.log('[OAuthCallbackHandler] No user in session');
          return;
        }

        console.log('[OAuthCallbackHandler] User session detected:', user.id);

        // Try to fetch the user's profile from the API
        try {
          const profileResponse = await fetch('/api/user/profile', {
            method: 'GET',
            credentials: 'include',
          });

          if (profileResponse.ok) {
            const profileJson = await profileResponse.json();
            if (profileJson?.data) {
              console.log('[OAuthCallbackHandler] Profile loaded:', profileJson.data.display_name);
              
              // Dispatch auth-state-changed event with full profile
              const event = new CustomEvent('auth-state-changed', {
                detail: {
                  userId: user.id,
                  user: {
                    id: user.id,
                    email: user.email,
                    user_metadata: user.user_metadata,
                  },
                  profile: profileJson.data,
                }
              });
              window.dispatchEvent(event);
              console.log('[OAuthCallbackHandler] Dispatched auth-state-changed event with profile');
              return;
            }
          } else {
            console.warn('[OAuthCallbackHandler] Profile fetch failed:', profileResponse.status);
          }
        } catch (profileError) {
          console.warn('[OAuthCallbackHandler] Error fetching profile:', profileError);
        }

        // If we couldn't get the profile from API, build a fallback from metadata
        const metadata = user.user_metadata ?? {};
        const displayName =
          (metadata.name as string | undefined) ||
          (metadata.full_name as string | undefined) ||
          (metadata.user_name as string | undefined) ||
          user.email?.split('@')[0] ||
          'User';
        
        const fallbackProfile = {
          id: user.id,
          display_name: displayName,
          full_name:
            (metadata.full_name as string | undefined) ||
            (metadata.name as string | undefined) ||
            null,
          avatar_url:
            (metadata.avatar_url as string | undefined) ||
            (metadata.picture as string | undefined) ||
            null,
          bio: null,
          preferred_locale: (metadata.locale as string | undefined)?.startsWith('es') ? 'es' : 'en',
          theme: 'dark',
          total_xp: 0,
          level: 1,
          streak_days: 0,
          last_activity_at: new Date().toISOString(),
          email_notifications: true,
          weekly_digest: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        console.log('[OAuthCallbackHandler] Using fallback profile:', fallbackProfile.display_name);

        // Dispatch with fallback profile
        const event = new CustomEvent('auth-state-changed', {
          detail: {
            userId: user.id,
            user: {
              id: user.id,
              email: user.email,
              user_metadata: user.user_metadata,
            },
            profile: fallbackProfile,
          }
        });
        window.dispatchEvent(event);
        console.log('[OAuthCallbackHandler] Dispatched auth-state-changed event with fallback profile');
        
      } catch (error) {
        console.error('[OAuthCallbackHandler] Unexpected error:', error);
      }
    };

    // Run callback handler on mount
    void handleOAuthCallback();
  }, []);

  return null;
}
