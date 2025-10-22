"use client";

import { useTranslations } from 'next-intl';
import { ScrollReveal } from '@/components/shared/AnimatedHero';
import { TextGradient } from '@/components/shared/TextAnimations';
import { RippleButton } from '@/components/shared/InteractiveButtons';
import dynamic from 'next/dynamic';

const FloatingObjects = dynamic(
  () => import('@/components/shared/FloatingObjects').then((mod) => ({ default: mod.FloatingObjects })),
  { ssr: false }
);

export function HomeHeroClient() {
  const t = useTranslations('home');

  return (
    <section className="relative overflow-hidden py-24 px-4 md:py-32">
      <FloatingObjects />
      
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
              <RippleButton
                variant="primary"
                className="inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-primary via-fuchsia-500 to-cyan-500 px-8 py-3 text-base font-semibold text-primary-foreground shadow-[0_18px_45px_-20px_rgba(116,77,255,0.95)]"
                onClick={() => window.location.href = '/news'}
              >
                {t('hero.cta')}
                <span>→</span>
              </RippleButton>
              <RippleButton
                variant="ghost"
                className="inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/5 px-8 py-3 text-base font-semibold text-white/80"
                onClick={() => window.location.href = '/courses'}
              >
                {t('hero.ctaSecondary')}
              </RippleButton>
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
              <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-white/50">
                <span className="h-1 w-8 rounded-full bg-gradient-to-r from-cyan-400 via-purple-500 to-fuchsia-500" />
                Self-Improving
              </div>
              <p className="text-lg font-semibold text-white">
                Our AI learns from user feedback to deliver better content daily.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
