'use client';

import { motion, useReducedMotion } from 'framer-motion';
import Link from 'next/link';

export interface TrendingItem {
  topic: string;
  count: number;
  momentum: number;
}

type TrendingBoardProps = {
  topics: TrendingItem[];
  locale: string;
};

export function TrendingBoard({ topics, locale }: TrendingBoardProps) {
  const reduce = useReducedMotion();
  const isEs = locale === 'es';

  if (topics.length === 0) {
    return (
      <p className="border border-white/10 bg-white/[0.015] px-6 py-20 text-center font-mono text-sm uppercase tracking-[0.2em] text-white/40">
        {isEs ? 'Sin tendencias por ahora. Vuelve pronto.' : 'No trends right now. Check back soon.'}
      </p>
    );
  }

  const maxMomentum = Math.max(...topics.map((t) => t.momentum || 0), 1);

  return (
    <ol className="border-t border-white/10">
      {topics.map((topic, index) => {
        const pct = Math.max(4, Math.round(((topic.momentum || 0) / maxMomentum) * 100));
        return (
          <motion.li
            key={topic.topic}
            initial={reduce ? false : { opacity: 0, y: 16 }}
            whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.4, delay: Math.min(index * 0.04, 0.4) }}
          >
            <Link
              href={`/${locale}/search?q=${encodeURIComponent(topic.topic)}`}
              className="group grid grid-cols-[auto_1fr_auto] items-center gap-5 border-b border-white/10 py-6 transition-colors hover:bg-white/[0.02]"
            >
              <span className="font-mono text-2xl tabular-nums text-white/25 group-hover:text-signal md:text-3xl">
                {String(index + 1).padStart(2, '0')}
              </span>

              <div className="min-w-0">
                <h3 className="truncate text-xl font-bold capitalize tracking-tight transition-colors group-hover:text-signal-soft md:text-2xl">
                  {topic.topic}
                </h3>
                <div className="mt-2 h-px w-full bg-white/10">
                  <div className="h-px bg-signal" style={{ width: `${pct}%` }} />
                </div>
              </div>

              <div className="text-right">
                <p className="font-mono text-sm tabular-nums text-white/80">{topic.count}</p>
                <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/40">
                  {isEs ? 'menciones' : 'mentions'}
                </p>
              </div>
            </Link>
          </motion.li>
        );
      })}
    </ol>
  );
}
