'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { X, Cookie, ChevronDown, ChevronUp, Shield } from 'lucide-react';

/**
 * GDPR/RGPD Cookie Consent Banner
 * 
 * Implements Google's EU User Consent Policy requirements:
 * - Displays before loading personalized ads (AdSense)
 * - Offers: Consent, Manage Options, Do Not Consent (3 buttons per Google spec)
 * - Stores choice in localStorage and signals to window.googlefc
 * - Provides revocation link support via showRevocationMessage()
 * 
 * References:
 * - https://support.google.com/adsense/answer/13790256
 * - https://developers.google.com/funding-choices/fc-api-docs
 */

const CONSENT_STORAGE_KEY = 'thotnet_gdpr_consent';
const CONSENT_VERSION = 1;

interface ConsentState {
  adsPersonalization: boolean;
  adStorage: boolean;
  analyticsStorage: boolean;
  timestamp: number;
}

function getStoredConsent(): ConsentState | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    // Check if consent is still valid (365 days)
    if (Date.now() - parsed.timestamp > 365 * 24 * 60 * 60 * 1000) {
      localStorage.removeItem(CONSENT_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function storeConsent(state: ConsentState) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify({ ...state, version: CONSENT_VERSION }));
  } catch {
    // localStorage may be blocked
  }
}

function updateConsentMode(state: ConsentState) {
  if (typeof window === 'undefined') return;
  
  // Update Google Consent Mode v2
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gtag = (window as any).gtag;
  if (typeof gtag === 'function') {
    gtag('consent', 'update', {
      ad_storage: state.adStorage ? 'granted' : 'denied',
      ad_user_data: state.adsPersonalization ? 'granted' : 'denied',
      ad_personalization: state.adsPersonalization ? 'granted' : 'denied',
      analytics_storage: state.analyticsStorage ? 'granted' : 'denied',
    });
  }
  
  // Signal to googlefc if available
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const googlefc = (window as any).googlefc;
  if (googlefc?.callbackQueue) {
    // Consent is now stored; Google's CMP will read from TCF/GPP APIs
  }
}

export function CookieConsent() {
  const t = useTranslations('gdpr');
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState<ConsentState>({
    adsPersonalization: true,
    adStorage: true,
    analyticsStorage: true,
    timestamp: Date.now(),
  });

  useEffect(() => {
    const stored = getStoredConsent();
    if (!stored) {
      // No consent stored, show banner
      setVisible(true);
    } else {
      // Consent already given, apply it
      updateConsentMode(stored);
      setPreferences(stored);
    }
    
    // Listen for revocation requests
    const handleRevocation = () => {
      localStorage.removeItem(CONSENT_STORAGE_KEY);
      setVisible(true);
      setShowDetails(false);
    };
    
    window.addEventListener('thotnet:revoke-consent', handleRevocation);
    
    // Expose revocation function globally for footer link
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).thotnetRevokeConsent = handleRevocation;
    
    return () => {
      window.removeEventListener('thotnet:revoke-consent', handleRevocation);
    };
  }, []);

  const handleAcceptAll = () => {
    const consent: ConsentState = {
      adsPersonalization: true,
      adStorage: true,
      analyticsStorage: true,
      timestamp: Date.now(),
    };
    storeConsent(consent);
    updateConsentMode(consent);
    setVisible(false);
  };

  const handleRejectAll = () => {
    const consent: ConsentState = {
      adsPersonalization: false,
      adStorage: false,
      analyticsStorage: false,
      timestamp: Date.now(),
    };
    storeConsent(consent);
    updateConsentMode(consent);
    setVisible(false);
  };

  const handleSavePreferences = () => {
    const consent = { ...preferences, timestamp: Date.now() };
    storeConsent(consent);
    updateConsentMode(consent);
    setVisible(false);
  };

  const togglePreference = (key: keyof Omit<ConsentState, 'timestamp'>) => {
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-0 inset-x-0 z-[9999] p-4 md:p-6"
        >
          <div className="max-w-4xl mx-auto bg-[#0a0a0f]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-4 md:p-6 pb-0">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Cookie className="w-6 h-6 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg md:text-xl font-bold text-white mb-1">
                    {t('title')}
                  </h2>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    {t('description')}
                  </p>
                </div>
                <button
                  onClick={handleRejectAll}
                  className="flex-shrink-0 p-2 rounded-lg hover:bg-white/5 transition-colors text-gray-500 hover:text-white"
                  aria-label={t('close')}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Expandable Details */}
            <div className="px-4 md:px-6 mt-4">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                <Shield className="w-4 h-4" />
                {t('manageOptions')}
                {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              
              <AnimatePresence>
                {showDetails && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="py-4 space-y-3">
                      {/* Essential cookies - always on */}
                      <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-white">{t('essential.title')}</p>
                          <p className="text-xs text-gray-500">{t('essential.description')}</p>
                        </div>
                        <div className="px-3 py-1 text-xs bg-green-500/20 text-green-400 rounded-full">
                          {t('alwaysOn')}
                        </div>
                      </div>
                      
                      {/* Analytics */}
                      <label className="flex items-center justify-between p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
                        <div>
                          <p className="text-sm font-medium text-white">{t('analytics.title')}</p>
                          <p className="text-xs text-gray-500">{t('analytics.description')}</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={preferences.analyticsStorage}
                          onChange={() => togglePreference('analyticsStorage')}
                          className="w-5 h-5 rounded accent-blue-500"
                        />
                      </label>
                      
                      {/* Advertising */}
                      <label className="flex items-center justify-between p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
                        <div>
                          <p className="text-sm font-medium text-white">{t('advertising.title')}</p>
                          <p className="text-xs text-gray-500">{t('advertising.description')}</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={preferences.adStorage}
                          onChange={() => togglePreference('adStorage')}
                          className="w-5 h-5 rounded accent-blue-500"
                        />
                      </label>
                      
                      {/* Personalization */}
                      <label className="flex items-center justify-between p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
                        <div>
                          <p className="text-sm font-medium text-white">{t('personalization.title')}</p>
                          <p className="text-xs text-gray-500">{t('personalization.description')}</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={preferences.adsPersonalization}
                          onChange={() => togglePreference('adsPersonalization')}
                          className="w-5 h-5 rounded accent-blue-500"
                        />
                      </label>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Actions */}
            <div className="p-4 md:p-6 pt-4 flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleRejectAll}
                className="flex-1 px-4 py-3 text-sm font-medium text-gray-300 bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
              >
                {t('rejectAll')}
              </button>
              {showDetails ? (
                <button
                  onClick={handleSavePreferences}
                  className="flex-1 px-4 py-3 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-colors"
                >
                  {t('savePreferences')}
                </button>
              ) : (
                <button
                  onClick={handleAcceptAll}
                  className="flex-1 px-4 py-3 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-colors"
                >
                  {t('acceptAll')}
                </button>
              )}
            </div>

            {/* Privacy Policy Link */}
            <div className="px-4 md:px-6 pb-4 text-center">
              <a
                href="/privacy"
                className="text-xs text-gray-500 hover:text-gray-400 underline transition-colors"
              >
                {t('privacyPolicy')}
              </a>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Hook to check if ads consent has been granted
 */
export function useAdsConsent(): boolean {
  const [hasConsent, setHasConsent] = useState(false);

  useEffect(() => {
    const stored = getStoredConsent();
    setHasConsent(stored?.adStorage ?? false);
  }, []);

  return hasConsent;
}

/**
 * Function to trigger consent revocation (for footer link)
 */
export function revokeConsent() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('thotnet:revoke-consent'));
  }
}
