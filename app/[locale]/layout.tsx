import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/react';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ThemeProvider } from '@/lib/theme/ThemeProvider';
import { MatrixRain } from '@/components/shared/MatrixRain';
import { ToastProvider } from '@/components/shared/ToastProvider';
import { ScrollProgress } from '@/components/shared/ScrollEffects';
import { DailyLoginTracker } from '@/components/gamification/DailyLoginTracker';
import { GamificationListeners } from '@/components/gamification/GamificationListeners';
import { XPNotificationManager } from '@/components/gamification/XPFloatingNotification';
import { BadgeNotificationProvider } from '@/components/gamification/BadgeNotificationProvider';
import { AutoBadgeChecker } from '@/components/gamification/AutoBadgeChecker';
import { OAuthCallbackHandler } from '@/components/auth/OAuthCallbackHandler';
import { PWAInstaller } from '@/components/pwa/PWAInstaller';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';
import { UnifiedDebugPanel } from '@/components/shared/UnifiedDebugPanel';
import { BookModeProvider } from '@/lib/hooks/useBookMode';
import { routing } from '@/i18n/routing';
import '../globals.css';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  
  // Default titles for homepage
  const titles: Record<string, string> = {
    en: 'ThotNet Core · AI News & Learning Nexus',
    es: 'ThotNet Core · Noticias y Aprendizaje de IA'
  };
  
  const descriptions: Record<string, string> = {
    en: 'ThotNet Core te mantiene al día con noticias de IA, cursos tipo libro y agentes autónomos en EN/ES.',
    es: 'ThotNet Core te mantiene al día con noticias de IA, cursos tipo libro y agentes autónomos en EN/ES.'
  };
  
  return {
    title: titles[locale] || titles.en,
    description: descriptions[locale] || descriptions.en,
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://thotnet-core.vercel.app'),
    alternates: {
      languages: {
        en: '/en',
        es: '/es',
      },
    },
  };
}

type Locale = (typeof routing.locales)[number];

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  
  // Validate that the incoming `locale` parameter is valid
  if (!routing.locales.includes(locale as Locale)) {
    notFound();
  }

  // Enable static rendering
  setRequestLocale(locale);

  const messages = await getMessages();
  const umamiSiteId = process.env.NEXT_PUBLIC_UMAMI_SITE_ID;
  const umamiBaseUrl = (
    process.env.NEXT_PUBLIC_UMAMI_URL ?? 'https://cloud.umami.is'
  ).replace(/\/$/, '');
  const umamiScriptSrc = `${umamiBaseUrl}/script.js`;

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${inter.className} bg-black text-white antialiased selection:bg-purple-500/40 selection:text-white`}
        suppressHydrationWarning
      >
        <Analytics />
        {umamiSiteId ? (
          <Script
            src={umamiScriptSrc}
            strategy="lazyOnload"
            data-website-id={umamiSiteId}
            crossOrigin="anonymous"
          />
        ) : null}
        
        {/* OAuth Callback Handler component will run useEffect to detect auth state */}
        {/* No need for inline script - use OAuthCallbackHandler.tsx instead */}
        
        {/* This MUST run before Supabase client library loads to prevent JSON.parse errors */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
console.log('[CookieNorm] Starting normalization...');
(function() {
  try {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;
    
    // CRITICAL: Normalize all Supabase-related storage synchronously
    // This must run BEFORE any Supabase library code loads
    
    function decodeBase64Url(s) {
      try {
        s = s.replace(/-/g, '+').replace(/_/g, '/');
        while (s.length % 4) s += '=';
        return atob(s);
      } catch (err) {
        return null;
      }
    }
    
    function normalizeValue(rawValue) {
      if (!rawValue || typeof rawValue !== 'string') return null;
      
      // Check if value starts with base64- or base64url-
      if (/^base64(?:url)?-/.test(rawValue)) {
        const encoded = rawValue.replace(/^base64(?:url)?-/, '');
        const decoded = decodeBase64Url(encoded);
        if (decoded) {
          try {
            JSON.parse(decoded);
            return decoded;
          } catch {
            return decoded;
          }
        }
        return null;
      }
      return null;
    }
    
    // Stage 1: Clean localStorage and sessionStorage FIRST (before Supabase reads from them)
    const storagesToClean = [];
    try { storagesToClean.push(['localStorage', window.localStorage]); } catch (e) {}
    try { storagesToClean.push(['sessionStorage', window.sessionStorage]); } catch (e) {}
    
    storagesToClean.forEach(([storageName, storage]) => {
      if (!storage) return;
      try {
        const keysToProcess = [];
        // Collect all keys first to avoid mutation during iteration
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i);
          if (key && (key.includes('supabase') || key.includes('auth') || key.startsWith('sb'))) {
            keysToProcess.push(key);
          }
        }
        
        keysToProcess.forEach(key => {
          try {
            let value = storage.getItem(key);
            if (!value) return;
            
            // Try to normalize base64 values
            const normalized = normalizeValue(value);
            if (normalized && normalized !== value) {
              storage.setItem(key, normalized);
              console.log('[CookieNorm] Fixed ' + storageName + '.' + key);
              return;
            }
            
            // If the value contains 'base64' but couldn't be decoded, remove it
            if (typeof value === 'string' && value.includes('base64') && !value.startsWith('{') && !value.startsWith('[')) {
              storage.removeItem(key);
              console.log('[CookieNorm] Removed invalid ' + storageName + '.' + key);
              return;
            }
          } catch (e) {
            console.warn('[CookieNorm] Error processing ' + storageName + '.' + key + ':', e.message);
          }
        });
      } catch (e) {
        console.warn('[CookieNorm] ' + storageName + ' cleanup error:', e.message);
      }
    });
    
    console.log('[CookieNorm] Normalization complete');
    
  } catch (err) {
    console.error('[CookieNorm] Fatal error:', err);
  }
})();
            `,
          }}
        />

        <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark" enableSystem={false}>
          <ToastProvider>
            <NextIntlClientProvider messages={messages} locale={locale}>
              <BadgeNotificationProvider locale={locale as 'en' | 'es'}>
                <BookModeProvider>
                <OAuthCallbackHandler />
                <div className="relative flex min-h-screen flex-col">
                  {/* Matrix Rain Background */}
                  <MatrixRain />
                  
                  {/* Scroll Progress Indicator */}
                  <ScrollProgress />
                  
                  {/* Gradient Overlay */}
                  <div className="pointer-events-none fixed inset-0 opacity-40 mix-blend-screen" aria-hidden="true">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_-10%,rgba(126,74,255,0.25),transparent_60%),radial-gradient(circle_at_80%_-20%,rgba(14,255,255,0.18),transparent_50%)]" />
                  </div>
                  
                  <Header />
                  <main className="flex-1 relative z-10">{children}</main>
                  <Footer />
                  
                  {/* Gamification Systems */}
                  <DailyLoginTracker />
                  <GamificationListeners />
                  <XPNotificationManager />
                  <AutoBadgeChecker />
                  
                  {/* PWA Features */}
                  <PWAInstaller />
                  <InstallPrompt />
                  
                  {/* Unified Debug Panel (LogDashboard + ServerDebugPanel) */}
                  <UnifiedDebugPanel />
                </div>
              </BookModeProvider>
              </BadgeNotificationProvider>
            </NextIntlClientProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
