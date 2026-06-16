import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/react';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import Script from 'next/script';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ThemeProvider } from '@/lib/theme/ThemeProvider';
import { ToastProvider } from '@/components/shared/ToastProvider';
import { routing } from '@/i18n/routing';
import { SITE_NAME, SITE_BASE_URL, siteDescription } from '@/lib/config/site';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;

  const title = `${SITE_NAME} · ${locale === 'es' ? 'Noticias de IA' : 'AI News'}`;
  const description = siteDescription(locale);
  const ogLocale = locale === 'es' ? 'es_ES' : 'en_US';
  const ogImage = '/logos/thotnet-core-white-only.png';

  return {
    title: {
      default: title,
      template: `%s · ${SITE_NAME}`,
    },
    description,
    metadataBase: new URL(SITE_BASE_URL),
    alternates: {
      canonical: `/${locale}`,
      languages: { en: '/en', es: '/es' },
    },
    openGraph: {
      type: 'website',
      title,
      description,
      siteName: SITE_NAME,
      locale: ogLocale,
      url: `/${locale}`,
      images: [{ url: ogImage, alt: SITE_NAME }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
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

  if (!routing.locales.includes(locale as Locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const messages = await getMessages();
  const umamiSiteId = process.env.NEXT_PUBLIC_UMAMI_SITE_ID;
  const umamiBaseUrl = (process.env.NEXT_PUBLIC_UMAMI_URL ?? 'https://cloud.umami.is').replace(/\/$/, '');
  const umamiScriptSrc = `${umamiBaseUrl}/script.js`;

  return (
    <>
      <Analytics />
      {umamiSiteId ? (
        <Script
          src={umamiScriptSrc}
          strategy="lazyOnload"
          data-website-id={umamiSiteId}
          crossOrigin="anonymous"
        />
      ) : null}

      <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark" enableSystem={false}>
        <ToastProvider>
          <NextIntlClientProvider messages={messages} locale={locale}>
            <div className="relative flex min-h-screen flex-col bg-[#04050a]">
              <Header />
              <main id="main-content" className="relative z-10 flex-1">
                {children}
              </main>
              <Footer />
            </div>
          </NextIntlClientProvider>
        </ToastProvider>
      </ThemeProvider>
    </>
  );
}
