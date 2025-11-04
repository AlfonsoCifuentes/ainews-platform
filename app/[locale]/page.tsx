"use client";

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n';
import { BentoGrid, BentoCard, BentoIcon, BentoTitle, BentoDescription } from '@/components/shared/BentoGrid';
import { ScrollReveal, ParallaxSection } from '@/components/shared/AnimatedHero';
import { TextGradient, TextSplit } from '@/components/shared/TextAnimations';
import { RippleButton } from '@/components/shared/InteractiveButtons';
import { AuthModal } from '@/components/auth/AuthModal';
import { useUser } from '@/lib/hooks/useUser';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import Image from 'next/image';

// Lazy load 3D components AFTER page is interactive (defer heavy Three.js)
const FloatingObjects = dynamic(
  () => import('@/components/shared/FloatingObjects').then((mod) => ({ default: mod.FloatingObjects })),
  { 
    ssr: false,
    loading: () => null // No loading state, just skip rendering initially
  }
);

export default function HomePage() {
  const t = useTranslations('home');
  const { locale } = useUser();
  const [showFloatingObjects, setShowFloatingObjects] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signin');

  // Defer FloatingObjects until after page is interactive
  useEffect(() => {
    // Wait for page to be fully loaded and idle
    const timer = setTimeout(() => {
      setShowFloatingObjects(true);
    }, 1500); // Defer by 1.5s to prioritize content
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-24 px-4 md:py-32">
        {/* 3D Background Elements - deferred for performance */}
        {showFloatingObjects && <FloatingObjects />}
        
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(126,74,255,0.35),transparent_55%),radial-gradient(circle_at_top_right,rgba(14,255,255,0.25),transparent_45%)]" aria-hidden />
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(15,16,35,0.95) 0%,rgba(10,11,24,0.86) 60%,rgba(10,11,24,0.92) 100%)]" aria-hidden />
        <div className="relative container mx-auto grid gap-12 text-center md:grid-cols-[1.2fr_0.8fr] md:text-left">
          <div className="space-y-8">
            <ScrollReveal direction="up">
              <div className="flex items-center justify-center md:justify-start gap-4 mb-2">
                <Image 
                  src="/images/ainews-logo.png" 
                  alt="AINews Logo" 
                  width={56}
                  height={56}
                  className="drop-shadow-[0_0_25px_rgba(104,58,255,0.8)] animate-pulse"
                  priority
                />
              </div>
            </ScrollReveal>
            <ScrollReveal direction="up">
              <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-white/70">
                {t('features.subtitle')}
              </p>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={0.1}>
              <h1 className="text-4xl font-black leading-tight md:text-6xl lg:text-7xl">
                <TextGradient>{t('hero.title')}</TextGradient>
              </h1>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={0.2}>
              <p className="text-lg text-white/80 md:max-w-xl">
                {t('hero.subtitle')}
              </p>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={0.3}>
              <div className="flex flex-wrap justify-center gap-4 md:justify-start">
                <Link href="/news">
                  <RippleButton
                    variant="primary"
                    className="inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-primary via-fuchsia-500 to-cyan-500 px-8 py-3 text-base font-semibold text-primary-foreground shadow-[0_18px_45px_-20px_rgba(116,77,255,0.95)]"
                  >
                    {t('hero.cta')}
                    <span>→</span>
                  </RippleButton>
                </Link>
                <Link href="/courses">
                  <RippleButton
                    variant="ghost"
                    className="inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/5 px-8 py-3 text-base font-semibold text-white/80"
                  >
                    {t('hero.ctaSecondary')}
                  </RippleButton>
                </Link>
              </div>
            </ScrollReveal>
            
            {/* Auth CTA */}
            <ScrollReveal direction="up" delay={0.4}>
              <div className="flex items-center justify-center md:justify-start gap-3 text-sm text-muted-foreground">
                <span>{t('hero.authPrompt')}</span>
                <button
                  onClick={() => {
                    setAuthModalMode('signup');
                    setAuthModalOpen(true);
                  }}
                  className="font-semibold text-primary hover:text-white transition-colors underline underline-offset-4"
                >
                  {t('hero.signupLink')}
                </button>
                <span className="text-white/30">•</span>
                <button
                  onClick={() => {
                    setAuthModalMode('signin');
                    setAuthModalOpen(true);
                  }}
                  className="font-semibold text-muted-foreground hover:text-white transition-colors"
                >
                  {t('hero.loginLink')}
                </button>
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
                <TextSplit text={t('features.title')} by="word" stagger={0.1} />
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

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authModalMode}
        locale={locale}
      />
    </main>
  );
}
