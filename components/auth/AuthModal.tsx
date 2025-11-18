'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { signInWithEmail, signUpWithEmail, signInWithOAuth } from '@/lib/auth/auth-client';
import { useRouter } from 'next/navigation';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'signin' | 'signup';
  locale: 'en' | 'es';
  courseId?: string;
}

export function AuthModal({ isOpen, onClose, initialMode = 'signin', locale, courseId }: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingCourseId, setPendingCourseId] = useState<string | undefined>();
  const router = useRouter();

  // Update pending course ID based on prop changes
  useEffect(() => {
    console.log('[AuthModal] useEffect isOpen, courseId ->', { isOpen, courseId });
    if (isOpen && courseId) {
      console.log('[AuthModal] Setting pendingCourseId from prop:', courseId);
      setPendingCourseId(courseId);
    } else if (!isOpen) {
      setPendingCourseId(undefined);
    }
  }, [isOpen, courseId]);

  const translations = {
    en: {
      signin: 'Sign In',
      signup: 'Sign Up',
      email: 'Email',
      password: 'Password',
      name: 'Full Name',
      forgotPassword: 'Forgot password?',
      noAccount: "Don't have an account?",
      hasAccount: 'Already have an account?',
      orContinueWith: 'Or continue with',
      google: 'Google',
      github: 'GitHub',
      signingIn: 'Signing in...',
      signingUp: 'Creating account...',
      enrollingAfterLogin: 'Enrolling in course...',
    },
    es: {
      signin: 'Iniciar Sesión',
      signup: 'Registrarse',
      email: 'Correo Electrónico',
      password: 'Contraseña',
      name: 'Nombre Completo',
      forgotPassword: '¿Olvidaste tu contraseña?',
      noAccount: '¿No tienes cuenta?',
      hasAccount: '¿Ya tienes cuenta?',
      orContinueWith: 'O continúa con',
      google: 'Google',
      github: 'GitHub',
      signingIn: 'Iniciando sesión...',
      signingUp: 'Creando cuenta...',
      enrollingAfterLogin: 'Inscribiendo en curso...',
    }
  };

  const t = translations[locale];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Perform the login/signup
      if (mode === 'signin') {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password, { name, locale });
      }
      
      // 2. Wait briefly for cookies to be set
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // 3. Sync the session with the server to ensure cookies are valid
      const syncResponse = await fetch('/api/auth/sync', {
        method: 'GET',
        credentials: 'include',
      });

      if (!syncResponse.ok) {
        throw new Error('Failed to synchronize session');
      }

      const syncData = await syncResponse.json();
      
      if (!syncData.authenticated || !syncData.user) {
        throw new Error('Session not established after login');
      }

      // 4. Dispatch event to notify components about auth state change
      const event = new CustomEvent('auth-state-changed', {
        detail: { userId: syncData.user.id, user: syncData.user }
      });
      window.dispatchEvent(event);

      // 5. Refresh the router to update header and other auth-dependent components
      // This DOES NOT redirect, just refreshes the current page
      router.refresh();
      
      // 6. Handle pending course enrollment if any
      if (pendingCourseId) {
        await enrollCourse(pendingCourseId);
      } else {
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const enrollCourse = async (courseId: string) => {
    try {
      const response = await fetch('/api/courses/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId }),
        credentials: 'include', // Ensure cookies are sent
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Enrollment error:', response.status, data);
        // If enrollment fails, still close modal but show error
        setError(`Enrollment failed: ${data.error || 'Unknown error'}`);
        return;
      }

      // Dispatch event for XP award
      const event = new CustomEvent('course-enrolled', {
        detail: { courseId },
      });
      window.dispatchEvent(event);

      setPendingCourseId(undefined);
      onClose();
    } catch (err) {
      console.error('Auto-enrollment error:', err);
      setError(`Enrollment failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleOAuth = async (provider: 'google' | 'github') => {
    setLoading(true);
    try {
      await signInWithOAuth(provider);
      // OAuth redirect will handle close, but set pending course for after
      // Note: OAuth flow will redirect away, so we can't handle enrollment here
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  };

  // Debug render
  console.log('[AuthModal] render -> isOpen:', isOpen, 'pendingCourseId:', pendingCourseId);
  if (!isOpen) return null;

  // Render in a portal to escape the header's stacking context
  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="glass relative w-full max-w-md rounded-3xl shadow-[0_30px_90px_-15px_rgba(104,58,255,0.5)] overflow-hidden border-white/10"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition-all hover:scale-110"
          >
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="p-8">
            <h2 className="text-3xl font-bold mb-6 text-white">
              {mode === 'signin' ? t.signin : t.signup}
            </h2>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm"
              >
                {error}
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div>
                  <label className="block text-sm font-medium mb-2 text-white/80">{t.name}</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder:text-white/40 focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2 text-white/80">{t.email}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder:text-white/40 focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-white/80">{t.password}</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder:text-white/40 focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  required
                  minLength={8}
                />
              </div>

              {mode === 'signin' && (
                <div className="text-right">
                  <button
                    type="button"
                    className="text-sm text-primary hover:underline"
                  >
                    {t.forgotPassword}
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-primary to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (mode === 'signin' ? t.signingIn : t.signingUp) : (mode === 'signin' ? t.signin : t.signup)}
              </button>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 backdrop-blur-xl bg-black/40 text-white/60">
                    {t.orContinueWith}
                  </span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleOAuth('google')}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 px-4 py-3 border border-white/10 bg-white/5 rounded-xl hover:bg-white/10 hover:scale-105 transition-all disabled:opacity-50 text-white"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  {t.google}
                </button>

                <button
                  onClick={() => handleOAuth('github')}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 px-4 py-3 border border-white/10 bg-white/5 rounded-xl hover:bg-white/10 hover:scale-105 transition-all disabled:opacity-50 text-white"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
                  </svg>
                  {t.github}
                </button>
              </div>
            </div>

            <div className="mt-6 text-center text-sm">
              <span className="text-white/60">
                {mode === 'signin' ? t.noAccount : t.hasAccount}
              </span>
              {' '}
              <button
                onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
                className="text-primary font-semibold hover:underline hover:text-white transition-colors"
              >
                {mode === 'signin' ? t.signup : t.signin}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
