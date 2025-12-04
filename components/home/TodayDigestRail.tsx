'use client';

import { useRef } from 'react';
import { motion } from 'framer-motion';
import { Link } from '@/i18n';
import Image from 'next/image';
import { Clock, RefreshCw } from 'lucide-react';

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

const isDataUrl = (value?: string): boolean => Boolean(value && value.startsWith('data:image'));

/**
 * TodayDigestRail - Brutalist horizontal carousel
 * - Grayscale images with hover effects
 * - Section numbering (01 — LATEST NEWS)
 * - Mono tracking-widest headers
 */
export function TodayDigestRail({ articles, locale }: TodayDigestRailProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollLeft = () => {
    scrollRef.current?.scrollBy({ left: -420, behavior: 'smooth' });
  };

  const scrollRight = () => {
    scrollRef.current?.scrollBy({ left: 420, behavior: 'smooth' });
  };

  return (
    <section className="py-24 border-t border-[#1F1F1F] relative z-10">
      {/* Section header */}
      <div className="px-6 md:px-12 mb-12 flex justify-between items-end">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <h2 className="text-sm font-mono tracking-widest text-[#888888]">
              01 — {locale === 'en' ? 'LATEST NEWS' : 'ÚLTIMAS NOTICIAS'}
            </h2>
            <button
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
              title={locale === 'en' ? 'Curate new stories with AI' : 'Curar nuevas historias con IA'}
            >
              <RefreshCw size={14} className="text-[#888888]" />
            </button>
          </div>
          <div className="h-px w-24 bg-white/50" />
        </div>
        <div className="hidden md:flex gap-2">
          <button
            onClick={scrollLeft}
            className="w-10 h-10 border border-[#1F1F1F] flex items-center justify-center hover:bg-white hover:text-black transition-colors text-white"
          >
            ←
          </button>
          <button
            onClick={scrollRight}
            className="w-10 h-10 border border-[#1F1F1F] flex items-center justify-center hover:bg-white hover:text-black transition-colors text-white"
          >
            →
          </button>
        </div>
      </div>

      {/* Horizontal scroll container */}
      <div
        ref={scrollRef}
        className="overflow-x-auto pb-12 scrollbar-hide px-6 md:px-12"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <div className="flex gap-6 w-max">
          {articles.map((article, i) => (
            <motion.div
              key={article.id}
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -10 }}
              className="group relative w-[300px] md:w-[400px] h-[500px] bg-[#0A0A0A] border border-[#1F1F1F] flex flex-col justify-between overflow-hidden cursor-pointer"
            >
              <Link href={article.href} className="absolute inset-0 z-20" />

              {/* Image Layer */}
              <div className="absolute inset-0 z-0">
                {article.image ? (
                  <Image
                    src={article.image}
                    alt={article.title}
                    fill
                    className="w-full h-full object-cover opacity-60 group-hover:opacity-40 group-hover:scale-105 transition-all duration-700 grayscale"
                    sizes="(max-width: 768px) 280px, 320px"
                    unoptimized={isDataUrl(article.image)}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#1F1F1F] to-[#0A0A0A]" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
              </div>

              {/* Content Layer */}
              <div className="relative z-10 p-8 h-full flex flex-col justify-end">
                <div className="mb-4">
                  <div className="flex gap-2 mb-4 flex-wrap">
                    <span className="px-2 py-1 text-xs font-mono border border-white/20 text-white/70 bg-black/50 backdrop-blur-md">
                      {article.category}
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-white leading-tight mb-2 group-hover:underline decoration-1 underline-offset-4">
                    {article.title}
                  </h3>
                </div>

                <div className="flex justify-between items-center text-xs font-mono text-[#888888] border-t border-white/10 pt-4">
                  <span className="flex items-center gap-2">
                    <Clock size={12} /> {article.relativeTime}
                  </span>
                  <span>{locale === 'en' ? '3 min read' : '3 min lectura'}</span>
                </div>
              </div>

              {/* Hover Glow Effect */}
              <div className="absolute inset-0 border-2 border-white/0 group-hover:border-white/20 transition-all duration-300 pointer-events-none z-10" />
            </motion.div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </section>
  );
}
