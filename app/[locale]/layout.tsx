import type { ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { routing } from '@/i18n/routing';
import '../globals.css';

const inter = Inter({ subsets: ['latin'] });

type Locale = (typeof routing.locales)[number];

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: ReactNode;
  params: { locale: string };
}) {
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
    <html lang={locale} className="dark" data-theme="dark" suppressHydrationWarning>
      <body
        className={`${inter.className} bg-background text-foreground antialiased selection:bg-primary/40 selection:text-primary-foreground`}
      >
        {umamiSiteId ? (
          <Script
            src={umamiScriptSrc}
            strategy="lazyOnload"
            data-website-id={umamiSiteId}
          />
        ) : null}
        <NextIntlClientProvider messages={messages} locale={locale}>
          <div className="relative flex min-h-screen flex-col">
            <div className="pointer-events-none fixed inset-0 opacity-80 mix-blend-screen" aria-hidden>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_-10%,rgba(126,74,255,0.18),transparent_55%),radial-gradient(circle_at_80%_-20%,rgba(14,255,255,0.12),transparent_45%)]" />
            </div>
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
