'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, 
  Lock, 
  PlayCircle,
  X,
  Menu,
  Clock,
  Video,
  FileText,
  FileQuestion
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import type { NormalizedModule } from '@/lib/courses/normalize';

type Module = Pick<
  NormalizedModule,
  'id' | 'title_en' | 'title_es' | 'order_index' | 'duration_minutes' | 'content_type' | 'is_free'
>;

interface Progress {
  module_id: string;
  completed: boolean;
}

interface Course {
  title_en: string;
  title_es: string;
  thumbnail_url?: string | null;
}

interface ModuleSidebarProps {
  locale: 'en' | 'es';
  courseId: string;
  course: Course;
  modules: Module[];
  currentModuleId: string;
  userProgress: Progress[];
}

export function ModuleSidebar({
  locale,
  courseId,
  course,
  modules,
  currentModuleId,
  userProgress,
}: ModuleSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
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

  const t = locale === 'en' ? {
    courseContent: 'Course Content',
    modules: 'modules',
    completed: 'completed',
    locked: 'Locked',
    current: 'Current',
  } : {
    courseContent: 'Contenido del Curso',
    modules: 'módulos',
    completed: 'completado',
    locked: 'Bloqueado',
    current: 'Actual',
  };

  const title = locale === 'en' ? course.title_en : course.title_es;
  const completedCount = useMemo(() => modules.filter((m) => completionMap[m.id]).length, [completionMap, modules]);

  const getModuleIcon = (type: string) => {
    switch (type) {
      case 'video':
        return Video;
      case 'article':
        return FileText;
      case 'quiz':
        return FileQuestion;
      default:
        return PlayCircle;
    }
  };

  const isModuleAccessible = (module: Module, index: number) => {
    if (module.is_free) return true;
    if (index === 0) return true;

    const prevModule = modules[index - 1];
    return !!completionMap[prevModule.id];
  };

  const SidebarContent = () => (
    <div className="h-full flex flex-col bg-card border-r">
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg">{t.courseContent}</h2>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setIsOpen(false)}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        <Link
          href={`/${locale}/courses/${courseId}`}
          className="block group"
        >
          <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors line-clamp-2">
            {title}
          </h3>
        </Link>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{completedCount}/{modules.length} {t.completed}</span>
        </div>

        {/* Progress Bar */}
        <div className="mt-3 h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${(completedCount / modules.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Modules List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {modules.map((module, index) => {
          const Icon = getModuleIcon(module.content_type);
          const isCompleted = completionMap[module.id];
          const isCurrent = module.id === currentModuleId;
          const isAccessible = isModuleAccessible(module, index);
          const moduleTitle = locale === 'en' ? module.title_en : module.title_es;

          return (
            <Link
              key={module.id}
              href={
                isAccessible
                  ? `/${locale}/courses/${courseId}/learn?module=${module.id}`
                  : '#'
              }
              className={cn(
                'block p-4 rounded-xl transition-all',
                isCurrent
                  ? 'bg-primary text-primary-foreground shadow-lg'
                  : isCompleted
                  ? 'bg-primary/10 hover:bg-primary/20'
                  : isAccessible
                  ? 'bg-secondary hover:bg-secondary/80'
                  : 'bg-secondary/50 opacity-50 cursor-not-allowed'
              )}
              onClick={(e) => {
                if (!isAccessible) {
                  e.preventDefault();
                }
                if (isAccessible && window.innerWidth < 1024) {
                  setIsOpen(false);
                }
              }}
            >
              <div className="flex items-start gap-3">
                {/* Status Icon */}
                <div className="shrink-0 mt-0.5">
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : !isAccessible ? (
                    <Lock className="w-5 h-5" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold opacity-70">
                      {index + 1}
                    </span>
                    {isCurrent && (
                      <span className="text-xs px-2 py-0.5 bg-white/20 rounded-full">
                        {t.current}
                      </span>
                    )}
                  </div>
                  <h4 className="font-medium text-sm line-clamp-2 mb-1">
                    {moduleTitle}
                  </h4>
                  <div className="flex items-center gap-2 text-xs opacity-70">
                    <Clock className="w-3 h-3" />
                    <span>{module.duration_minutes} min</span>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Toggle */}
      <Button
        variant="outline"
        size="icon"
        className="fixed top-20 left-4 z-50 lg:hidden"
        onClick={() => setIsOpen(true)}
      >
        <Menu className="w-5 h-5" />
      </Button>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:block fixed inset-y-0 left-0 w-80 z-40 pt-16">
        <SidebarContent />
      </aside>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 lg:hidden"
              onClick={() => setIsOpen(false)}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed inset-y-0 left-0 w-80 z-50 lg:hidden"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
