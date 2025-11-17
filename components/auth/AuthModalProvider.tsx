'use client';

import { useState, useEffect } from 'react';
import { AuthModal } from '@/components/auth/AuthModal';

interface AuthModalProviderProps {
  locale: 'en' | 'es';
}

/**
 * AuthModalProvider
 * Renders the AuthModal and listens for auth requests from other components
 */
export function AuthModalProvider({ locale }: AuthModalProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [initialMode, setInitialMode] = useState<'signin' | 'signup'>('signin');

  useEffect(() => {
    const handleLoginRequest = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('[AuthModalProvider] Login request received:', customEvent.detail);
      setInitialMode('signin');
      setIsOpen(true);
    };

    const handleSignupRequest = (_event: Event) => {
      console.log('[AuthModalProvider] Signup request received');
      setInitialMode('signup');
      setIsOpen(true);
    };

    window.addEventListener('request-login', handleLoginRequest);
    window.addEventListener('request-signup', handleSignupRequest);

    return () => {
      window.removeEventListener('request-login', handleLoginRequest);
      window.removeEventListener('request-signup', handleSignupRequest);
    };
  }, []);

  return (
    <AuthModal
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      initialMode={initialMode}
      locale={locale}
    />
  );
}
