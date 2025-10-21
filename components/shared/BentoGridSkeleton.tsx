"use client";

import { motion } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      delayChildren: 0.1,
      staggerChildren: 0.08
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 }
  }
};

function BentoCardSkeleton({ 
  colSpan = 1, 
  rowSpan = 1 
}: { 
  colSpan?: 1 | 2 | 3; 
  rowSpan?: 1 | 2;
}) {
  const colSpanClass = {
    1: 'md:col-span-1',
    2: 'md:col-span-2',
    3: 'md:col-span-3'
  }[colSpan];

  const rowSpanClass = {
    1: 'md:row-span-1',
    2: 'md:row-span-2'
  }[rowSpan];

  return (
    <motion.div
      variants={itemVariants}
      className={`glass group relative overflow-hidden rounded-3xl p-8 ${colSpanClass} ${rowSpanClass}`}
    >
      {/* Icon skeleton */}
      <div className="skeleton-shimmer mb-6 h-14 w-14 rounded-2xl" />

      {/* Title skeleton */}
      <div className="skeleton-shimmer mb-4 h-8 w-3/4 rounded-lg" />

      {/* Description skeleton */}
      <div className="space-y-2">
        <div className="skeleton-shimmer h-4 w-full rounded" />
        <div className="skeleton-shimmer h-4 w-5/6 rounded" />
        {rowSpan === 2 && (
          <>
            <div className="skeleton-shimmer h-4 w-4/6 rounded" />
            <div className="skeleton-shimmer h-4 w-full rounded" />
          </>
        )}
      </div>

      {/* Badges for larger cards */}
      {colSpan === 2 && rowSpan === 2 && (
        <div className="mt-6 flex flex-wrap gap-2">
          <div className="skeleton-shimmer h-6 w-24 rounded-full" />
          <div className="skeleton-shimmer h-6 w-20 rounded-full" />
          <div className="skeleton-shimmer h-6 w-16 rounded-full" />
        </div>
      )}
    </motion.div>
  );
}

export function BentoGridSkeleton() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid auto-rows-[minmax(200px,auto)] grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
    >
      {/* Large card - News (2x2) */}
      <BentoCardSkeleton colSpan={2} rowSpan={2} />

      {/* Courses (1x1) */}
      <BentoCardSkeleton colSpan={1} rowSpan={1} />

      {/* Learning (1x1) */}
      <BentoCardSkeleton colSpan={1} rowSpan={1} />

      {/* Knowledge Graph (2x1) */}
      <BentoCardSkeleton colSpan={2} rowSpan={1} />

      {/* Trending (1x1) */}
      <BentoCardSkeleton colSpan={1} rowSpan={1} />
    </motion.div>
  );
}
