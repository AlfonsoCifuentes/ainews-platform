import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Inter, Space_Grotesk, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const grotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-display', display: 'swap' });
const plexMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-mono', display: 'swap' });

export const metadata: Metadata = {
  title: 'ThotNet Core · AI News & Learning Nexus',
  description: 'Bilingual AI intelligence hub delivering news, textbook-grade courses, and autonomous agents.',
};

type RootLayoutProps = {
  children: ReactNode;
  params?: Promise<{ locale?: string }>;
};

export default async function RootLayout({ children, params }: RootLayoutProps) {
  const resolvedParams = await params;
  const locale = resolvedParams?.locale ?? 'en';

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`
          ${inter.variable} ${grotesk.variable} ${plexMono.variable}
          bg-[hsl(var(--background))] text-[hsl(var(--foreground))]
          antialiased selection:bg-white/20 selection:text-black relative
        `}
        suppressHydrationWarning
      >
        <div
          className="pointer-events-none fixed inset-0 mono-grid opacity-30"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none fixed inset-0 grain-overlay"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none fixed inset-0 crt-scanlines"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none fixed inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-40"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none fixed inset-y-0 left-0 w-px bg-white/5 opacity-40"
          aria-hidden="true"
        />
        <div className="relative z-10 min-h-screen">{children}</div>
      </body>
    </html>
  );
}