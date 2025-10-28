"use client";

import { motion } from 'framer-motion';
import { ReactNode, useState } from 'react';
import { useHapticFeedback } from '@/lib/hooks/useSwipeGesture';

/**
 * Magnetic Button - Follows cursor on hover
 */
interface MagneticButtonProps {
  children: ReactNode;
  className?: string;
  strength?: number;
  onClick?: () => void;
}

export function MagneticButton({ 
  children, 
  className = '', 
  strength = 20,
  onClick 
}: MagneticButtonProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const haptic = useHapticFeedback();

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const x = (e.clientX - centerX) / rect.width * strength;
    const y = (e.clientY - centerY) / rect.height * strength;
    
    setPosition({ x, y });
  };

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 });
  };

  const handleClick = () => {
    haptic.light();
    onClick?.();
  };

  return (
    <motion.button
      className={className}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      animate={position}
      transition={{ type: 'spring', stiffness: 150, damping: 15 }}
    >
      {children}
    </motion.button>
  );
}

/**
 * Ripple Button - Material Design ripple effect
 */
interface RippleButtonProps extends MagneticButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost';
}

export function RippleButton({ 
  children, 
  className = '', 
  variant = 'primary',
  onClick 
}: RippleButtonProps) {
  const [ripples, setRipples] = useState<{ x: number; y: number; id: number }[]>([]);
  const haptic = useHapticFeedback();

  const baseStyles = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/90',
    ghost: 'bg-transparent border border-border hover:bg-accent'
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const newRipple = { x, y, id: Date.now() };
    setRipples([...ripples, newRipple]);
    
    haptic.medium();
    onClick?.();
    
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
    }, 600);
  };

  return (
    <motion.button
      className={`relative overflow-hidden rounded-2xl px-6 py-3 font-medium transition-all ${baseStyles[variant]} ${className}`}
      onClick={handleClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {children}
      
      {ripples.map((ripple) => (
        <motion.span
          key={ripple.id}
          className="pointer-events-none absolute rounded-full bg-white/30"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: 0,
            height: 0
          }}
          initial={{ width: 0, height: 0, opacity: 1 }}
          animate={{ width: 300, height: 300, opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      ))}
    </motion.button>
  );
}

/**
 * 3D Button - Neumorphism with 3D press effect
 */
export function Button3D({ children, className = '', onClick }: MagneticButtonProps) {
  const haptic = useHapticFeedback();

  const handleClick = () => {
    haptic.medium();
    onClick?.();
  };

  return (
    <motion.button
      className={`relative rounded-2xl px-6 py-3 font-medium shadow-[8px_8px_16px_rgba(0,0,0,0.2),-8px_-8px_16px_rgba(255,255,255,0.05)] ${className}`}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ 
        scale: 0.98, 
        y: 0,
        boxShadow: 'inset 4px 4px 8px rgba(0,0,0,0.3), inset -4px -4px 8px rgba(255,255,255,0.05)'
      }}
      onClick={handleClick}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
    >
      {children}
    </motion.button>
  );
}

/**
 * Glow Button - Glowing animated border
 */
export function GlowButton({ children, className = '', onClick }: MagneticButtonProps) {
  const haptic = useHapticFeedback();

  return (
    <motion.button
      className={`group relative overflow-hidden rounded-2xl bg-background px-6 py-3 font-medium ${className}`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => {
        haptic.light();
        onClick?.();
      }}
    >
      {/* Animated glow border */}
      <motion.div
        className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary via-accent to-primary opacity-0 blur-xl transition-opacity group-hover:opacity-100"
        animate={{
          rotate: 360
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'linear'
        }}
      />
      
      {/* Inner content */}
      <span className="relative z-10 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
        {children}
      </span>
    </motion.button>
  );
}

/**
 * Shimmer Button - Shimmer effect on hover
 */
export function ShimmerButton({ children, className = '', onClick }: MagneticButtonProps) {
  const haptic = useHapticFeedback();

  return (
    <motion.button
      className={`group relative overflow-hidden rounded-2xl bg-primary px-6 py-3 font-medium text-primary-foreground ${className}`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => {
        haptic.medium();
        onClick?.();
      }}
    >
      {/* Shimmer effect */}
      <motion.div
        className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent"
        animate={{
          x: ['0%', '200%']
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          repeatDelay: 1
        }}
      />
      
      <span className="relative z-10">{children}</span>
    </motion.button>
  );
}

/**
 * Floating Action Button - FAB with tooltip
 */
interface FABProps extends MagneticButtonProps {
  icon: ReactNode;
  label?: string;
}

export function FloatingActionButton({ icon, label, className = '', onClick }: FABProps) {
  const [isHovered, setIsHovered] = useState(false);
  const haptic = useHapticFeedback();

  return (
    <motion.div
      className="fixed bottom-6 right-6 z-40"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
    >
      <motion.button
        className={`glass flex items-center gap-2 rounded-full border border-white/20 bg-primary p-4 text-primary-foreground shadow-2xl backdrop-blur-xl ${className}`}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        onClick={() => {
          haptic.medium();
          onClick?.();
        }}
      >
        <motion.div
          animate={{ rotate: isHovered ? 90 : 0 }}
          transition={{ type: 'spring', stiffness: 200 }}
        >
          {icon}
        </motion.div>
        
        {label && (
          <motion.span
            initial={{ width: 0, opacity: 0 }}
            animate={isHovered ? { width: 'auto', opacity: 1 } : { width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden whitespace-nowrap font-medium"
          >
            {label}
          </motion.span>
        )}
      </motion.button>
    </motion.div>
  );
}

/**
 * Toggle Switch - Animated toggle with haptic feedback
 */
interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  className?: string;
}

export function ToggleSwitch({ checked, onChange, label, className = '' }: ToggleSwitchProps) {
  const haptic = useHapticFeedback();

  const handleToggle = () => {
    haptic.light();
    onChange(!checked);
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {label && <span className="text-sm font-medium">{label}</span>}
      
      <motion.button
        className={`relative h-8 w-14 rounded-full ${checked ? 'bg-primary' : 'bg-muted'}`}
        onClick={handleToggle}
        whileTap={{ scale: 0.95 }}
      >
        <motion.div
          className="absolute left-1 top-1 h-6 w-6 rounded-full bg-white shadow-lg"
          animate={{ x: checked ? 24 : 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </motion.button>
    </div>
  );
}

/**
 * Segmented Control - iOS-style segmented control
 */
interface SegmentedControlProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function SegmentedControl({ options, value, onChange, className = '' }: SegmentedControlProps) {
  const haptic = useHapticFeedback();

  return (
    <div className={`glass relative flex rounded-2xl border border-white/20 p-1 backdrop-blur-xl ${className}`}>
      {options.map((option) => (
        <button
          key={option.value}
          className={`relative z-10 flex-1 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
            value === option.value ? 'text-foreground' : 'text-muted-foreground'
          }`}
          onClick={() => {
            haptic.light();
            onChange(option.value);
          }}
        >
          {option.label}
        </button>
      ))}
      
      {/* Active indicator */}
      <motion.div
        className="absolute inset-y-1 rounded-xl bg-background shadow-lg"
        layoutId="segmented-control-active"
        style={{
          width: `calc(${100 / options.length}% - 0.25rem)`,
          left: `calc(${options.findIndex(o => o.value === value) * (100 / options.length)}% + 0.125rem)`
        }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      />
    </div>
  );
}
