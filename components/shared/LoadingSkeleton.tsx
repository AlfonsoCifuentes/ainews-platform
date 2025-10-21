/**
 * Premium Loading Skeleton with Kinetic Animations
 * Glassmorphism + shimmer effects
 */

'use client';

import { motion } from 'framer-motion';

interface LoadingSkeletonProps {
  variant?: 'article' | 'card' | 'list' | 'graph' | 'dashboard';
  count?: number;
}

export default function LoadingSkeleton({
  variant = 'card',
  count = 1,
}: LoadingSkeletonProps) {
  const items = Array.from({ length: count }, (_, i) => i);

  return (
    <div className="space-y-6">
      {items.map((i) => (
        <SkeletonItem key={i} variant={variant} index={i} />
      ))}
    </div>
  );
}

function SkeletonItem({
  variant,
  index,
}: {
  variant: LoadingSkeletonProps['variant'];
  index: number;
}) {
  const baseClasses =
    'relative overflow-hidden rounded-3xl backdrop-blur-xl bg-white/5 border border-white/10';

  const shimmerClasses =
    'absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent';

  if (variant === 'article') {
    return (
      <motion.div
        className={`${baseClasses} p-0`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
      >
        {/* Shimmer effect */}
        <motion.div
          className={shimmerClasses}
          animate={{ x: ['0%', '200%'] }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: index * 0.2,
          }}
        />

        {/* Image skeleton */}
        <div className="aspect-video bg-white/10" />

        {/* Content skeleton */}
        <div className="p-6 space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <div className="h-7 bg-white/10 rounded-lg w-3/4" />
            <div className="h-7 bg-white/10 rounded-lg w-1/2" />
          </div>

          {/* Summary lines */}
          <div className="space-y-2">
            <div className="h-4 bg-white/10 rounded w-full" />
            <div className="h-4 bg-white/10 rounded w-5/6" />
            <div className="h-4 bg-white/10 rounded w-4/6" />
          </div>

          {/* Meta row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-4 bg-white/10 rounded w-20" />
              <div className="h-4 bg-white/10 rounded w-16" />
            </div>
            <div className="flex gap-2">
              <div className="h-8 w-8 bg-white/10 rounded-full" />
              <div className="h-8 w-8 bg-white/10 rounded-full" />
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  if (variant === 'card') {
    return (
      <motion.div
        className={`${baseClasses} p-6 h-64`}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: index * 0.1 }}
      >
        <motion.div
          className={shimmerClasses}
          animate={{ x: ['0%', '200%'] }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: index * 0.2,
          }}
        />

        <div className="space-y-4">
          <div className="h-6 bg-white/10 rounded w-24" />
          <div className="h-8 bg-white/10 rounded w-3/4" />
          <div className="space-y-2">
            <div className="h-4 bg-white/10 rounded w-full" />
            <div className="h-4 bg-white/10 rounded w-5/6" />
            <div className="h-4 bg-white/10 rounded w-4/6" />
          </div>
          <div className="flex gap-2 pt-4">
            <div className="h-6 bg-white/10 rounded-full w-16" />
            <div className="h-6 bg-white/10 rounded-full w-16" />
          </div>
        </div>
      </motion.div>
    );
  }

  if (variant === 'list') {
    return (
      <motion.div
        className={`${baseClasses} p-4 flex items-center gap-4`}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.05 }}
      >
        <motion.div
          className={shimmerClasses}
          animate={{ x: ['0%', '200%'] }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: index * 0.1,
          }}
        />

        <div className="h-12 w-12 bg-white/10 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-5 bg-white/10 rounded w-3/4" />
          <div className="h-4 bg-white/10 rounded w-1/2" />
        </div>
        <div className="h-8 w-20 bg-white/10 rounded" />
      </motion.div>
    );
  }

  if (variant === 'graph') {
    return (
      <motion.div
        className={`${baseClasses} p-6 h-96`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: index * 0.1 }}
      >
        <motion.div
          className={shimmerClasses}
          animate={{ x: ['0%', '200%'] }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* Graph nodes skeleton */}
        <div className="relative h-full">
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute h-16 w-16 bg-white/10 rounded-full"
              style={{
                left: `${Math.random() * 80 + 10}%`,
                top: `${Math.random() * 80 + 10}%`,
              }}
              animate={{
                scale: [1, 1.1, 1],
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            />
          ))}

          {/* Graph edges skeleton */}
          <svg className="absolute inset-0 w-full h-full opacity-20">
            {[...Array(6)].map((_, i) => (
              <motion.line
                key={i}
                x1={`${Math.random() * 80 + 10}%`}
                y1={`${Math.random() * 80 + 10}%`}
                x2={`${Math.random() * 80 + 10}%`}
                y2={`${Math.random() * 80 + 10}%`}
                stroke="currentColor"
                strokeWidth="2"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            ))}
          </svg>
        </div>
      </motion.div>
    );
  }

  if (variant === 'dashboard') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={i}
            className={`${baseClasses} p-6`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <motion.div
              className={shimmerClasses}
              animate={{ x: ['0%', '200%'] }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: i * 0.15,
              }}
            />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="h-4 bg-white/10 rounded w-24" />
                <div className="h-8 w-8 bg-white/10 rounded-full" />
              </div>
              <div className="h-10 bg-white/10 rounded w-20" />
              <div className="h-3 bg-white/10 rounded w-32" />
            </div>
          </motion.div>
        ))}
      </div>
    );
  }

  return null;
}

/**
 * Inline skeleton for text content
 */
export function TextSkeleton({
  lines = 3,
  className = '',
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {[...Array(lines)].map((_, i) => (
        <motion.div
          key={i}
          className="h-4 bg-white/10 rounded relative overflow-hidden"
          style={{
            width: i === lines - 1 ? '60%' : '100%',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.1 }}
        >
          <motion.div
            className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent"
            animate={{ x: ['0%', '200%'] }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: i * 0.1,
            }}
          />
        </motion.div>
      ))}
    </div>
  );
}

/**
 * Circle skeleton for avatars/icons
 */
export function CircleSkeleton({
  size = 'md',
  className = '',
}: {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
    xl: 'h-24 w-24',
  };

  return (
    <motion.div
      className={`${sizeClasses[size]} bg-white/10 rounded-full relative overflow-hidden ${className}`}
      animate={{
        scale: [1, 1.05, 1],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
      }}
    >
      <motion.div
        className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent"
        animate={{ x: ['0%', '200%'] }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    </motion.div>
  );
}
