'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Share2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'pwa-install-dismissed';
const REDISPLAY_DAYS = 7;
const INSTALL_PROMPT_DELAY_MS = 30000;
const IOS_HINT_DELAY_MS = 45000;

function getDismissedAt(): Date | null {
  try {
    const rawValue = localStorage.getItem(DISMISS_KEY);
    return rawValue ? new Date(rawValue) : null;
  } catch {
    return null;
  }
}

function rememberDismissal() {
  try {
    localStorage.setItem(DISMISS_KEY, new Date().toISOString());
  } catch {
    // Ignore storage errors (private mode / blocked storage)
  }
}

function isStandaloneMode() {
  if (typeof window === 'undefined') return false;
  const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia('(display-mode: standalone)').matches || navigatorWithStandalone.standalone === true;
}

function isIosDevice() {
  if (typeof window === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showIosHint, setShowIosHint] = useState(false);
  const [locale, setLocale] = useState<'en' | 'es'>('en');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const iosHintTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const promptCapturedRef = useRef(false);

  const t = locale === 'es'
    ? {
        installTitle: 'Instala ThotNet Core',
        installDescription: 'Acceso rapido, lectura offline y experiencia tipo app.',
        installButton: 'Instalar',
        notNow: 'Ahora no',
        iosTitle: 'Anadir a pantalla de inicio',
        iosDescription: 'En iPhone o iPad, pulsa Compartir y luego "Anadir a pantalla de inicio".',
        gotIt: 'Entendido',
        close: 'Cerrar',
      }
    : {
        installTitle: 'Install ThotNet Core',
        installDescription: 'Get faster access, offline reading, and an app-like experience.',
        installButton: 'Install',
        notNow: 'Not now',
        iosTitle: 'Add to Home Screen',
        iosDescription: 'On iPhone or iPad, tap Share and then "Add to Home Screen".',
        gotIt: 'Got it',
        close: 'Close',
      };

  useEffect(() => {
    if (typeof document !== 'undefined') {
      setLocale(document.documentElement.lang?.startsWith('es') ? 'es' : 'en');
    }

    if (isStandaloneMode()) {
      return;
    }

    const dismissedDate = getDismissedAt();
    if (dismissedDate) {
      const daysSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < REDISPLAY_DAYS) {
        return;
      }
    }

    const handler = (e: Event) => {
      e.preventDefault();
      promptCapturedRef.current = true;
      setShowIosHint(false);
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);

      timeoutRef.current = setTimeout(() => {
        setShowPrompt(true);
      }, INSTALL_PROMPT_DELAY_MS);
    };

    const appInstalledHandler = () => {
      setDeferredPrompt(null);
      setShowPrompt(false);
      setShowIosHint(false);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', appInstalledHandler);

    if (isIosDevice()) {
      iosHintTimeoutRef.current = setTimeout(() => {
        if (!promptCapturedRef.current && !isStandaloneMode()) {
          setShowIosHint(true);
          setShowPrompt(true);
        }
      }, IOS_HINT_DELAY_MS);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', appInstalledHandler);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (iosHintTimeoutRef.current) clearTimeout(iosHintTimeoutRef.current);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      setShowPrompt(false);
      return;
    }

    await deferredPrompt.prompt();

    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'dismissed') {
      rememberDismissal();
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
    setShowIosHint(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setShowIosHint(false);
    rememberDismissal();
  };

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50"
        >
          <div className="relative rounded-2xl border border-white/15 bg-gradient-to-br from-black/90 via-slate-950/90 to-black/85 p-6 shadow-2xl backdrop-blur-xl">
            <button
              onClick={handleDismiss}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-white/10 transition-colors"
              aria-label={t.close}
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-start gap-4 mb-4">
              <div className="p-3 rounded-xl bg-primary/20">
                {showIosHint ? (
                  <Share2 className="w-6 h-6 text-primary" />
                ) : (
                  <Download className="w-6 h-6 text-primary" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">
                  {showIosHint ? t.iosTitle : t.installTitle}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {showIosHint ? t.iosDescription : t.installDescription}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              {showIosHint ? (
                <Button onClick={handleDismiss} className="w-full" size="sm">
                  {t.gotIt}
                </Button>
              ) : (
                <>
                  <Button
                    onClick={handleInstall}
                    className="flex-1"
                    size="sm"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {t.installButton}
                  </Button>
                  <Button
                    onClick={handleDismiss}
                    variant="outline"
                    size="sm"
                  >
                    {t.notNow}
                  </Button>
                </>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
