"use client";

import { motion } from 'framer-motion';

export function CourseCardSkeleton() {
  return (
    <div className="glass group relative overflow-hidden rounded-3xl p-6 shadow-xl">
      {/* Header skeleton */}
      <div className="mb-4 flex items-start justify-between">
        <div className="skeleton-shimmer h-6 w-24 rounded-full" />
        <div className="skeleton-shimmer h-8 w-8 rounded-full" />
      </div>

      {/* Title skeleton */}
      <div className="skeleton-shimmer mb-3 h-8 w-3/4 rounded-lg" />

      {/* Description skeleton */}
      <div className="mb-4 space-y-2">
        <div className="skeleton-shimmer h-4 w-full rounded" />
        <div className="skeleton-shimmer h-4 w-5/6 rounded" />
        <div className="skeleton-shimmer h-4 w-4/6 rounded" />
      </div>

      {/* Meta info skeleton */}
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="skeleton-shimmer h-6 w-20 rounded-full" />
        <div className="skeleton-shimmer h-6 w-16 rounded-full" />
        <div className="skeleton-shimmer h-6 w-24 rounded-full" />
      </div>

      {/* Progress bar skeleton */}
      <div className="mb-4">
        <div className="skeleton-shimmer h-2 w-full rounded-full" />
      </div>

      {/* Button skeleton */}
      <div className="skeleton-shimmer h-12 w-full rounded-xl" />
    </div>
  );
}

export function CourseGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
        >
          <CourseCardSkeleton />
        </motion.div>
      ))}
    </div>
  );
}
