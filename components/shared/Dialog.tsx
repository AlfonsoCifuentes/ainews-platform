"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { ReactNode, useEffect } from 'react';
import { useHapticFeedback } from '@/lib/hooks/useSwipeGesture';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnOutsideClick?: boolean;
  showCloseButton?: boolean;
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-full mx-4'
};

/**
 * Dialog - Accessible modal dialog with animations
 */
export function Dialog({
  isOpen,
  onClose,
  children,
  title,
  description,
  size = 'md',
  closeOnOutsideClick = true,
  showCloseButton = true
}: DialogProps) {
  const haptic = useHapticFeedback();

  // Lock body scroll when dialog is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      haptic.light();
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, haptic]);

  // Handle ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  const handleClose = () => {
    haptic.light();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
            onClick={closeOnOutsideClick ? handleClose : undefined}
            aria-hidden="true"
          />

          {/* Dialog */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className={`glass relative w-full rounded-3xl border border-white/20 bg-background/95 p-6 shadow-2xl backdrop-blur-xl ${sizeClasses[size]}`}
              role="dialog"
              aria-modal="true"
              aria-labelledby={title ? 'dialog-title' : undefined}
              aria-describedby={description ? 'dialog-description' : undefined}
            >
              {/* Close button */}
              {showCloseButton && (
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleClose}
                  className="absolute right-4 top-4 rounded-full p-2 transition-colors hover:bg-white/10"
                  aria-label="Close dialog"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </motion.button>
              )}

              {/* Header */}
              {(title || description) && (
                <div className="mb-6 pr-8">
                  {title && (
                    <h2 id="dialog-title" className="text-2xl font-bold">
                      {title}
                    </h2>
                  )}
                  {description && (
                    <p id="dialog-description" className="mt-2 text-muted-foreground">
                      {description}
                    </p>
                  )}
                </div>
              )}

              {/* Content */}
              {children}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * Drawer - Bottom sheet / side drawer component
 */
interface DrawerProps extends Omit<DialogProps, 'size'> {
  position?: 'bottom' | 'left' | 'right';
}

export function Drawer({
  isOpen,
  onClose,
  children,
  title,
  position = 'bottom',
  closeOnOutsideClick = true,
  showCloseButton = true
}: DrawerProps) {
  const haptic = useHapticFeedback();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      haptic.light();
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, haptic]);

  const handleClose = () => {
    haptic.light();
    onClose();
  };

  const variants = {
    bottom: {
      initial: { y: '100%' },
      animate: { y: 0 },
      exit: { y: '100%' }
    },
    left: {
      initial: { x: '-100%' },
      animate: { x: 0 },
      exit: { x: '-100%' }
    },
    right: {
      initial: { x: '100%' },
      animate: { x: 0 },
      exit: { x: '100%' }
    }
  };

  const containerClasses = {
    bottom: 'bottom-0 left-0 right-0 rounded-t-3xl max-h-[90vh]',
    left: 'left-0 top-0 bottom-0 rounded-r-3xl w-full max-w-md',
    right: 'right-0 top-0 bottom-0 rounded-l-3xl w-full max-w-md'
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
            onClick={closeOnOutsideClick ? handleClose : undefined}
          />

          {/* Drawer */}
          <motion.div
            initial={variants[position].initial}
            animate={variants[position].animate}
            exit={variants[position].exit}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className={`glass fixed z-50 overflow-y-auto border border-white/20 bg-background/95 p-6 shadow-2xl backdrop-blur-xl ${containerClasses[position]}`}
          >
            {/* Handle bar for bottom drawer */}
            {position === 'bottom' && (
              <div className="mb-4 flex justify-center">
                <div className="h-1.5 w-12 rounded-full bg-white/20" />
              </div>
            )}

            {/* Close button */}
            {showCloseButton && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleClose}
                className="absolute right-4 top-4 rounded-full p-2 hover:bg-white/10"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </motion.button>
            )}

            {/* Header */}
            {title && (
              <h2 className="mb-6 pr-8 text-2xl font-bold">
                {title}
              </h2>
            )}

            {/* Content */}
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * Popover - Tooltip-style floating content
 */
interface PopoverProps {
  trigger: ReactNode;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function Popover({ trigger, children, position = 'bottom' }: PopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const haptic = useHapticFeedback();

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  };

  const handleToggle = () => {
    haptic.light();
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative inline-block">
      <div onClick={handleToggle}>
        {trigger}
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={`glass absolute z-50 min-w-[200px] rounded-2xl border border-white/20 bg-background/95 p-4 shadow-xl backdrop-blur-xl ${positionClasses[position]}`}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Fix missing import
import { useState } from 'react';
