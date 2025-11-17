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
  const [courseId, setCourseId] = useState<string | undefined>();

  useEffect(() => {
    console.log('[AuthModalProvider] mounted');
    const handleLoginRequest = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('[AuthModalProvider] Login request received:', customEvent.detail);
      setCourseId(customEvent.detail?.courseId);
      setInitialMode('signin');
      setIsOpen(true);
    };

    const handleSignupRequest = (_event: Event) => {
      console.log('[AuthModalProvider] Signup request received');
      setCourseId(undefined);
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

  const handleClose = () => {
    console.log('[AuthModalProvider] handleClose called');
    setIsOpen(false);
    setCourseId(undefined);
  };

  useEffect(() => {
    console.log('[AuthModalProvider] isOpen changed:', isOpen, 'courseId:', courseId);
  }, [isOpen, courseId]);

  return (
    <AuthModal
      isOpen={isOpen}
      onClose={handleClose}
      initialMode={initialMode}
      locale={locale}
      courseId={courseId}
    />
  );
}
