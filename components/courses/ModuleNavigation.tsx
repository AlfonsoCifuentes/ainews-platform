'use client';

import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { NormalizedModule } from '@/lib/courses/normalize';
import { loggers } from '@/lib/utils/logger';
import { useEffect } from 'react';

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
  useEffect(() => {
    loggers.course('ModuleNavigation mounted', {
      currentModuleId: currentModule.id,
      courseId,
      totalModules: modules.length,
      userProgressCount: userProgress.length
    });
  }, [currentModule.id, courseId, modules.length, userProgress.length]);

  const currentIndex = modules.findIndex((m) => m.id === currentModule.id);
  const prevModule = currentIndex > 0 ? modules[currentIndex - 1] : null;
  const nextModule = currentIndex < modules.length - 1 ? modules[currentIndex + 1] : null;

  // Check if next module is locked
  const isNextLocked = nextModule && !nextModule.is_free && !userProgress.find(
    (p) => p.module_id === currentModule.id && p.completed
  );

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
    backToCourse: 'Back to Course',
  } : {
    previous: 'Anterior',
    next: 'Siguiente',
    completeToUnlock: 'Completa el módulo actual para desbloquear',
    backToCourse: 'Volver al Curso',
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
          <Link href={`/${locale}/courses/${courseId}/learn?module=${prevModule.id}`}>
            <ChevronLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
            <span className="flex-1 text-left">{t.previous}</span>
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
          <Link href={`/${locale}/courses/${courseId}`}>
            <ChevronLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
            <span className="flex-1 text-left">{t.backToCourse}</span>
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
              <span className="flex-1 text-right">{t.next}</span>
              <ChevronRight className="w-5 h-5 ml-2" />
            </span>
          ) : (
            <Link href={`/${locale}/courses/${courseId}/learn?module=${nextModule.id}`} className="flex items-center justify-center w-full">
              <span className="flex-1 text-right">{t.next}</span>
              <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>
          )}
        </Button>
      )}
    </div>
  );
}
