'use client';

import { motion } from 'framer-motion';
import { Link } from '@/i18n';

interface Topic {
  slug: string;
  label: string;
  deltaArticles: number;
}

interface OrbitingTopicsRailProps {
  topics: Topic[];
  locale: 'en' | 'es';
  reducedMotion?: boolean;
}

/**
 * OrbitingTopicsRail - Brutalist trending topics section
 * - Horizontal scrolling tags with monospace styling
 * - Minimalist black & white aesthetic
 */
export function OrbitingTopicsRail({ topics, locale }: OrbitingTopicsRailProps) {
  return (
    <section className="py-20 border-t border-[#1F1F1F]">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        {/* Brutalist Header */}
        <motion.div
          initial={false}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12 opacity-0 translate-y-5 [.in-view_&]:opacity-100 [.in-view_&]:translate-y-0 transition-all duration-500"
        >
          <span className="font-mono text-xs tracking-widest text-[#888888] uppercase">
            04 — {locale === 'en' ? 'TRENDING' : 'TENDENCIAS'}
          </span>
          <h2 className="text-3xl lg:text-4xl font-bold text-[#EAEAEA] mt-2">
            {locale === 'en' ? 'Hot Topics' : 'Temas Populares'}
          </h2>
        </motion.div>

        {/* Topics Grid - Brutalist style */}
        <div className="flex flex-wrap gap-3">
          {topics.map((topic, i) => (
            <TopicTag 
              key={topic.slug} 
              topic={topic} 
              index={i}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function TopicTag({ 
  topic, 
  index
}: { 
  topic: Topic; 
  index: number;
}) {
  const isHot = topic.deltaArticles >= 5;
  const isRising = topic.deltaArticles >= 2;

  return (
    <Link href={`/news?topic=${topic.slug}`}>
      <motion.div
        initial={false}
        whileHover={{ y: -3, borderColor: '#EAEAEA' }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: index * 0.03 }}
        className={`
          group relative cursor-pointer px-5 py-2.5
          border font-mono text-sm transition-all duration-300
          ${isHot 
            ? 'bg-[#EAEAEA] text-[#0A0A0A] border-[#EAEAEA]' 
            : 'bg-transparent text-[#EAEAEA] border-[#333333] hover:bg-[#1F1F1F]'
          }
        `}
      >
        <span className="flex items-center gap-3">
          <span className="tracking-wide">{topic.label}</span>
          {topic.deltaArticles > 0 && (
            <span className={`
              text-[10px] font-bold tracking-wider
              ${isHot ? 'text-[#0A0A0A]/60' : 'text-[#888888]'}
            `}>
              +{topic.deltaArticles}
            </span>
          )}
          {isHot && (
            <span className="w-2 h-2 rounded-full bg-[#0A0A0A] animate-pulse" />
          )}
          {isRising && !isHot && (
            <span className="w-1.5 h-1.5 rounded-full bg-[#666666]" />
          )}
        </span>
      </motion.div>
    </Link>
  );
}
