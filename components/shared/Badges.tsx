"use client";

import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import { useHapticFeedback } from '@/lib/hooks/useSwipeGesture';

/**
 * Badge - Decorative badge component
 */
interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  className?: string;
}

export function Badge({ 
  children, 
  variant = 'default', 
  size = 'md',
  animated = false,
  className = '' 
}: BadgeProps) {
  const variants = {
    default: 'bg-muted text-muted-foreground',
    primary: 'bg-primary/10 text-primary border-primary/20',
    success: 'bg-green-500/10 text-green-400 border-green-500/20',
    warning: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    error: 'bg-red-500/10 text-red-400 border-red-500/20',
    gradient: 'bg-gradient-to-r from-primary via-accent to-primary text-white'
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base'
  };

  const badge = (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </span>
  );

  if (animated) {
    return (
      <motion.span
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
      >
        {badge}
      </motion.span>
    );
  }

  return badge;
}

/**
 * Chip - Interactive chip with remove action
 */
interface ChipProps extends BadgeProps {
  onRemove?: () => void;
  icon?: ReactNode;
}

export function Chip({ 
  children, 
  variant = 'default', 
  size = 'md',
  onRemove,
  icon,
  className = '' 
}: ChipProps) {
  const haptic = useHapticFeedback();

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    haptic.light();
    onRemove?.();
  };

  const variants = {
    default: 'bg-muted text-muted-foreground hover:bg-muted/80',
    primary: 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/15',
    success: 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/15',
    warning: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20 hover:bg-yellow-500/15',
    error: 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/15',
    gradient: 'bg-gradient-to-r from-primary via-accent to-primary text-white hover:opacity-90'
  };

  const sizes = {
    sm: 'px-2 py-1 text-xs gap-1',
    md: 'px-3 py-1.5 text-sm gap-1.5',
    lg: 'px-4 py-2 text-base gap-2'
  };

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`inline-flex items-center rounded-full border font-medium transition-colors ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{children}</span>
      {onRemove && (
        <motion.button
          whileHover={{ scale: 1.2, rotate: 90 }}
          whileTap={{ scale: 0.8 }}
          onClick={handleRemove}
          className="ml-1 flex-shrink-0 rounded-full hover:bg-white/10"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </motion.button>
      )}
    </motion.span>
  );
}

/**
 * Dot Badge - Status indicator dot
 */
interface DotBadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  pulse?: boolean;
  label?: string;
  className?: string;
}

export function DotBadge({ 
  variant = 'default', 
  pulse = false, 
  label,
  className = '' 
}: DotBadgeProps) {
  const colors = {
    default: 'bg-gray-400',
    success: 'bg-green-400',
    warning: 'bg-yellow-400',
    error: 'bg-red-400',
    info: 'bg-blue-400'
  };

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className="relative flex h-2.5 w-2.5">
        {pulse && (
          <motion.span
            className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${colors[variant]}`}
            animate={{ scale: [1, 1.5, 1.5], opacity: [0.75, 0, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
        <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${colors[variant]}`} />
      </span>
      {label && <span className="text-sm font-medium">{label}</span>}
    </span>
  );
}

/**
 * Count Badge - Number badge (notifications, etc.)
 */
interface CountBadgeProps {
  count: number;
  max?: number;
  variant?: 'default' | 'primary' | 'error';
  pulse?: boolean;
  className?: string;
}

export function CountBadge({ 
  count, 
  max = 99, 
  variant = 'primary',
  pulse = false,
  className = '' 
}: CountBadgeProps) {
  const displayCount = count > max ? `${max}+` : count;
  
  const variants = {
    default: 'bg-muted text-muted-foreground',
    primary: 'bg-primary text-primary-foreground',
    error: 'bg-red-500 text-white'
  };

  const badge = (
    <span
      className={`inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-xs font-bold ${variants[variant]} ${className}`}
    >
      {displayCount}
    </span>
  );

  if (pulse) {
    return (
      <motion.span
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
      >
        {badge}
      </motion.span>
    );
  }

  return badge;
}

/**
 * Icon Badge - Badge with icon
 */
interface IconBadgeProps {
  icon: ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function IconBadge({ 
  icon, 
  variant = 'default', 
  size = 'md',
  className = '' 
}: IconBadgeProps) {
  const variants = {
    default: 'bg-muted text-muted-foreground',
    primary: 'bg-primary/10 text-primary',
    success: 'bg-green-500/10 text-green-400',
    warning: 'bg-yellow-500/10 text-yellow-400',
    error: 'bg-red-500/10 text-red-400'
  };

  const sizes = {
    sm: 'h-6 w-6 text-xs',
    md: 'h-8 w-8 text-sm',
    lg: 'h-10 w-10 text-base'
  };

  return (
    <motion.span
      whileHover={{ scale: 1.1, rotate: 5 }}
      whileTap={{ scale: 0.9 }}
      className={`inline-flex items-center justify-center rounded-full ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {icon}
    </motion.span>
  );
}

/**
 * Animated Badge Group - Staggered badge animation
 */
interface AnimatedBadgeGroupProps {
  badges: string[];
  variant?: BadgeProps['variant'];
  className?: string;
}

export function AnimatedBadgeGroup({ badges, variant = 'primary', className = '' }: AnimatedBadgeGroupProps) {
  const container = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, scale: 0.8, y: 10 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] }
    }
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      className={`flex flex-wrap gap-2 ${className}`}
    >
      {badges.map((badge, index) => (
        <motion.div key={index} variants={item}>
          <Badge variant={variant}>{badge}</Badge>
        </motion.div>
      ))}
    </motion.div>
  );
}

/**
 * Category Badge - Styled badge for categories
 */
interface CategoryBadgeProps {
  category: string;
  icon?: string;
  className?: string;
}

export function CategoryBadge({ category, icon, className = '' }: CategoryBadgeProps) {
  return (
    <motion.span
      whileHover={{ scale: 1.05, y: -2 }}
      whileTap={{ scale: 0.95 }}
      className={`glass inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold backdrop-blur-xl transition-all hover:border-white/30 hover:bg-white/10 ${className}`}
    >
      {icon && <span className="text-base">{icon}</span>}
      <span className="bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
        {category}
      </span>
    </motion.span>
  );
}
