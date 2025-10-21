"use client";

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n';
import { BentoGrid, BentoCard, BentoIcon, BentoTitle, BentoDescription } from '@/components/shared/BentoGrid';
import { ScrollReveal, ParallaxSection } from '@/components/shared/AnimatedHero';

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
            <ScrollReveal direction="up">
              <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-white/70">
                {t('features.subtitle')}
              </p>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={0.1}>
              <h1 className="text-4xl font-black leading-tight text-white md:text-6xl lg:text-7xl">
                {t('hero.title')}
              </h1>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={0.2}>
              <p className="text-lg text-white/80 md:max-w-xl">
                {t('hero.subtitle')}
              </p>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={0.3}>
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
            </ScrollReveal>
          </div>

          <div className="mx-auto flex w-full max-w-md flex-col gap-4 md:mx-0">
            <ScrollReveal direction="right" delay={0.2}>
              <div className="glass rounded-3xl border-white/10 p-6 text-left shadow-2xl">
                <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-white/50">
                  <span className="h-1 w-8 rounded-full bg-gradient-to-r from-primary via-fuchsia-500 to-cyan-400" />
                  Live Signals
                </div>
                <p className="text-lg font-semibold text-white">
                  Trending topics update every 6 hours with autonomous validation.
                </p>
              </div>
            </ScrollReveal>
            <ScrollReveal direction="right" delay={0.4}>
              <div className="glass rounded-3xl border-white/10 p-6 text-left shadow-2xl">
                <p className="text-sm uppercase tracking-[0.4em] text-white/40">COURSES</p>
                <p className="mt-3 text-base text-white/80">
                  {t('features.courses.description')}
                </p>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Features Section - Bento Grid */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <ScrollReveal>
            <div className="mx-auto mb-14 max-w-3xl text-center">
              <h2 className="text-3xl font-bold text-white md:text-5xl">
                {t('features.title')}
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                {t('features.subtitle')}
              </p>
            </div>
          </ScrollReveal>

          <ParallaxSection speed={0.5}>
            <BentoGrid>
              {/* Large feature card - News (2x2) */}
              <BentoCard colSpan={2} rowSpan={2}>
                <BentoIcon>📰</BentoIcon>
                <BentoTitle>{t('features.news.title')}</BentoTitle>
                <BentoDescription>
                  {t('features.news.description')}
                </BentoDescription>
                <div className="mt-6 flex flex-wrap gap-2">
                  <span className="rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs text-primary">
                    50+ Sources
                  </span>
                  <span className="rounded-full bg-cyan-500/10 border border-cyan-500/20 px-3 py-1 text-xs text-cyan-400">
                    Auto-curated
                  </span>
                  <span className="rounded-full bg-fuchsia-500/10 border border-fuchsia-500/20 px-3 py-1 text-xs text-fuchsia-400">
                    Bilingual
                  </span>
                </div>
              </BentoCard>

              {/* AI Courses (1x1) */}
              <BentoCard>
                <BentoIcon>🎓</BentoIcon>
                <BentoTitle>{t('features.courses.title')}</BentoTitle>
                <BentoDescription>
                  {t('features.courses.description')}
                </BentoDescription>
              </BentoCard>

              {/* Learning AI (1x1) */}
              <BentoCard>
                <BentoIcon>🤖</BentoIcon>
                <BentoTitle>{t('features.learning.title')}</BentoTitle>
                <BentoDescription>
                  {t('features.learning.description')}
                </BentoDescription>
              </BentoCard>

              {/* Knowledge Graph (2x1) */}
              <BentoCard colSpan={2}>
                <BentoIcon>🕸️</BentoIcon>
                <BentoTitle>Knowledge Graph</BentoTitle>
                <BentoDescription>
                  Explore AI entities, relationships, and real-time insights with interactive visualizations.
                </BentoDescription>
                <div className="mt-6">
                  <Link href="/kg" className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition-colors hover:text-white">
                    Explore Graph →
                  </Link>
                </div>
              </BentoCard>

              {/* Trending Topics (1x1) */}
              <BentoCard>
                <BentoIcon>📈</BentoIcon>
                <BentoTitle>Trending</BentoTitle>
                <BentoDescription>
                  Real-time AI trends detected automatically from multiple sources.
                </BentoDescription>
              </BentoCard>
            </BentoGrid>
          </ParallaxSection>
        </div>
      </section>
    </main>
  );
}
