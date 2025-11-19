'use client';

import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { NormalizedModule } from '@/lib/courses/normalize';
import courseLogger from '@/lib/logging/course-logger';
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
    courseLogger.info('ModuleNavigation', 'Component mounted', {
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

  courseLogger.info('ModuleNavigation', 'Navigation state', {
    currentIndex,
    hasPrev: !!prevModule,
    hasNext: !!nextModule,
    isNextLocked,
    nextModuleId: nextModule?.id
  });

  const handleNextClick = () => {
    courseLogger.info('ModuleNavigation', 'Next module clicked', {
      nextModuleId: nextModule?.id,
      courseId,
      isLocked: isNextLocked
    });
  };

  const handlePrevClick = () => {
    courseLogger.info('ModuleNavigation', 'Previous module clicked', {
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
    <div className="flex items-center justify-between gap-4 mt-12 pt-8 border-t">
      {/* Previous Button */}
      {prevModule ? (
        <Button
          asChild
          variant="outline"
          className="flex-1"
          onClick={handlePrevClick}
        >
          <Link href={`/${locale}/courses/${courseId}/learn?module=${prevModule.id}`}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            {t.previous}
          </Link>
        </Button>
      ) : (
        <Button
          asChild
          variant="outline"
          className="flex-1"
          onClick={handlePrevClick}
        >
          <Link href={`/${locale}/courses/${courseId}`}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            {t.backToCourse}
          </Link>
        </Button>
      )}

      {/* Next Button */}
      {nextModule && (
        <Button
          asChild={!isNextLocked}
          disabled={!!isNextLocked}
          className="flex-1"
          title={isNextLocked ? t.completeToUnlock : undefined}
          onClick={handleNextClick}
        >
          {isNextLocked ? (
            <span>
              {t.next}
              <ChevronRight className="w-4 h-4 ml-2" />
            </span>
          ) : (
            <Link href={`/${locale}/courses/${courseId}/learn?module=${nextModule.id}`}>
              {t.next}
              <ChevronRight className="w-4 h-4 ml-2" />
            </Link>
          )}
        </Button>
      )}
    </div>
  );
}
