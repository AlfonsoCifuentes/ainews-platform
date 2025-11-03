'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface CourseProgressProps {
  locale: 'en' | 'es';
  progress: number;
  completedModules: number;
  totalModules: number;
  courseId?: string;
}

export function CourseProgress({ 
  locale, 
  progress, 
  completedModules, 
  totalModules,
  courseId 
}: CourseProgressProps) {
  const t = locale === 'en' ? {
    yourProgress: 'Your Progress',
    completed: 'completed',
    continuelearning: 'Continue Learning',
    startCourse: 'Start Course',
  } : {
    yourProgress: 'Tu Progreso',
    completed: 'completado',
    continuelearning: 'Continuar Aprendiendo',
    startCourse: 'Comenzar Curso',
  };

  const isComplete = progress >= 100;

  return (
    <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          {t.yourProgress}
        </span>
        <span className="text-sm font-bold text-primary">
          {completedModules}/{totalModules} {t.completed}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="relative h-3 bg-secondary rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-primary/80 rounded-full"
        />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-2xl font-bold">{Math.round(progress)}%</span>
        {isComplete ? (
          <div className="flex items-center gap-2 text-primary">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-semibold">Complete!</span>
          </div>
        ) : courseId ? (
          <Button asChild className="rounded-xl">
            <Link href={`/${locale}/courses/${courseId}/learn`}>
              <PlayCircle className="w-4 h-4 mr-2" />
              {completedModules > 0 ? t.continuelearning : t.startCourse}
            </Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
