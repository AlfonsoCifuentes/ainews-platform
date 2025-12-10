import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: '404 - Page Not Found | ThotNet Core',
  description: 'The page you are looking for does not exist',
};

export default function NotFound() {
  const isoTimestamp = new Date().toISOString();
  const traceCode = isoTimestamp.replace(/\D/g, '').slice(-8);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[hsl(var(--background))] px-6 py-16 text-[hsl(var(--foreground))]">
      <div className="pointer-events-none absolute inset-0 mono-grid opacity-10" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 grain-overlay" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 crt-scanlines" aria-hidden="true" />

      <div className="relative z-10 w-full max-w-5xl text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.5em] text-white/40">System notice</p>
        <div className="mt-6">
          <div className="text-[clamp(6rem,18vw,12rem)] font-black leading-none text-white/5">
            404
          </div>
          <div className="mt-[-4rem] text-3xl font-semibold uppercase tracking-[0.3em] text-white">
            Signal lost
          </div>
        </div>

        <p className="mx-auto mt-6 max-w-2xl text-base text-white/70">
          The route you requested no longer maps to an active module. Choose a verified destination below or return to the live feed.
        </p>

        <div className="mt-10 grid gap-4 text-left md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-[10px] font-mono uppercase tracking-[0.4em] text-white/50">Status</p>
            <p className="mt-3 text-xl font-semibold text-white">Code · 404.A1</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-[10px] font-mono uppercase tracking-[0.4em] text-white/50">Trace</p>
            <p className="mt-3 font-mono text-lg text-white">#{traceCode}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-[10px] font-mono uppercase tracking-[0.4em] text-white/50">Timestamp</p>
            <p className="mt-3 text-sm text-white/80">{isoTimestamp}</p>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-4 text-sm font-semibold uppercase tracking-[0.3em] text-black sm:flex-row">
          <Link href="/" locale="en" className="w-full sm:w-auto">
            <span className="inline-flex w-full items-center justify-center rounded-full bg-white px-8 py-3 text-xs text-black transition-transform hover:-translate-y-0.5">
              Return home
            </span>
          </Link>
          <Link href="/news" locale="en" className="w-full sm:w-auto">
            <span className="inline-flex w-full items-center justify-center rounded-full border border-white/20 px-8 py-3 text-xs text-white transition-all hover:border-white/60">
              <ArrowLeft className="mr-2 h-4 w-4" /> Latest reports
            </span>
          </Link>
        </div>

        <div className="mt-12 grid gap-3 text-left text-sm text-white/70 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-white/40">Navigation</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {[
                { href: '/news', label: 'News grid' },
                { href: '/courses', label: 'Course library' },
                { href: '/trending', label: 'Trending topics' },
                { href: '/leaderboard', label: 'Leaderboard' },
              ].map((link) => (
                <Link key={link.href} href={link.href} locale="en">
                  <span className="inline-flex rounded-lg border border-white/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.2em] text-white/70 transition-colors hover:bg-white/10">
                    {link.label}
                  </span>
                </Link>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-white/40">Manual override</p>
            <p className="mt-4 text-white/70">
              Use the search field in the header to query the live knowledge base. All modules are available in English and Spanish.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
