"use client";

import { motion } from 'framer-motion';
import { Link } from '@/i18n';
import { Badge } from '@/components/shared/Badges';

interface TrendingTopic {
  topic: string;
  count: number;
  momentum: number;
}

interface TrendingGridProps {
  topics: TrendingTopic[];
  noResults: string;
}

export function TrendingGrid({ topics, noResults }: TrendingGridProps) {
  if (topics.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass rounded-3xl border border-white/10 p-12 text-center"
      >
        <div className="mb-4 text-6xl">📊</div>
        <p className="text-lg text-muted-foreground">{noResults}</p>
      </motion.div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {topics.map((topic, index) => (
        <motion.div
          key={topic.topic}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05, duration: 0.4 }}
          whileHover={{ scale: 1.03, y: -5 }}
        >
          <Link
            href={`/search?q=${encodeURIComponent(topic.topic)}`}
            className="glass group block cursor-pointer rounded-3xl border border-white/10 p-6 transition-all hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/10"
          >
            <div className="mb-4 flex items-start justify-between">
              <Badge variant="gradient" size="sm">
                #{index + 1}
              </Badge>
              <span className="text-sm font-medium text-primary">
                {topic.count} mentions
              </span>
            </div>

            <h3 className="mb-3 text-xl font-bold capitalize transition-colors group-hover:text-primary">
              {topic.topic}
            </h3>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                📈 {topic.momentum.toFixed(2)} mentions/hr
              </span>
            </div>

            {/* Momentum Bar */}
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (topic.momentum / 10) * 100)}%` }}
                transition={{ delay: index * 0.05 + 0.2, duration: 0.8 }}
                className="h-full bg-gradient-to-r from-primary to-accent"
              />
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
