'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronDown, 
  PlayCircle, 
  CheckCircle2, 
  Lock,
  Clock,
  FileText,
  Video,
  FileQuestion
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface Module {
  id: string;
  title_en: string;
  title_es: string;
  description_en: string;
  description_es: string;
  order_index: number;
  duration_minutes: number;
  content_type: 'video' | 'article' | 'quiz' | 'interactive';
  is_free: boolean;
}

interface Enrollment {
  id: string;
  user_id: string;
  course_id: string;
  enrolled_at: string;
}

interface Progress {
  id: string;
  enrollment_id: string;
  module_id: string;
  completed: boolean;
  completed_at?: string;
}

interface CourseModulesListProps {
  locale: 'en' | 'es';
  modules: Module[];
  courseId: string;
  enrollment: Enrollment | null;
  userProgress: Progress[];
}

export function CourseModulesList({
  locale,
  modules,
  courseId,
  enrollment,
  userProgress,
}: CourseModulesListProps) {
  const [expandedModule, setExpandedModule] = useState<string | null>(modules[0]?.id || null);

  const sortedModules = [...modules].sort((a, b) => a.order_index - b.order_index);

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

  const isModuleCompleted = (moduleId: string) => {
    return userProgress?.some((p) => p.module_id === moduleId && p.completed);
  };

  const canAccessModule = (module: Module) => {
    return module.is_free || !!enrollment;
  };

  return (
    <div className="space-y-3">
      {sortedModules.map((module, index) => {
        const Icon = getModuleIcon(module.content_type);
        const isExpanded = expandedModule === module.id;
        const isCompleted = isModuleCompleted(module.id);
        const canAccess = canAccessModule(module);
        const title = locale === 'en' ? module.title_en : module.title_es;
        const description = locale === 'en' ? module.description_en : module.description_es;

        return (
          <div
            key={module.id}
            className={cn(
              'rounded-xl border transition-all',
              isCompleted ? 'bg-primary/5 border-primary/20' : 'bg-card'
            )}
          >
            <button
              onClick={() => setExpandedModule(isExpanded ? null : module.id)}
              className="w-full p-4 flex items-center gap-4 text-left hover:bg-secondary/50 rounded-xl transition-colors"
            >
              {/* Module Number */}
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0',
                isCompleted 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-secondary text-muted-foreground'
              )}>
                {isCompleted ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  index + 1
                )}
              </div>

              {/* Module Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                  <h3 className="font-semibold truncate">{title}</h3>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {module.duration_minutes} min
                  </span>
                  {module.is_free && (
                    <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-medium">
                      Free
                    </span>
                  )}
                </div>
              </div>

              {/* Status Icon */}
              <div className="shrink-0">
                {!canAccess ? (
                  <Lock className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronDown 
                    className={cn(
                      'w-5 h-5 text-muted-foreground transition-transform',
                      isExpanded && 'rotate-180'
                    )}
                  />
                )}
              </div>
            </button>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 space-y-4">
                    <p className="text-sm text-muted-foreground pl-12">
                      {description}
                    </p>

                    {canAccess ? (
                      <div className="pl-12">
                        <Link
                          href={`/${locale}/courses/${courseId}/learn?module=${module.id}`}
                          className={cn(
                            'inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors',
                            isCompleted
                              ? 'bg-secondary text-foreground hover:bg-secondary/80'
                              : 'bg-primary text-primary-foreground hover:bg-primary/90'
                          )}
                        >
                          {isCompleted ? (
                            <>
                              <CheckCircle2 className="w-4 h-4" />
                              {locale === 'en' ? 'Review' : 'Revisar'}
                            </>
                          ) : (
                            <>
                              <PlayCircle className="w-4 h-4" />
                              {locale === 'en' ? 'Start' : 'Comenzar'}
                            </>
                          )}
                        </Link>
                      </div>
                    ) : (
                      <div className="pl-12 text-sm text-muted-foreground flex items-center gap-2">
                        <Lock className="w-4 h-4" />
                        {locale === 'en' 
                          ? 'Enroll to unlock this module' 
                          : 'Inscríbete para desbloquear este módulo'}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
