'use client';

import { motion } from 'framer-motion';
import { Link } from '@/i18n';

interface FooterCTAProps {
  title: string;
  subtitle: string;
  primaryCta: {
    label: string;
    href: string;
  };
  secondaryCta?: {
    label: string;
    href: string;
  };
  locale: 'en' | 'es';
}

/**
 * FooterCTA - Final call-to-action section before footer
 * Big bold typography with gradient background
 */
export function FooterCTA({ title, subtitle, primaryCta, secondaryCta, locale }: FooterCTAProps) {
  return (
    <section className="relative py-24 lg:py-32 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/10 to-primary/5" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/20 rounded-full blur-[120px]" />
      </div>

      {/* Grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      <div className="max-w-[1000px] mx-auto px-6 lg:px-12 text-center relative">
        {/* Title */}
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black text-white leading-[1.1]"
        >
          {title}
        </motion.h2>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="mt-6 text-lg lg:text-xl text-white/60 max-w-xl mx-auto"
        >
          {subtitle}
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          {/* Primary CTA */}
          <Link href={primaryCta.href}>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="relative px-8 py-4 rounded-full bg-primary text-white font-bold text-lg overflow-hidden group"
            >
              <span className="relative z-10">{primaryCta.label}</span>
              
              {/* Shine effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full"
                animate={{ translateX: ['0%', '200%'] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              />
            </motion.button>
          </Link>

          {/* Secondary CTA */}
          {secondaryCta && (
            <Link href={secondaryCta.href}>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="px-8 py-4 rounded-full bg-white/5 border border-white/10 text-white font-semibold hover:bg-white/10 transition-colors"
              >
                {secondaryCta.label}
              </motion.button>
            </Link>
          )}
        </motion.div>

        {/* Trust indicators */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mt-12 flex items-center justify-center gap-8 text-sm text-white/30"
        >
          <span className="flex items-center gap-2">
            <span className="text-green-400">✓</span>
            {locale === 'en' ? 'Free forever' : 'Gratis siempre'}
          </span>
          <span className="flex items-center gap-2">
            <span className="text-green-400">✓</span>
            {locale === 'en' ? 'No credit card' : 'Sin tarjeta'}
          </span>
          <span className="flex items-center gap-2">
            <span className="text-green-400">✓</span>
            {locale === 'en' ? 'Start instantly' : 'Comienza al instante'}
          </span>
        </motion.div>
      </div>
    </section>
  );
}
