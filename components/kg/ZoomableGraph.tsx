"use client";

import { useState, useRef, useEffect, ReactNode } from 'react';
import { motion, useMotionValue } from 'framer-motion';

interface ZoomableContainerProps {
  children: ReactNode;
  minZoom?: number;
  maxZoom?: number;
  className?: string;
}

export function ZoomableContainer({
  children,
  minZoom = 0.5,
  maxZoom = 3,
  className = ''
}: ZoomableContainerProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const initialDistance = useRef<number>(0);
  const initialScale = useRef<number>(1);

  // Motion values for smooth animations
  const x = useMotionValue(position.x);
  const y = useMotionValue(position.y);

  // Handle pinch zoom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        initialDistance.current = getDistance(e.touches[0], e.touches[1]);
        initialScale.current = scale;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const currentDistance = getDistance(e.touches[0], e.touches[1]);
        const scaleChange = currentDistance / initialDistance.current;
        const newScale = Math.min(
          Math.max(initialScale.current * scaleChange, minZoom),
          maxZoom
        );
        setScale(newScale);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        initialDistance.current = 0;
      }
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [scale, minZoom, maxZoom]);

  // Handle wheel zoom (desktop)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = -e.deltaY * 0.01;
        const newScale = Math.min(
          Math.max(scale + delta, minZoom),
          maxZoom
        );
        setScale(newScale);
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [scale, minZoom, maxZoom]);

  // Handle drag to pan (when zoomed)
  const handleDragStart = () => {
    if (scale > 1) {
      setIsDragging(true);
    }
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setPosition({ x: x.get(), y: y.get() });
  };

  // Reset zoom with double tap
  const handleDoubleClick = () => {
    if (scale === 1) {
      setScale(2);
    } else {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      x.set(0);
      y.set(0);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      onDoubleClick={handleDoubleClick}
    >
      {/* Zoom controls */}
      <div className="absolute right-4 top-4 z-10 flex flex-col gap-2">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setScale(Math.min(scale + 0.5, maxZoom))}
          className="glass flex h-10 w-10 items-center justify-center rounded-full border-white/10 text-white shadow-lg"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </motion.button>
        
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setScale(Math.max(scale - 0.5, minZoom))}
          className="glass flex h-10 w-10 items-center justify-center rounded-full border-white/10 text-white shadow-lg"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </motion.button>
        
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            setScale(1);
            setPosition({ x: 0, y: 0 });
            x.set(0);
            y.set(0);
          }}
          className="glass flex h-10 w-10 items-center justify-center rounded-full border-white/10 text-white shadow-lg"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </motion.button>
      </div>

      {/* Zoom indicator */}
      {scale !== 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="glass absolute left-1/2 top-4 z-10 -translate-x-1/2 rounded-full border-white/10 px-4 py-2 text-sm font-medium text-white shadow-lg"
        >
          {Math.round(scale * 100)}%
        </motion.div>
      )}

      {/* Zoomable content */}
      <motion.div
        drag={scale > 1}
        dragConstraints={containerRef}
        dragElastic={0.1}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        style={{
          scale,
          x,
          y,
          cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="origin-center"
      >
        {children}
      </motion.div>

      {/* Instructions */}
      {scale === 1 && (
        <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 text-center text-sm text-white/50">
          <p>Pinch to zoom • Double tap to zoom • Ctrl+scroll to zoom</p>
        </div>
      )}
    </div>
  );
}

// Helper function to calculate distance between two touch points
function getDistance(touch1: Touch, touch2: Touch): number {
  const dx = touch1.clientX - touch2.clientX;
  const dy = touch1.clientY - touch2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}
