import type { ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Inter } from 'next/font/google';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import '../globals.css';

const inter = Inter({ subsets: ['latin'] });

const locales = ['en', 'es'] as const;

type Locale = (typeof locales)[number];

function isLocale(maybeLocale: string): maybeLocale is Locale {
  return (locales as readonly string[]).includes(maybeLocale);
}

export function generateStaticParams() {
  return locales.map((availableLocale) => ({ locale: availableLocale }));
}

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: ReactNode;
  params: { locale: string };
}) {
  if (!locale || !isLocale(locale)) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${inter.className} bg-background text-foreground antialiased`}>
        <NextIntlClientProvider messages={messages} locale={locale}>
          <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
