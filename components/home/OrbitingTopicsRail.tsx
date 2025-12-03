'use client';

import { motion, useReducedMotion } from 'framer-motion';
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
 * OrbitingTopicsRail - Orbital chips for trending topics
 * - Animated orbiting motion on desktop
 * - Static grid fallback on mobile and reduced-motion
 * Reference: yinger.dev orbital elements
 */
export function OrbitingTopicsRail({ topics, locale, reducedMotion: reducedMotionProp }: OrbitingTopicsRailProps) {
  const prefersReducedMotion = useReducedMotion();
  const shouldReduceMotion = reducedMotionProp || prefersReducedMotion;

  return (
    <section className="relative py-16 lg:py-24 overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        {/* Header */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex items-center justify-center gap-3 mb-3"
          >
            <span className="text-xs uppercase tracking-[0.2em] text-primary/80 font-semibold">
              {locale === 'en' ? 'Trending Now' : 'Tendencias'}
            </span>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-2xl sm:text-3xl lg:text-4xl font-black text-white"
          >
            {locale === 'en' ? 'Explore Topics' : 'Explora Temas'}
          </motion.h2>
        </div>

        {/* Orbital/Grid view */}
        {shouldReduceMotion ? (
          <StaticGrid topics={topics} />
        ) : (
          <>
            {/* Desktop: Orbital layout */}
            <div className="hidden lg:block">
              <OrbitalLayout topics={topics} />
            </div>
            {/* Mobile: Static grid */}
            <div className="lg:hidden">
              <StaticGrid topics={topics} />
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function OrbitalLayout({ topics }: { topics: Topic[] }) {
  const innerTopics = topics.slice(0, 4);
  const outerTopics = topics.slice(4, 10);

  return (
    <div className="relative h-[500px] flex items-center justify-center">
      {/* Center core */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
        className="absolute w-24 h-24 rounded-full bg-gradient-to-br from-primary/30 to-amber-500/20 blur-2xl"
      />
      <div className="absolute w-16 h-16 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
        <span className="text-3xl">🧠</span>
      </div>

      {/* Inner orbit */}
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
        className="absolute w-[280px] h-[280px] rounded-full border border-dashed border-white/10"
      >
        {innerTopics.map((topic, i) => {
          const angle = (i / innerTopics.length) * Math.PI * 2;
          const x = Math.cos(angle) * 140;
          const y = Math.sin(angle) * 140;

          return (
            <motion.div
              key={topic.slug}
              animate={{ rotate: 360 }}
              transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
              }}
            >
              <TopicChip topic={topic} size="md" />
            </motion.div>
          );
        })}
      </motion.div>

      {/* Outer orbit */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
        className="absolute w-[450px] h-[450px] rounded-full border border-dashed border-white/5"
      >
        {outerTopics.map((topic, i) => {
          const angle = (i / outerTopics.length) * Math.PI * 2 + 0.3;
          const x = Math.cos(angle) * 225;
          const y = Math.sin(angle) * 225;

          return (
            <motion.div
              key={topic.slug}
              animate={{ rotate: -360 }}
              transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
              }}
            >
              <TopicChip topic={topic} size="sm" />
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}

function StaticGrid({ topics }: { topics: Topic[] }) {
  return (
    <div className="flex flex-wrap justify-center gap-3">
      {topics.map((topic, i) => (
        <motion.div
          key={topic.slug}
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.05 }}
        >
          <TopicChip topic={topic} size="md" />
        </motion.div>
      ))}
    </div>
  );
}

function TopicChip({ topic, size }: { topic: Topic; size: 'sm' | 'md' }) {
  const isHot = topic.deltaArticles >= 5;
  const isRising = topic.deltaArticles >= 2;

  return (
    <Link href={`/news?topic=${topic.slug}`}>
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`
          group relative cursor-pointer
          ${size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'}
          rounded-full font-semibold
          border backdrop-blur-sm
          ${isHot 
            ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' 
            : isRising 
              ? 'bg-primary/20 border-primary/40 text-primary' 
              : 'bg-white/5 border-white/10 text-white/70'
          }
          hover:bg-white/10 hover:border-white/20 hover:text-white
          transition-all duration-200
        `}
      >
        <span className="flex items-center gap-2">
          {topic.label}
          {topic.deltaArticles > 0 && (
            <span className={`
              text-[10px] font-bold
              ${isHot ? 'text-amber-500' : isRising ? 'text-primary' : 'text-white/40'}
            `}>
              +{topic.deltaArticles}
            </span>
          )}
          {isHot && (
            <span className="text-[10px]">🔥</span>
          )}
        </span>

        {/* Glow on hover */}
        <div className="absolute -inset-1 rounded-full bg-primary/20 opacity-0 group-hover:opacity-100 blur-md transition-opacity pointer-events-none" />
      </motion.div>
    </Link>
  );
}
