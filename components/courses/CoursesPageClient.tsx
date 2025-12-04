"use client";

import { ReactNode } from 'react';

interface CoursesPageClientProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

export function CoursesPageClient({ title, subtitle, children }: CoursesPageClientProps) {
  return (
    <main className="min-h-screen bg-[#020309]">
      {/* Brutalist Header */}
      <section className="py-24 border-t border-[#1F1F1F] relative z-10">
        <div className="px-6 md:px-12 max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center gap-4 mb-2">
            <div className="h-px w-12 bg-white/50" />
            <h2 className="text-sm font-mono tracking-widest text-[#888888]">
              AI-POWERED LEARNING
            </h2>
            <div className="h-px w-12 bg-white/50" />
          </div>
          
          <h1 className="mt-8 text-4xl md:text-5xl font-bold text-white tracking-tight mb-4">
            {title}
          </h1>
          <p className="max-w-2xl mx-auto text-lg text-[#888888] font-mono">
            {subtitle}
          </p>
        </div>
      </section>

      <div className="px-6 md:px-12 pb-24 max-w-4xl mx-auto">
        {children}
      </div>
    </main>
  );
}
