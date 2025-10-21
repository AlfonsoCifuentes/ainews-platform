// components/shared/AnimatedHero.tsx
'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ReactNode } from 'react';

// Register ScrollTrigger plugin
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

interface AnimatedHeroProps {
  children: ReactNode;
}

export function AnimatedHero({ children }: AnimatedHeroProps) {
  const heroRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!heroRef.current || !titleRef.current || !subtitleRef.current || !ctaRef.current) return;

    const ctx = gsap.context(() => {
      // Hero fade in on load
      gsap.from(heroRef.current, {
        opacity: 0,
        duration: 1,
        ease: 'power2.out',
      });

      // Title animation
      gsap.from(titleRef.current, {
        y: 50,
        opacity: 0,
        duration: 1,
        delay: 0.2,
        ease: 'power3.out',
      });

      // Subtitle animation
      gsap.from(subtitleRef.current, {
        y: 30,
        opacity: 0,
        duration: 0.8,
        delay: 0.4,
        ease: 'power2.out',
      });

      // CTA buttons animation
      gsap.from(ctaRef.current, {
        y: 20,
        opacity: 0,
        duration: 0.8,
        delay: 0.6,
        ease: 'power2.out',
      });

      // Parallax effect on scroll
      gsap.to(heroRef.current, {
        scrollTrigger: {
          trigger: heroRef.current,
          start: 'top top',
          end: 'bottom top',
          scrub: 1,
        },
        y: 200,
        opacity: 0.5,
        ease: 'none',
      });
    }, heroRef);

    return () => {
      ctx.revert();
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, []);

  return (
    <div ref={heroRef}>
      {children}
    </div>
  );
}

interface ScrollRevealProps {
  children: ReactNode;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  className?: string;
}

export function ScrollReveal({ children, delay = 0, direction = 'up', className }: ScrollRevealProps) {
  const revealRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!revealRef.current) return;

    const directionMap = {
      up: { y: 80 },
      down: { y: -80 },
      left: { x: -80 },
      right: { x: 80 },
    };

    const ctx = gsap.context(() => {
      gsap.from(revealRef.current, {
        ...directionMap[direction],
        opacity: 0,
        duration: 1,
        delay,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: revealRef.current,
          start: 'top 85%',
          end: 'top 50%',
          toggleActions: 'play none none none',
        },
      });
    }, revealRef);

    return () => ctx.revert();
  }, [delay, direction]);

  return (
    <div ref={revealRef} className={className}>
      {children}
    </div>
  );
}

interface ParallaxSectionProps {
  children: ReactNode;
  speed?: number;
  className?: string;
}

export function ParallaxSection({ children, speed = 0.5, className }: ParallaxSectionProps) {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sectionRef.current) return;

    const ctx = gsap.context(() => {
      gsap.to(sectionRef.current, {
        y: -100 * speed,
        ease: 'none',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1,
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, [speed]);

  return (
    <div ref={sectionRef} className={className}>
      {children}
    </div>
  );
}
