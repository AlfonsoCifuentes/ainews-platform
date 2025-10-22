"use client";

import { ReactNode } from 'react';
import { FadeSlideTransition } from '@/components/shared/PageTransition';
import { TextGradient, TextSplit } from '@/components/shared/TextAnimations';
import { ScrollAnimate } from '@/components/shared/ScrollEffects';
import { Badge } from '@/components/shared/Badges';

interface TrendingPageClientProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

export function TrendingPageClient({ title, subtitle, children }: TrendingPageClientProps) {
  return (
    <FadeSlideTransition>
      <main className="min-h-screen px-4 py-12">
        <div className="container mx-auto max-w-7xl">
          <ScrollAnimate direction="up">
            <header className="mb-12 text-center">
              <Badge variant="gradient" size="sm" animated className="mb-4">
                🔥 Hot Topics
              </Badge>
              <h1 className="mb-4 text-4xl font-bold md:text-5xl">
                <TextGradient>{title}</TextGradient>
              </h1>
              <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
                <TextSplit text={subtitle} by="word" stagger={0.05} />
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
