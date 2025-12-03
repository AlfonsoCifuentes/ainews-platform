'use client';

import { useRef } from 'react';
import { motion } from 'framer-motion';
import { Link } from '@/i18n';
import Image from 'next/image';

interface DigestArticle {
  id: string;
  category: string;
  title: string;
  relativeTime: string;
  href: string;
  image?: string;
}

interface TodayDigestRailProps {
  articles: DigestArticle[];
  locale: 'en' | 'es';
}

/**
 * TodayDigestRail - Horizontal carousel with top 5-10 news
 * - Horizontal scroll snap
 * - Warm tags (amber)
 * - Hover tilt effect
 * mues.ai style: clean rails
 */
export function TodayDigestRail({ articles, locale }: TodayDigestRailProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollLeft = () => {
    scrollRef.current?.scrollBy({ left: -340, behavior: 'smooth' });
  };

  const scrollRight = () => {
    scrollRef.current?.scrollBy({ left: 340, behavior: 'smooth' });
  };

  return (
    <section className="relative py-16 lg:py-24">
      {/* Section header */}
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12 mb-8">
        <div className="flex items-end justify-between">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex items-center gap-3 mb-3"
            >
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-xs uppercase tracking-[0.2em] text-amber-500/80 font-semibold">
                {locale === 'en' ? 'Live Feed' : 'En Vivo'}
              </span>
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-3xl sm:text-4xl lg:text-5xl font-black text-white"
            >
              {locale === 'en' ? "Today's Digest" : 'Resumen de Hoy'}
            </motion.h2>
          </div>

          {/* Navigation arrows */}
          <div className="hidden sm:flex items-center gap-2">
            <button
              onClick={scrollLeft}
              className="w-10 h-10 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
              aria-label="Scroll left"
            >
              ←
            </button>
            <button
              onClick={scrollRight}
              className="w-10 h-10 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
              aria-label="Scroll right"
            >
              →
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal scroll container */}
      <div
        ref={scrollRef}
        className="flex gap-5 overflow-x-auto snap-x snap-mandatory scrollbar-hide px-6 lg:px-12 pb-4"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {/* Left spacer for centering */}
        <div className="flex-shrink-0 w-[max(0px,calc((100vw-1400px)/2))]" />

        {articles.map((article, i) => (
          <motion.div
            key={article.id}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            className="flex-shrink-0 snap-start"
          >
            <DigestCard article={article} index={i} />
          </motion.div>
        ))}

        {/* Right spacer */}
        <div className="flex-shrink-0 w-[max(0px,calc((100vw-1400px)/2))]" />
      </div>

      {/* Gradient fade edges */}
      <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-[#020309] to-transparent z-10" />
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[#020309] to-transparent z-10" />

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </section>
  );
}

function DigestCard({ article, index }: { article: DigestArticle; index: number }) {
  return (
    <Link href={article.href}>
      <motion.article
        whileHover={{ 
          y: -8, 
          rotateX: 2, 
          rotateY: -2,
          transition: { duration: 0.3 }
        }}
        className="relative w-[300px] sm:w-[320px] group cursor-pointer"
        style={{ perspective: 1000 }}
      >
        {/* Card */}
        <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-white/[0.02] backdrop-blur-sm">
          {/* Image */}
          <div className="relative h-44 overflow-hidden">
            {article.image ? (
              <Image
                src={article.image}
                alt={article.title}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-amber-500/10" />
            )}
            
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

            {/* Category tag - amber accent */}
            <div className="absolute top-3 left-3">
              <span className="px-3 py-1 text-[10px] uppercase tracking-wider font-bold bg-amber-500/90 text-black rounded-full">
                {article.category}
              </span>
            </div>

            {/* Index number */}
            <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 flex items-center justify-center">
              <span className="text-xs font-bold text-white/80">
                {String(index + 1).padStart(2, '0')}
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="p-5">
            <h3 className="text-base font-bold text-white leading-snug line-clamp-2 group-hover:text-primary transition-colors">
              {article.title}
            </h3>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-white/40 font-mono">
                {article.relativeTime}
              </span>
              <motion.span
                className="text-xs text-primary/80 font-semibold flex items-center gap-1"
                animate={{ x: [0, 3, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                Read →
              </motion.span>
            </div>
          </div>
        </div>

        {/* Glow effect on hover */}
        <div className="absolute -inset-px rounded-2xl bg-gradient-to-r from-primary/0 via-primary/20 to-amber-500/0 opacity-0 group-hover:opacity-100 blur-xl transition-opacity pointer-events-none" />
      </motion.article>
    </Link>
  );
}
