'use client';

import { motion } from 'framer-motion';
import { Link } from '@/i18n';
import { ArrowRight } from 'lucide-react';

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
 * FooterCTA - Brutalist final call-to-action section
 * - Massive typography
 * - Minimal monochrome design
 */
export function FooterCTA({ title, subtitle, primaryCta, secondaryCta, locale }: FooterCTAProps) {
  return (
    <section className="py-32 border-t border-[#1F1F1F] relative z-20 bg-[#020309]">
      <div className="max-w-[1000px] mx-auto px-6 lg:px-12 relative z-10">
        {/* Brutalist Title */}
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-4xl sm:text-5xl lg:text-7xl font-bold text-[#EAEAEA] leading-[1.1] tracking-tight"
        >
          {title}
        </motion.h2>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="mt-6 text-lg lg:text-xl text-[#888888] max-w-xl font-mono"
        >
          {subtitle}
        </motion.p>

        {/* CTAs - Brutalist buttons */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="mt-12 flex flex-col sm:flex-row items-start gap-4 relative z-10"
        >
          {/* Primary CTA */}
          <Link href={primaryCta.href} className="inline-block">
            <motion.span
              whileHover={{ x: 5 }}
              whileTap={{ scale: 0.98 }}
              className="group inline-flex items-center gap-3 px-6 py-3 bg-[#EAEAEA] text-[#0A0A0A] font-mono font-semibold text-xs tracking-wider uppercase transition-all duration-300 hover:bg-white"
            >
              <span>{primaryCta.label}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform shrink-0" />
            </motion.span>
          </Link>

          {/* Secondary CTA */}
          {secondaryCta && (
            <Link href={secondaryCta.href} className="inline-block">
              <motion.span
                whileHover={{ borderColor: '#EAEAEA' }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center justify-center px-6 py-3 border border-[#333333] text-[#EAEAEA] font-mono text-xs tracking-wider uppercase hover:bg-[#1F1F1F] transition-all duration-300"
              >
                {secondaryCta.label}
              </motion.span>
            </Link>
          )}
        </motion.div>

        {/* Trust indicators - Brutalist minimal */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mt-16 flex flex-wrap items-center gap-8 text-xs font-mono text-[#666666] tracking-wider uppercase"
        >
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-[#EAEAEA]" />
            {locale === 'en' ? 'Free forever' : 'Gratis siempre'}
          </span>
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-[#EAEAEA]" />
            {locale === 'en' ? 'No credit card' : 'Sin tarjeta'}
          </span>
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-[#EAEAEA]" />
            {locale === 'en' ? 'Start instantly' : 'Comienza al instante'}
          </span>
        </motion.div>
      </div>
    </section>
  );
}
