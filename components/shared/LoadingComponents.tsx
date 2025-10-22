"use client";

import { motion } from 'framer-motion';

/**
 * Spinner - Classic loading spinner
 */
interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  return (
    <motion.div
      className={`${sizes[size]} ${className}`}
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
    >
      <svg className="h-full w-full" viewBox="0 0 24 24" fill="none">
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </motion.div>
  );
}

/**
 * Pulse - Pulsing dot animation
 */
export function Pulse({ size = 'md', className = '' }: SpinnerProps) {
  const sizes = {
    sm: 'h-2 w-2',
    md: 'h-3 w-3',
    lg: 'h-4 w-4'
  };

  return (
    <div className={`relative ${sizes[size]} ${className}`}>
      <motion.div
        className="absolute inset-0 rounded-full bg-primary"
        animate={{
          scale: [1, 2, 2],
          opacity: [1, 0, 0]
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeOut'
        }}
      />
      <div className="absolute inset-0 rounded-full bg-primary" />
    </div>
  );
}

/**
 * Dots - Three dots animation
 */
export function Dots({ size = 'md', className = '' }: SpinnerProps) {
  const sizes = {
    sm: 'h-1.5 w-1.5',
    md: 'h-2 w-2',
    lg: 'h-3 w-3'
  };

  const dotVariants = {
    initial: { y: 0 },
    animate: {
      y: [-8, 0, -8],
      transition: {
        duration: 0.6,
        repeat: Infinity,
        ease: 'easeInOut'
      }
    }
  };

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className={`rounded-full bg-current ${sizes[size]}`}
          variants={dotVariants}
          initial="initial"
          animate="animate"
          transition={{ delay: i * 0.15 }}
        />
      ))}
    </div>
  );
}

/**
 * Progress Bar - Linear progress indicator
 */
interface ProgressBarProps {
  progress: number; // 0-100
  showLabel?: boolean;
  className?: string;
  variant?: 'primary' | 'gradient';
}

export function ProgressBar({ 
  progress, 
  showLabel = true, 
  className = '',
  variant = 'gradient'
}: ProgressBarProps) {
  const barClasses = {
    primary: 'bg-primary',
    gradient: 'bg-gradient-to-r from-primary via-purple-500 to-pink-500'
  };

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium">Loading</span>
          <span className="text-muted-foreground">{Math.round(progress)}%</span>
        </div>
      )}
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          className={`h-full ${barClasses[variant]}`}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

/**
 * Circular Progress - Circular progress indicator
 */
interface CircularProgressProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
  className?: string;
}

export function CircularProgress({
  progress,
  size = 60,
  strokeWidth = 4,
  showLabel = true,
  className = ''
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <svg className="h-full w-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted"
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#progress-gradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
        {/* Gradient definition */}
        <defs>
          <linearGradient id="progress-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="50%" stopColor="rgb(168, 85, 247)" />
            <stop offset="100%" stopColor="rgb(236, 72, 153)" />
          </linearGradient>
        </defs>
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold">{Math.round(progress)}%</span>
        </div>
      )}
    </div>
  );
}

/**
 * Skeleton - Loading placeholder
 */
interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  animate?: boolean;
}

export function Skeleton({
  className = '',
  variant = 'rectangular',
  width,
  height,
  animate = true
}: SkeletonProps) {
  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg'
  };

  const style: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height
  };

  return (
    <motion.div
      className={`bg-muted ${variantClasses[variant]} ${animate ? 'skeleton-shimmer' : ''} ${className}`}
      style={style}
      initial={{ opacity: 0.6 }}
      animate={animate ? { opacity: [0.6, 1, 0.6] } : {}}
      transition={animate ? { duration: 1.5, repeat: Infinity, ease: 'easeInOut' } : {}}
    />
  );
}

/**
 * Loading Screen - Full page loader
 */
interface LoadingScreenProps {
  message?: string;
  showProgress?: boolean;
  progress?: number;
}

export function LoadingScreen({ message, showProgress = false, progress = 0 }: LoadingScreenProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm"
    >
      <div className="flex flex-col items-center gap-4">
        {showProgress ? (
          <CircularProgress progress={progress} size={80} strokeWidth={6} />
        ) : (
          <Spinner size="lg" className="text-primary" />
        )}
        {message && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg font-medium text-muted-foreground"
          >
            {message}
          </motion.p>
        )}
      </div>
    </motion.div>
  );
}

/**
 * Inline Loader - Small inline loading indicator
 */
export function InlineLoader({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Spinner size="sm" />
      <span>{text}</span>
    </div>
  );
}

/**
 * Card Loader - Loading state for cards
 */
export function CardLoader() {
  return (
    <div className="space-y-3 rounded-2xl border border-border/50 bg-card p-4">
      <Skeleton variant="rectangular" height={200} className="w-full" />
      <Skeleton variant="text" height={24} className="w-3/4" />
      <Skeleton variant="text" height={16} className="w-full" />
      <Skeleton variant="text" height={16} className="w-5/6" />
      <div className="flex gap-2">
        <Skeleton variant="rectangular" height={32} width={80} />
        <Skeleton variant="rectangular" height={32} width={80} />
      </div>
    </div>
  );
}
