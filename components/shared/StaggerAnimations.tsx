"use client";

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface StaggerGridProps {
  children: ReactNode;
  className?: string;
}

// Container variants for stagger effect
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

// Item variants for individual cards
const itemVariants = {
  hidden: { 
    opacity: 0, 
    y: 20,
    scale: 0.95
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.46, 0.45, 0.94]
    }
  }
};

// Grid wrapper with stagger animation
export function StaggerGrid({ children, className = '' }: StaggerGridProps) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Individual item wrapper
export function StaggerItem({ children }: { children: ReactNode }) {
  return (
    <motion.div variants={itemVariants}>
      {children}
    </motion.div>
  );
}

// Scroll-triggered stagger grid
export function ScrollStaggerGrid({ children, className = '' }: StaggerGridProps) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Button with ripple effect
export function RippleButton({ 
  children, 
  className = '', 
  onClick 
}: { 
  children: ReactNode; 
  className?: string; 
  onClick?: () => void;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`relative overflow-hidden ${className}`}
      onClick={onClick}
    >
      <motion.span
        className="absolute inset-0 bg-white/20"
        initial={{ scale: 0, opacity: 1 }}
        whileHover={{ scale: 2, opacity: 0 }}
        transition={{ duration: 0.6 }}
      />
      {children}
    </motion.button>
  );
}

// Loading state with stagger
export function StaggerLoadingGrid({ 
  count = 6, 
  className = '' 
}: { 
  count?: number; 
  className?: string;
}) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          variants={itemVariants}
          className="h-64 rounded-3xl bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-xl"
        >
          <div className="skeleton-shimmer h-full w-full rounded-3xl" />
        </motion.div>
      ))}
    </motion.div>
  );
}
