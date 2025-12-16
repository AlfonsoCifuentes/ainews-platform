"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { ReactNode, useEffect, useMemo, useState } from 'react';

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

// Fade + Slide Up transition
export function FadeSlideTransition({ children, className = '' }: PageTransitionProps) {
  const pathname = usePathname();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const transitionKey = useMemo(() => {
    // Avoid hydration mismatches when `usePathname()` differs between SSR and client.
    // Keep a stable key through hydration, then switch to the real pathname.
    if (!hydrated) return 'hydrating';
    return pathname || 'unknown-path';
  }, [hydrated, pathname]);
  
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={transitionKey}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{
          duration: 0.3,
          ease: [0.22, 1, 0.36, 1] // Smooth ease-out curve
        }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// Scale + Fade transition (for modal-like pages)
export function ScaleTransition({ children, className = '' }: PageTransitionProps) {
  const pathname = usePathname();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const transitionKey = useMemo(() => {
    if (!hydrated) return 'hydrating';
    return pathname || 'unknown-path';
  }, [hydrated, pathname]);
  
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={transitionKey}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.05 }}
        transition={{
          duration: 0.25,
          ease: [0.22, 1, 0.36, 1]
        }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// Slide from right (for detail pages)
export function SlideTransition({ children, className = '' }: PageTransitionProps) {
  const pathname = usePathname();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const transitionKey = useMemo(() => {
    if (!hydrated) return 'hydrating';
    return pathname || 'unknown-path';
  }, [hydrated, pathname]);
  
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={transitionKey}
        initial={{ opacity: 0, x: 100 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -100 }}
        transition={{
          duration: 0.3,
          ease: [0.22, 1, 0.36, 1]
        }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// Stagger children (for grids/lists)
export function StaggerPageTransition({ children, className = '' }: PageTransitionProps) {
  const pathname = usePathname();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const transitionKey = useMemo(() => {
    if (!hydrated) return 'hydrating';
    return pathname || 'unknown-path';
  }, [hydrated, pathname]);
  
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={transitionKey}
        initial="hidden"
        animate="visible"
        exit="hidden"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: {
              staggerChildren: 0.08,
              delayChildren: 0.1
            }
          }
        }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// 3D Flip transition (for dramatic page changes)
export function FlipTransition({ children, className = '' }: PageTransitionProps) {
  const pathname = usePathname();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const transitionKey = useMemo(() => {
    if (!hydrated) return 'hydrating';
    return pathname || 'unknown-path';
  }, [hydrated, pathname]);
  
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={transitionKey}
        initial={{ opacity: 0, rotateX: 90, transformPerspective: 1000 }}
        animate={{ opacity: 1, rotateX: 0, transformPerspective: 1000 }}
        exit={{ opacity: 0, rotateX: -90, transformPerspective: 1000 }}
        transition={{
          duration: 0.5,
          ease: [0.22, 1, 0.36, 1]
        }}
        style={{ transformStyle: 'preserve-3d' }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// Curtain transition (wipes from top)
export function CurtainTransition({ children, className = '' }: PageTransitionProps) {
  const pathname = usePathname();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const transitionKey = useMemo(() => {
    if (!hydrated) return 'hydrating';
    return pathname || 'unknown-path';
  }, [hydrated, pathname]);
  
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={transitionKey}
        initial={{ clipPath: 'inset(0 0 100% 0)' }}
        animate={{ clipPath: 'inset(0 0 0% 0)' }}
        exit={{ clipPath: 'inset(100% 0 0 0)' }}
        transition={{
          duration: 0.6,
          ease: [0.22, 1, 0.36, 1]
        }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// Zoom transition (for focus on content)
export function ZoomTransition({ children, className = '' }: PageTransitionProps) {
  const pathname = usePathname();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const transitionKey = useMemo(() => {
    if (!hydrated) return 'hydrating';
    return pathname || 'unknown-path';
  }, [hydrated, pathname]);
  
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={transitionKey}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.2 }}
        transition={{
          duration: 0.4,
          ease: [0.22, 1, 0.36, 1]
        }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// Loading transition with progress bar
export function LoadingTransition({ 
  children, 
  className = '',
  isLoading = false
}: PageTransitionProps & { isLoading?: boolean }) {
  const pathname = usePathname();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const transitionKey = useMemo(() => {
    if (!hydrated) return 'hydrating';
    return pathname || 'unknown-path';
  }, [hydrated, pathname]);
  
  return (
    <>
      {/* Loading bar */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            exit={{ scaleX: 1, opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed left-0 top-0 z-50 h-1 w-full origin-left bg-gradient-to-r from-primary via-accent to-primary"
          />
        )}
      </AnimatePresence>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={transitionKey}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className={className}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </>
  );
}
