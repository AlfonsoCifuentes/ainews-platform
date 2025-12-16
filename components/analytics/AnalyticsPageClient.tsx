"use client";

import { ReactNode, useEffect, useState } from 'react';
import { FadeSlideTransition } from '@/components/shared/PageTransition';
import { TextGradient, TextSplit } from '@/components/shared/TextAnimations';
import { ScrollAnimate } from '@/components/shared/ScrollEffects';
import { Badge } from '@/components/shared/Badges';

interface AnalyticsPageClientProps {
  children: ReactNode;
}

export function AnalyticsPageClient({ children }: AnalyticsPageClientProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Prevent hydration mismatch from motion/viewport-based animations.
  if (!isMounted) {
    return (
      <main className="min-h-screen px-4 py-12">
        <div className="container mx-auto max-w-7xl">
          <header className="mb-12 text-center">
            <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border font-medium bg-gradient-to-r from-primary via-accent to-primary text-white px-2 py-0.5 text-xs">
              📊 Platform Insights
            </span>
            <h1 className="mb-4 text-4xl font-bold md:text-5xl">Analytics Dashboard</h1>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Real-time metrics and insights into platform performance and user engagement
            </p>
          </header>

          {children}
        </div>
      </main>
    );
  }

  return (
    <FadeSlideTransition>
      <main className="min-h-screen px-4 py-12">
        <div className="container mx-auto max-w-7xl">
          <ScrollAnimate direction="up">
            <header className="mb-12 text-center">
              <Badge variant="gradient" size="sm" animated className="mb-4">
                📊 Platform Insights
              </Badge>
              <h1 className="mb-4 text-4xl font-bold md:text-5xl">
                <TextGradient>Analytics Dashboard</TextGradient>
              </h1>
              <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
                <TextSplit 
                  text="Real-time metrics and insights into platform performance and user engagement" 
                  by="word" 
                  stagger={0.05} 
                />
              </p>
            </header>
          </ScrollAnimate>

          <ScrollAnimate direction="up" delay={0.2}>
            {children}
          </ScrollAnimate>
        </div>
      </main>
    </FadeSlideTransition>
  );
}
