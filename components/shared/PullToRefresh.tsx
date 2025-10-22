"use client";

import { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePullToRefresh } from '@/lib/hooks/useSwipeGesture';

interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => void | Promise<void>;
  threshold?: number;
}

export function PullToRefresh({ 
  children, 
  onRefresh,
  threshold = 80 
}: PullToRefreshProps) {
  const { isPulling, pullDistance, isRefreshing } = usePullToRefresh(onRefresh, threshold);

  const progress = Math.min((pullDistance / threshold) * 100, 100);
  const rotation = (pullDistance / threshold) * 360;

  return (
    <div className="relative">
      {/* Pull indicator */}
      <AnimatePresence>
        {(isPulling || isRefreshing) && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed left-1/2 top-4 z-50 -translate-x-1/2"
          >
            <div className="glass flex items-center gap-3 rounded-full border-white/10 px-6 py-3 shadow-2xl">
              {/* Spinner/Icon */}
              <motion.div
                animate={{ rotate: isRefreshing ? 360 : rotation }}
                transition={isRefreshing ? { 
                  duration: 1, 
                  repeat: Infinity, 
                  ease: 'linear' 
                } : { duration: 0 }}
                className="relative h-6 w-6"
              >
                <svg
                  className="h-full w-full text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                
                {/* Progress ring */}
                {!isRefreshing && (
                  <svg
                    className="absolute inset-0 h-full w-full -rotate-90"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="none"
                      className="text-primary/30"
                    />
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 10}`}
                      strokeDashoffset={`${2 * Math.PI * 10 * (1 - progress / 100)}`}
                      className="text-primary transition-all duration-150"
                    />
                  </svg>
                )}
              </motion.div>

              {/* Text */}
              <span className="text-sm font-medium text-white">
                {isRefreshing 
                  ? 'Refreshing...' 
                  : progress >= 100 
                    ? 'Release to refresh' 
                    : 'Pull to refresh'}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content with transform on pull */}
      <motion.div
        style={{
          transform: isPulling && !isRefreshing
            ? `translateY(${Math.min(pullDistance * 0.5, 60)}px)`
            : undefined
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {children}
      </motion.div>
    </div>
  );
}
