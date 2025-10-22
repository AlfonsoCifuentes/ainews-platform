"use client";

import { ReactNode } from 'react';
import { FadeSlideTransition } from '@/components/shared/PageTransition';
import { TextGradient, TextSplit } from '@/components/shared/TextAnimations';
import { ScrollAnimate } from '@/components/shared/ScrollEffects';
import { Badge } from '@/components/shared/Badges';

interface AnalyticsPageClientProps {
  children: ReactNode;
}

export function AnalyticsPageClient({ children }: AnalyticsPageClientProps) {
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
