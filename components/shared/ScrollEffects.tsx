"use client";

import { motion, useScroll, useSpring, useTransform } from 'framer-motion';
import { useEffect, useState } from 'react';

/**
 * Scroll Progress Indicator - Shows reading progress at top of page
 */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  return (
    <motion.div
      className="fixed left-0 top-0 z-50 h-1 w-full origin-left bg-gradient-to-r from-primary via-purple-500 to-pink-500"
      style={{ scaleX }}
    />
  );
}

/**
 * Circular Scroll Progress - Floating button that shows progress
 */
export function CircularScrollProgress() {
  const { scrollYProgress } = useScroll();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const unsubscribe = scrollYProgress.on('change', (latest) => {
      setIsVisible(latest > 0.1);
    });
    return () => unsubscribe();
  }, [scrollYProgress]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Calculate circumference for progress ring
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const offset = useTransform(scrollYProgress, [0, 1], [circumference, 0]);

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0 }}
      animate={isVisible ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
      transition={{ duration: 0.3 }}
      onClick={scrollToTop}
      className="glass fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full border border-white/20 backdrop-blur-xl transition-all hover:scale-110 active:scale-95"
      aria-label="Scroll to top"
    >
      {/* Progress ring */}
      <svg className="absolute inset-0 -rotate-90" width="56" height="56">
        <circle
          cx="28"
          cy="28"
          r={radius}
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          className="text-primary/20"
        />
        <motion.circle
          cx="28"
          cy="28"
          r={radius}
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          className="text-primary"
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: offset,
            strokeLinecap: 'round'
          }}
        />
      </svg>

      {/* Arrow icon */}
      <svg
        className="h-5 w-5 text-foreground"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
      </svg>
    </motion.button>
  );
}

/**
 * Smooth Scroll Container - Enables smooth scrolling for entire page
 */
interface SmoothScrollProps {
  children: React.ReactNode;
  className?: string;
}

export function SmoothScroll({ children, className = '' }: SmoothScrollProps) {
  useEffect(() => {
    // Enable smooth scrolling globally
    document.documentElement.style.scrollBehavior = 'smooth';
    
    return () => {
      document.documentElement.style.scrollBehavior = '';
    };
  }, []);

  return <div className={className}>{children}</div>;
}

/**
 * Scroll Snap Container - Snaps to sections on scroll
 */
export function ScrollSnapContainer({ children, className = '' }: SmoothScrollProps) {
  return (
    <div className={`snap-y snap-mandatory overflow-y-scroll ${className}`}>
      {children}
    </div>
  );
}

/**
 * Scroll Snap Section - Individual snap section
 */
export function ScrollSnapSection({ children, className = '' }: SmoothScrollProps) {
  return (
    <section className={`snap-start ${className}`}>
      {children}
    </section>
  );
}

/**
 * Parallax Scroll - Element moves at different speed than scroll
 */
interface ParallaxScrollProps {
  children: React.ReactNode;
  speed?: number; // 0-1, where 0.5 is half speed
  className?: string;
}

export function ParallaxScroll({ children, speed = 0.5, className = '' }: ParallaxScrollProps) {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 1000], [0, -1000 * speed]);

  return (
    <motion.div style={{ y }} className={className}>
      {children}
    </motion.div>
  );
}

/**
 * Scroll Triggered Animation - Animates when scrolled into view
 */
interface ScrollAnimateProps {
  children: React.ReactNode;
  className?: string;
  direction?: 'up' | 'down' | 'left' | 'right';
  delay?: number;
}

export function ScrollAnimate({ 
  children, 
  className = '', 
  direction = 'up',
  delay = 0 
}: ScrollAnimateProps) {
  const variants = {
    hidden: {
      opacity: 0,
      x: direction === 'left' ? -50 : direction === 'right' ? 50 : 0,
      y: direction === 'up' ? 50 : direction === 'down' ? -50 : 0
    },
    visible: {
      opacity: 1,
      x: 0,
      y: 0
    }
  };

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      variants={variants}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Scroll Progress Text - Shows percentage scrolled
 */
export function ScrollProgressText() {
  const { scrollYProgress } = useScroll();
  const [percentage, setPercentage] = useState(0);

  useEffect(() => {
    const unsubscribe = scrollYProgress.on('change', (latest) => {
      setPercentage(Math.round(latest * 100));
    });
    return () => unsubscribe();
  }, [scrollYProgress]);

  if (percentage < 5) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="glass fixed bottom-6 left-6 z-40 rounded-full border border-white/20 px-4 py-2 text-sm font-medium backdrop-blur-xl"
    >
      {percentage}%
    </motion.div>
  );
}
