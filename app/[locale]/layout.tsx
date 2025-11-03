import type { ReactNode } from 'react';
import type { Metadata } from 'next';
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
import { routing } from '@/i18n/routing';
import '../globals.css';

const inter = Inter({ subsets: ['latin'] });

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  
  // Default titles for homepage
  const titles: Record<string, string> = {
    en: 'AINews - Your AI News & Learning Hub',
    es: 'AINews - Tu Hub de Noticias y Aprendizaje de IA'
  };
  
  const descriptions: Record<string, string> = {
    en: 'Stay updated with the latest AI news, learn from AI-generated courses, and explore the AI knowledge graph.',
    es: 'Mantente actualizado con las últimas noticias de IA, aprende de cursos generados por IA y explora el grafo de conocimiento de IA.'
  };
  
  return {
    title: titles[locale] || titles.en,
    description: descriptions[locale] || descriptions.en,
    icons: {
      icon: '/images/AINEWS_logo.png',
      apple: '/images/AINEWS_logo.png',
    },
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
      >
        {umamiSiteId ? (
          <Script
            src={umamiScriptSrc}
            strategy="lazyOnload"
            data-website-id={umamiSiteId}
          />
        ) : null}
        <ThemeProvider>
          <ToastProvider>
            <NextIntlClientProvider messages={messages} locale={locale}>
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
              </div>
            </NextIntlClientProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
