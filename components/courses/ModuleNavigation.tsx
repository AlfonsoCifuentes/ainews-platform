'use client';

import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { NormalizedModule } from '@/lib/courses/normalize';
import { loggers } from '@/lib/utils/logger';
import { useEffect, useMemo, useState } from 'react';

type Module = Pick<
  NormalizedModule,
  'id' | 'title_en' | 'title_es' | 'order_index' | 'is_free'
>;

interface Progress {
  module_id: string;
  completed: boolean;
}

interface ModuleNavigationProps {
  locale: 'en' | 'es';
  courseId: string;
  currentModule: Module;
  modules: Module[];
  userProgress: Progress[];
}

export function ModuleNavigation({
  locale,
  courseId,
  currentModule,
  modules,
  userProgress,
}: ModuleNavigationProps) {
  const [completionMap, setCompletionMap] = useState<Record<string, boolean>>(() => {
    const seed: Record<string, boolean> = {};
    userProgress.forEach((progress) => {
      if (progress.completed) {
        seed[progress.module_id] = true;
      }
    });
    return seed;
  });

  useEffect(() => {
    const latest: Record<string, boolean> = {};
    userProgress.forEach((progress) => {
      if (progress.completed) {
        latest[progress.module_id] = true;
      }
    });
    setCompletionMap(latest);
  }, [userProgress]);

  useEffect(() => {
    const handleCompletion = (event: Event) => {
      const detail = (event as CustomEvent<{ moduleId: string; courseId: string }>).detail;
      if (!detail || detail.courseId !== courseId) {
        return;
      }
      setCompletionMap((prev) => ({ ...prev, [detail.moduleId]: true }));
    };

    window.addEventListener('course-complete', handleCompletion as EventListener);
    return () => window.removeEventListener('course-complete', handleCompletion as EventListener);
  }, [courseId]);

  useEffect(() => {
    loggers.course('ModuleNavigation mounted', {
      currentModuleId: currentModule.id,
      courseId,
      totalModules: modules.length,
      userProgressCount: userProgress.length,
      completedMapSize: Object.keys(completionMap).length
    });
  }, [completionMap, courseId, currentModule.id, modules.length, userProgress.length]);

  const { currentIndex, prevModule, nextModule, isNextLocked } = useMemo(() => {
    const idx = modules.findIndex((m) => m.id === currentModule.id);
    const prev = idx > 0 ? modules[idx - 1] : null;
    const next = idx < modules.length - 1 ? modules[idx + 1] : null;
    const nextLocked = next && !next.is_free && !completionMap[currentModule.id];
    return {
      currentIndex: idx,
      prevModule: prev,
      nextModule: next,
      isNextLocked: nextLocked,
    };
  }, [completionMap, currentModule.id, modules]);

  loggers.course('Navigation state updated', {
    currentIndex,
    hasPrev: !!prevModule,
    hasNext: !!nextModule,
    isNextLocked,
    nextModuleId: nextModule?.id
  });

  const handleNextClick = () => {
    loggers.course('Next module clicked', {
      nextModuleId: nextModule?.id,
      courseId,
      isLocked: isNextLocked
    });
  };

  const handlePrevClick = () => {
    loggers.course('Previous module clicked', {
      prevModuleId: prevModule?.id,
      courseId
    });
  };

  const t = locale === 'en' ? {
    previous: 'Previous',
    next: 'Next',
    completeToUnlock: 'Complete current module to unlock',
    backToCourse: 'Course',
  } : {
    previous: 'Anterior',
    next: 'Siguiente',
    completeToUnlock: 'Completa el módulo actual para desbloquear',
    backToCourse: 'Curso',
  };

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-6 mt-16 pt-10 border-t-2 border-border">
      {/* Previous Button */}
      {prevModule ? (
        <Button
          asChild
          variant="outline"
          size="lg"
          className="group w-full sm:w-auto min-w-[200px] h-14 text-base font-semibold border-2 hover:border-primary hover:bg-primary/10 transition-all"
          onClick={handlePrevClick}
        >
          <Link href={`/${locale}/courses/${courseId}/learn?module=${prevModule.id}`} className="flex items-center justify-center">
            <ChevronLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
            <span>{t.previous}</span>
          </Link>
        </Button>
      ) : (
        <Button
          asChild
          variant="outline"
          size="lg"
          className="group w-full sm:w-auto min-w-[200px] h-14 text-base font-semibold border-2 hover:border-primary hover:bg-primary/10 transition-all"
          onClick={handlePrevClick}
        >
          <Link href={`/${locale}/courses/${courseId}`} className="flex items-center justify-center">
            <ChevronLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
            <span>{t.backToCourse}</span>
          </Link>
        </Button>
      )}

      {/* Next Button */}
      {nextModule && (
        <Button
          asChild={!isNextLocked}
          disabled={!!isNextLocked}
          size="lg"
          className="group w-full sm:w-auto min-w-[200px] h-14 text-base font-semibold border-2 border-primary bg-primary text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          title={isNextLocked ? t.completeToUnlock : undefined}
          onClick={handleNextClick}
        >
          {isNextLocked ? (
            <span className="flex items-center justify-center">
              <span>{t.next}</span>
              <ChevronRight className="w-5 h-5 ml-2" />
            </span>
          ) : (
            <Link href={`/${locale}/courses/${courseId}/learn?module=${nextModule.id}`} className="flex items-center justify-center w-full">
              <span>{t.next}</span>
              <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>
          )}
        </Button>
      )}
    </div>
  );
}
