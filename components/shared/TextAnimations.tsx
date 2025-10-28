"use client";

import { motion, Variants } from 'framer-motion';
import { ReactNode } from 'react';

/**
 * Text Reveal - Character by character reveal
 */
interface TextRevealProps {
  text: string;
  className?: string;
  delay?: number;
  duration?: number;
}

export function TextReveal({ text, className = '', delay = 0, duration = 0.05 }: TextRevealProps) {
  const letters = Array.from(text);

  const container: Variants = {
    hidden: { opacity: 0 },
    visible: () => ({
      opacity: 1,
      transition: { staggerChildren: duration, delayChildren: delay }
    })
  };

  const child: Variants = {
    hidden: {
      opacity: 0,
      y: 20,
      transition: {
        type: 'spring',
        damping: 12,
        stiffness: 100
      }
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        damping: 12,
        stiffness: 100
      }
    }
  };

  return (
    <motion.span
      className={className}
      variants={container}
      initial="hidden"
      animate="visible"
    >
      {letters.map((letter, index) => (
        <motion.span key={index} variants={child}>
          {letter === ' ' ? '\u00A0' : letter}
        </motion.span>
      ))}
    </motion.span>
  );
}

/**
 * Text Gradient Animation - Animated gradient text
 */
interface TextGradientProps {
  children: ReactNode;
  className?: string;
}

export function TextGradient({ children, className = '' }: TextGradientProps) {
  return (
    <motion.span
      className={`bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent ${className}`}
      animate={{
        backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
      }}
      transition={{
        duration: 5,
        repeat: Infinity,
        ease: 'linear'
      }}
      style={{
        backgroundSize: '200% 200%'
      }}
    >
      {children}
    </motion.span>
  );
}

/**
 * Text Glitch - Glitch effect on hover
 */
export function TextGlitch({ children, className = '' }: TextGradientProps) {
  return (
    <motion.span
      className={`relative inline-block ${className}`}
      whileHover="hover"
      initial="initial"
    >
      <motion.span
        variants={{
          initial: { x: 0 },
          hover: {
            x: [-2, 2, -2, 2, 0],
            transition: { duration: 0.3 }
          }
        }}
      >
        {children}
      </motion.span>
      
      {/* Glitch layers */}
      <motion.span
        className="absolute left-0 top-0 text-red-500 opacity-0"
        variants={{
          initial: { x: 0, opacity: 0 },
          hover: { x: -3, opacity: 0.7, transition: { duration: 0.1 } }
        }}
        aria-hidden
      >
        {children}
      </motion.span>
      
      <motion.span
        className="absolute left-0 top-0 text-blue-500 opacity-0"
        variants={{
          initial: { x: 0, opacity: 0 },
          hover: { x: 3, opacity: 0.7, transition: { duration: 0.1, delay: 0.05 } }
        }}
        aria-hidden
      >
        {children}
      </motion.span>
    </motion.span>
  );
}

/**
 * Text Wave - Wave animation on each character
 */
export function TextWave({ text, className = '' }: TextRevealProps) {
  const letters = Array.from(text);

  const container: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.03,
        delayChildren: 0
      }
    }
  };

  const child: Variants = {
    hidden: { y: 0 },
    visible: {
      y: [0, -10, 0],
      transition: {
        duration: 0.5,
        repeat: Infinity,
        repeatDelay: 1
      }
    }
  };

  return (
    <motion.span
      className={className}
      variants={container}
      initial="hidden"
      animate="visible"
    >
      {letters.map((letter, index) => (
        <motion.span
          key={index}
          variants={child}
          className="inline-block"
        >
          {letter === ' ' ? '\u00A0' : letter}
        </motion.span>
      ))}
    </motion.span>
  );
}

/**
 * Text Typewriter - Typewriter effect
 */
export function TextTypewriter({ text, className = '', delay = 0 }: TextRevealProps) {
  const letters = Array.from(text);

  return (
    <motion.span className={className}>
      {letters.map((letter, index) => (
        <motion.span
          key={index}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{
            duration: 0.01,
            delay: delay + index * 0.05
          }}
        >
          {letter}
        </motion.span>
      ))}
      
      {/* Blinking cursor */}
      <motion.span
        animate={{ opacity: [1, 0, 1] }}
        transition={{ duration: 1, repeat: Infinity }}
        className="ml-1 inline-block h-[1em] w-[2px] bg-current"
      />
    </motion.span>
  );
}

/**
 * Text Split - Split text animation (words or lines)
 */
interface TextSplitProps {
  text: string;
  className?: string;
  by?: 'word' | 'line';
  delay?: number;
  stagger?: number;
}

export function TextSplit({ 
  text, 
  className = '', 
  by = 'word',
  delay = 0,
  stagger = 0.1
}: TextSplitProps) {
  const items = by === 'word' ? text.split(' ') : text.split('\n');

  const container: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: stagger,
        delayChildren: delay
      }
    }
  };

  const child: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: [0.22, 1, 0.36, 1]
      }
    }
  };

  return (
    <motion.div
      className={className}
      variants={container}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-50px' }}
    >
      {items.map((item, index) => (
        <motion.span
          key={index}
          variants={child}
          className="inline-block"
        >
          {item}
          {by === 'word' && index < items.length - 1 && '\u00A0'}
          {by === 'line' && index < items.length - 1 && <br />}
        </motion.span>
      ))}
    </motion.div>
  );
}

/**
 * Text Scramble - Random character scramble effect
 */
export function TextScramble({ text, className = '' }: TextRevealProps) {
  return (
    <motion.span
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
    >
      {Array.from(text).map((letter, index) => (
        <motion.span
          key={index}
          initial={{ opacity: 0 }}
          animate={{
            opacity: 1,
            content: letter
          }}
          transition={{
            duration: 0.8,
            delay: index * 0.03,
            ease: 'easeOut'
          }}
        >
          {letter}
        </motion.span>
      ))}
    </motion.span>
  );
}

/**
 * Text Highlight - Animated highlight background
 */
export function TextHighlight({ children, className = '' }: TextGradientProps) {
  return (
    <motion.span
      className={`relative inline-block ${className}`}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
    >
      <motion.span
        className="absolute inset-0 z-[-1] bg-primary/20"
        variants={{
          hidden: { scaleX: 0 },
          visible: { scaleX: 1 }
        }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        style={{ originX: 0 }}
      />
      {children}
    </motion.span>
  );
}
