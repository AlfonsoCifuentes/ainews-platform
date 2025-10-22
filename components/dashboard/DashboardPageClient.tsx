"use client";

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { FadeSlideTransition } from '@/components/shared/PageTransition';
import { TextGradient, TextSplit } from '@/components/shared/TextAnimations';
import { ScrollAnimate } from '@/components/shared/ScrollEffects';
import { Badge } from '@/components/shared/Badges';

interface DashboardPageClientProps {
  userName: string;
  welcomeText: string;
  overviewText: string;
  children: ReactNode;
}

export function DashboardPageClient({ userName, welcomeText, overviewText, children }: DashboardPageClientProps) {
  return (
    <FadeSlideTransition>
      <main className="min-h-screen px-4 py-12">
        <div className="container mx-auto max-w-7xl">
          {/* Hero Header */}
          <ScrollAnimate direction="up">
            <header className="mb-12">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <Badge variant="gradient" size="sm" animated className="mb-4">
                    🎯 Personal Dashboard
                  </Badge>
                  <h1 className="mb-3 text-4xl font-bold md:text-5xl">
                    <TextGradient>
                      {welcomeText}, {userName}! 👋
                    </TextGradient>
                  </h1>
                  <p className="text-lg text-muted-foreground">
                    <TextSplit text={overviewText} by="word" stagger={0.03} />
                  </p>
                </div>

                {/* Quick Actions */}
                <div className="flex gap-3">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="glass rounded-xl border border-white/10 px-6 py-3 transition-all hover:border-primary/30 hover:shadow-lg"
                  >
                    📚 Browse Courses
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-lg transition-all hover:shadow-xl hover:shadow-primary/50"
                  >
                    ⚙️ Settings
                  </motion.button>
                </div>
              </div>
            </header>
          </ScrollAnimate>

          {/* Dashboard Content */}
          <ScrollAnimate direction="up" delay={0.1}>
            {children}
          </ScrollAnimate>
        </div>
      </main>
    </FadeSlideTransition>
  );
}
