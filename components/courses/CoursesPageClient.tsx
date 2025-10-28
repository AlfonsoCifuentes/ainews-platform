"use client";

import { ReactNode } from 'react';
import { FadeSlideTransition } from '@/components/shared/PageTransition';
import { TextGradient, TextSplit } from '@/components/shared/TextAnimations';
import { ScrollAnimate } from '@/components/shared/ScrollEffects';
import { Badge } from '@/components/shared/Badges';

interface CoursesPageClientProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

export function CoursesPageClient({ title, subtitle, children }: CoursesPageClientProps) {
  return (
    <FadeSlideTransition>
      <main className="min-h-screen px-4 py-12">
        <div className="container mx-auto max-w-4xl">
          <ScrollAnimate direction="up">
            <header className="mb-12 text-center">
              <Badge variant="gradient" size="sm" animated className="mb-4">
                AI-Powered Learning
              </Badge>
              <h1 className="mb-4 text-4xl font-bold md:text-5xl">
                <TextGradient>{title}</TextGradient>
              </h1>
              <div className="mx-auto max-w-2xl text-lg text-muted-foreground">
                <TextSplit text={subtitle} by="word" stagger={0.05} />
              </div>
            </header>
          </ScrollAnimate>

          {children}
        </div>
      </main>
    </FadeSlideTransition>
  );
}
