"use client";

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n';

export default function HomePage() {
  const t = useTranslations('home');

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-24 px-4 md:py-32">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(126,74,255,0.35),transparent_55%),radial-gradient(circle_at_top_right,rgba(14,255,255,0.25),transparent_45%)]" aria-hidden />
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(15,16,35,0.95) 0%,rgba(10,11,24,0.86) 60%,rgba(10,11,24,0.92) 100%)]" aria-hidden />
        <div className="relative container mx-auto grid gap-12 text-center md:grid-cols-[1.2fr_0.8fr] md:text-left">
          <div className="space-y-8">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-white/70">
              {t('features.subtitle')}
            </p>
            <h1 className="text-4xl font-black leading-tight text-white md:text-6xl lg:text-7xl">
              {t('hero.title')}
            </h1>
            <p className="text-lg text-white/80 md:max-w-xl">
              {t('hero.subtitle')}
            </p>
            <div className="flex flex-wrap justify-center gap-4 md:justify-start">
              <Link
                href="/news"
                className="group inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-primary via-fuchsia-500 to-cyan-500 px-8 py-3 text-base font-semibold text-primary-foreground shadow-[0_18px_45px_-20px_rgba(116,77,255,0.95)] transition-all hover:translate-y-[-2px]"
              >
                {t('hero.cta')}
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </Link>
              <Link
                href="/courses"
                className="inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/5 px-8 py-3 text-base font-semibold text-white/80 transition-all hover:border-white/25 hover:text-white"
              >
                {t('hero.ctaSecondary')}
              </Link>
            </div>
          </div>

          <div className="mx-auto flex w-full max-w-md flex-col gap-4 md:mx-0">
            <div className="glass rounded-3xl border-white/10 p-6 text-left shadow-2xl">
              <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-white/50">
                <span className="h-1 w-8 rounded-full bg-gradient-to-r from-primary via-fuchsia-500 to-cyan-400" />
                Live Signals
              </div>
              <p className="text-lg font-semibold text-white">
                Trending topics update every 6 hours with autonomous validation.
              </p>
            </div>
            <div className="glass rounded-3xl border-white/10 p-6 text-left shadow-2xl">
              <p className="text-sm uppercase tracking-[0.4em] text-white/40">COURSES</p>
              <p className="mt-3 text-base text-white/80">
                {t('features.courses.description')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="mx-auto mb-14 max-w-3xl text-center">
            <h2 className="text-3xl font-bold text-white md:text-5xl">
              {t('features.title')}
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              {t('features.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent p-[1px]">
              <div className="h-full rounded-[calc(theme(borderRadius.3xl)-1px)] bg-black/60 p-8 transition-all duration-300 group-hover:bg-black/40">
                <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20 text-2xl">
                  📰
                </div>
                <h3 className="text-2xl font-semibold text-white">
                  {t('features.news.title')}
                </h3>
                <p className="mt-4 text-sm text-muted-foreground">
                  {t('features.news.description')}
                </p>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent p-[1px]">
              <div className="h-full rounded-[calc(theme(borderRadius.3xl)-1px)] bg-black/60 p-8 transition-all duration-300 group-hover:bg-black/40">
                <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-fuchsia-500/25 text-2xl">
                  🎓
                </div>
                <h3 className="text-2xl font-semibold text-white">
                  {t('features.courses.title')}
                </h3>
                <p className="mt-4 text-sm text-muted-foreground">
                  {t('features.courses.description')}
                </p>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent p-[1px]">
              <div className="h-full rounded-[calc(theme(borderRadius.3xl)-1px)] bg-black/60 p-8 transition-all duration-300 group-hover:bg-black/40">
                <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/25 text-2xl">
                  🤖
                </div>
                <h3 className="text-2xl font-semibold text-white">
                  {t('features.learning.title')}
                </h3>
                <p className="mt-4 text-sm text-muted-foreground">
                  {t('features.learning.description')}
                </p>
                <div className="mt-6">
                  <Link href="/kg" className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition-colors hover:text-white">
                    Knowledge Graph →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
