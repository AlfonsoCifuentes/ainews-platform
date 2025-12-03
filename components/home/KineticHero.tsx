'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import Image from 'next/image';
import { Link } from '@/i18n';
import { ThotNetOrb } from './ThotNetOrb';

interface KineticHeroProps {
  locale: 'en' | 'es';
  headline: string;
  subheadline: string;
  stats: {
    sources: number;
    freshnessMinutes: number;
    courses: number;
  };
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
}

// Staggered animation variants (creativewebmanual style - 0.08s delays)
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.2,
    },
  },
};

const fadeUpVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      ease: [0.23, 0.32, 0.23, 0.2], // creativewebmanual easing
    },
  },
};

const slideLeftVariants = {
  hidden: { opacity: 0, x: -60 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.9,
      ease: [0.23, 0.32, 0.23, 0.2],
    },
  },
};

export function KineticHero({
  locale,
  headline,
  subheadline,
  stats,
  primaryCta,
  secondaryCta,
}: KineticHeroProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  });

  const contentY = useTransform(scrollYProgress, [0, 0.5], [0, -80]);
  const orbScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.85]);
  const orbOpacity = useTransform(scrollYProgress, [0, 0.4], [1, 0]);

  return (
    <section
      ref={containerRef}
      className="relative min-h-screen flex items-center overflow-hidden"
    >
      {/* Background noise texture */}
      <div 
        className="absolute inset-0 opacity-[0.015] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Subtle blue halo top-left */}
      <motion.div
        className="absolute top-[-20%] left-[-10%] w-[700px] h-[700px] rounded-full blur-[150px] opacity-20 pointer-events-none"
        style={{ background: 'radial-gradient(circle, hsl(217 91% 60%) 0%, transparent 70%)' }}
        animate={{
          scale: [1, 1.1, 1],
          x: [0, 30, 0],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Amber halo bottom-right */}
      <motion.div
        className="absolute bottom-[-15%] right-[-10%] w-[500px] h-[500px] rounded-full blur-[120px] opacity-15 pointer-events-none"
        style={{ background: 'radial-gradient(circle, hsl(38 92% 50%) 0%, transparent 70%)' }}
        animate={{
          scale: [1.1, 1, 1.1],
          y: [0, -40, 0],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="relative z-10 w-full max-w-[1400px] mx-auto px-6 lg:px-12">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          {/* Left: Content */}
          <motion.div
            style={{ y: contentY }}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="order-2 lg:order-1"
          >
            {/* Logo badge */}
            <motion.div variants={fadeUpVariants} className="mb-8">
              <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm">
                <Image
                  src="/logos/thotnet-core-white-only.svg"
                  alt="ThotNet Core"
                  width={24}
                  height={24}
                  className="drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]"
                />
                <span className="text-sm font-medium text-white/80 tracking-wide">
                  ThotNet Core
                </span>
              </div>
            </motion.div>

            {/* Headline - Brutalist style */}
            <motion.h1
              variants={slideLeftVariants}
              className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-black leading-[0.95] tracking-tight mb-6"
            >
              <span className="block text-white">{headline.split(' ').slice(0, 2).join(' ')}</span>
              <span className="block bg-gradient-to-r from-primary via-amber-400 to-primary bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
                {headline.split(' ').slice(2).join(' ')}
              </span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              variants={fadeUpVariants}
              className="text-lg sm:text-xl text-white/60 max-w-xl mb-10 leading-relaxed font-light"
            >
              {subheadline}
            </motion.p>

            {/* Stats row */}
            <motion.div
              variants={fadeUpVariants}
              className="flex flex-wrap gap-8 mb-10"
            >
              <StatPill value={stats.sources} label={locale === 'en' ? 'AI Sources' : 'Fuentes IA'} />
              <StatPill 
                value={stats.freshnessMinutes} 
                label={locale === 'en' ? 'Min Fresh' : 'Min Frescura'} 
                suffix="m"
              />
              <StatPill value={stats.courses} label={locale === 'en' ? 'Courses' : 'Cursos'} suffix="+" />
            </motion.div>

            {/* CTAs */}
            <motion.div
              variants={fadeUpVariants}
              className="flex flex-col sm:flex-row gap-4"
            >
              <Link href={primaryCta.href}>
                <motion.button
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="group relative px-8 py-4 text-base font-bold text-white overflow-hidden rounded-xl w-full sm:w-auto"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-primary to-blue-600 transition-transform group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/50 to-blue-500/50 opacity-0 group-hover:opacity-100 blur-xl transition-opacity" />
                  <span className="relative flex items-center justify-center gap-2">
                    {primaryCta.label}
                    <motion.span
                      animate={{ x: [0, 4, 0] }}
                      transition={{ duration: 1.2, repeat: Infinity }}
                    >
                      →
                    </motion.span>
                  </span>
                </motion.button>
              </Link>

              <Link href={secondaryCta.href}>
                <motion.button
                  whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.08)' }}
                  whileTap={{ scale: 0.98 }}
                  className="px-8 py-4 text-base font-semibold text-white/90 border border-white/15 rounded-xl backdrop-blur-sm transition-colors w-full sm:w-auto"
                >
                  {secondaryCta.label}
                </motion.button>
              </Link>
            </motion.div>
          </motion.div>

          {/* Right: 3D Orb (yinger.dev style - single focus element) */}
          <motion.div
            style={{ scale: orbScale, opacity: orbOpacity }}
            className="order-1 lg:order-2 flex justify-center lg:justify-end"
          >
            <ThotNetOrb
              metrics={{
                sources: stats.sources,
                articles: 1250,
                bilingual: true,
              }}
              orbitTopics={['GPT-5', 'Claude 4', 'Gemini', 'LLaMA', 'Agents', 'RAG']}
              interactive
            />
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-5 h-9 border-2 border-white/20 rounded-full flex justify-center p-1"
        >
          <motion.div
            animate={{ y: [0, 10, 0], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-1 h-2 bg-white/50 rounded-full"
          />
        </motion.div>
      </motion.div>

      <style jsx global>{`
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient {
          animation: gradient 4s ease infinite;
        }
      `}</style>
    </section>
  );
}

// Stat pill component
function StatPill({ 
  value, 
  label, 
  suffix = '' 
}: { 
  value: number; 
  label: string; 
  suffix?: string;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-3xl sm:text-4xl font-black text-white tabular-nums">
        {value}{suffix}
      </span>
      <span className="text-xs uppercase tracking-widest text-white/40 font-medium">
        {label}
      </span>
    </div>
  );
}
