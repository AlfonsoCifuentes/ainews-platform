// components/shared/BentoGrid.tsx
'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

interface BentoGridProps {
  children: ReactNode;
  className?: string;
}

interface BentoCardProps {
  children: ReactNode;
  className?: string;
  colSpan?: 1 | 2 | 3;
  rowSpan?: 1 | 2 | 3;
}

export function BentoGrid({ children, className }: BentoGridProps) {
  return (
    <div
      className={cn(
        'grid auto-rows-[minmax(200px,auto)] grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3',
        className
      )}
    >
      {children}
    </div>
  );
}

export function BentoCard({ children, className, colSpan = 1, rowSpan = 1 }: BentoCardProps) {
  const colSpanClass = {
    1: 'md:col-span-1',
    2: 'md:col-span-2',
    3: 'md:col-span-3',
  }[colSpan];

  const rowSpanClass = {
    1: 'md:row-span-1',
    2: 'md:row-span-2',
    3: 'md:row-span-3',
  }[rowSpan];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      whileHover={{ scale: 1.02, y: -4 }}
      className={cn(
        'group relative overflow-hidden rounded-3xl backdrop-blur-xl bg-white/5 dark:bg-black/20 border border-white/10 dark:border-white/5',
        'shadow-[0_25px_65px_-35px_rgba(14,15,45,0.75)]',
        'transition-all duration-500',
        'hover:border-white/20 hover:bg-white/10 hover:shadow-[0_45px_120px_-45px_rgba(104,58,255,0.4)]',
        colSpanClass,
        rowSpanClass,
        className
      )}
    >
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-cyan-500/10 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      
      {/* Content */}
      <div className="relative h-full p-6 md:p-8">{children}</div>
    </motion.div>
  );
}

export function BentoIcon({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl',
        'bg-gradient-to-br from-primary/20 to-cyan-500/20',
        'border border-white/10 backdrop-blur-sm',
        'text-3xl',
        className
      )}
    >
      {children}
    </div>
  );
}

export function BentoTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h3 className={cn('text-2xl font-bold text-white mb-3', className)}>
      {children}
    </h3>
  );
}

export function BentoDescription({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn('text-base text-white/70 leading-relaxed', className)}>
      {children}
    </p>
  );
}
