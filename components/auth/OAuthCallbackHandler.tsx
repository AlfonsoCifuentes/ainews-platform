'use client';

import { useEffect } from 'react';
import { getClientAuthClient } from '@/lib/auth/auth-client';
import { loggers } from '@/lib/utils/logger';

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
  loggers.oauth('OAuthCallbackHandler component rendered');
  
  useEffect(() => {
    loggers.oauth('OAuthCallbackHandler useEffect hook executed');
    
    const handleOAuthCallback = async () => {
      loggers.oauth('handleOAuthCallback started');
      try {
        // Give the supabase client a moment to establish the session from cookies
        loggers.oauth('Waiting 100ms for Supabase session cookie...');
        await new Promise(resolve => setTimeout(resolve, 100));

        const supabase = getClientAuthClient();
        loggers.success('oauth', 'Supabase client initialized');
        
        // Check if we have an active user session
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        loggers.user('getUser result', { 
          userId: user?.id, 
          hasError: !!authError,
          errorMessage: authError?.message
        });
        
        if (authError) {
          loggers.warn('oauth', 'No active session', { message: authError.message });
          return;
        }

        if (!user) {
          loggers.user('No user in session');
          return;
        }

        loggers.success('user', 'User session detected', { userId: user.id, email: user.email });

        // Try to fetch the user's profile from the API
        try {
          loggers.oauth('Fetching profile from API...');
          const profileResponse = await fetch('/api/user/profile', {
            method: 'GET',
            credentials: 'include',
          });

          loggers.user('Profile API response', { status: profileResponse.status, ok: profileResponse.ok });

          if (profileResponse.ok) {
            const profileJson = await profileResponse.json();
            if (profileJson?.data) {
              loggers.success('user', 'Profile loaded from API', { displayName: profileJson.data.display_name });
              
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
              loggers.success('event', 'Dispatched auth-state-changed event with API profile');
              return;
            }
          } else {
            loggers.warn('oauth', 'Profile fetch failed', { status: profileResponse.status });
          }
        } catch (profileError) {
          loggers.warn('oauth', 'Error fetching profile', profileError as Error);
        }

        // If we couldn't get the profile from API, build a fallback from metadata
        loggers.user('Building fallback profile from OAuth metadata');
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

        loggers.success('user', 'Using fallback profile', { displayName: fallbackProfile.display_name, avatarUrl: !!fallbackProfile.avatar_url });

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
        loggers.success('event', 'Dispatched auth-state-changed event with fallback profile');
        
      } catch (error) {
        loggers.error('oauth', 'Unexpected error in OAuth handler', error as Error);
      }
    };

    // Run callback handler on mount
    loggers.oauth('Starting handleOAuthCallback execution');
    try {
      void handleOAuthCallback().then(() => {
        loggers.success('oauth', 'handleOAuthCallback completed successfully');
      }).catch((err) => {
        loggers.error('oauth', 'handleOAuthCallback rejected', err as Error);
      });
    } catch (err) {
      loggers.error('oauth', 'Error calling handleOAuthCallback', err as Error);
    }
  }, []);

  return null;
}
