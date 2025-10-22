"use client";

import { ReactNode, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FadeSlideTransition } from '@/components/shared/PageTransition';
import { TextGradient, TextSplit } from '@/components/shared/TextAnimations';
import { ScrollAnimate } from '@/components/shared/ScrollEffects';
import { Badge } from '@/components/shared/Badges';

interface KGPageClientProps {
  title: string;
  searchPlaceholder: string;
  filters: {
    allTypes: string;
    person: string;
    organization: string;
    model: string;
    company: string;
    paper: string;
    concept: string;
    apply: string;
  };
  children: ReactNode;
}

export function KGPageClient({ title, searchPlaceholder, filters, children }: KGPageClientProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'graph'>('grid');

  return (
    <FadeSlideTransition>
      <main className="min-h-screen px-4 py-12">
        <div className="container mx-auto max-w-7xl">
          {/* Hero Section */}
          <ScrollAnimate direction="up">
            <header className="mb-12 text-center">
              <Badge variant="gradient" size="sm" animated className="mb-4">
                🧠 AI Knowledge Graph
              </Badge>
              <h1 className="mb-4 text-4xl font-bold md:text-5xl">
                <TextGradient>{title}</TextGradient>
              </h1>
              <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
                <TextSplit 
                  text="Explore entities, relationships, and insights from the AI ecosystem" 
                  by="word" 
                  stagger={0.05} 
                />
              </p>
            </header>
          </ScrollAnimate>

          {/* View Mode Switcher */}
          <ScrollAnimate direction="up" delay={0.1}>
            <div className="mb-8 flex justify-center">
              <div className="glass inline-flex rounded-2xl border border-white/10 p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-6 py-2 rounded-xl transition-all duration-300 ${
                    viewMode === 'grid'
                      ? 'bg-primary text-primary-foreground shadow-lg'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  📋 Grid View
                </button>
                <button
                  onClick={() => setViewMode('graph')}
                  className={`px-6 py-2 rounded-xl transition-all duration-300 ${
                    viewMode === 'graph'
                      ? 'bg-primary text-primary-foreground shadow-lg'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  🕸️ Graph View
                </button>
              </div>
            </div>
          </ScrollAnimate>

          {/* Search and Filters */}
          <ScrollAnimate direction="up" delay={0.2}>
            <form className="glass mb-8 rounded-3xl border border-white/10 p-6" method="get">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <label className="mb-2 block text-sm font-medium">Search</label>
                  <input
                    type="text"
                    name="q"
                    placeholder={searchPlaceholder}
                    className="w-full rounded-xl border border-white/10 bg-background/50 px-4 py-3 backdrop-blur-xl transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="w-full sm:w-56">
                  <label className="mb-2 block text-sm font-medium">Type</label>
                  <select 
                    name="type" 
                    className="w-full rounded-xl border border-white/10 bg-background/50 px-4 py-3 backdrop-blur-xl transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">{filters.allTypes}</option>
                    <option value="person">{filters.person}</option>
                    <option value="organization">{filters.organization}</option>
                    <option value="model">{filters.model}</option>
                    <option value="company">{filters.company}</option>
                    <option value="paper">{filters.paper}</option>
                    <option value="concept">{filters.concept}</option>
                  </select>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="rounded-xl bg-primary px-8 py-3 font-semibold text-primary-foreground shadow-lg transition-all hover:shadow-xl hover:shadow-primary/50"
                  type="submit"
                >
                  {filters.apply}
                </motion.button>
              </div>
            </form>
          </ScrollAnimate>

          {/* Content Area */}
          <AnimatePresence mode="wait">
            <motion.div
              key={viewMode}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </FadeSlideTransition>
  );
}
