'use client';

import { useState } from 'react';
import Link from 'next/link';
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
import type { NormalizedModule } from '@/lib/courses/normalize';

// Brutalist design tokens
const BRUTALIST = {
  bg: '#020309',
  bgCard: '#0A0A0A',
  text: '#EAEAEA',
  textMuted: '#888888',
  border: '#1F1F1F',
};

type Module = Pick<
  NormalizedModule,
  |
    'id'
    | 'title_en'
    | 'title_es'
    | 'description_en'
    | 'description_es'
    | 'order_index'
    | 'duration_minutes'
    | 'content_type'
    | 'is_free'
>;

interface Enrollment {
  id: string;
  user_id: string;
  course_id: string;
  relationship_type?: string;
  enrolled_at?: string;
  progress_percentage?: number;
}

interface Progress {
  id: string;
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
  
  console.log('[CourseModulesList] Props:', { 
    modulesCount: modules.length,
    courseId,
    hasEnrollment: !!enrollment,
    progressCount: userProgress?.length || 0 
  });

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

  if (sortedModules.length === 0) {
    return (
      <div 
        className="p-8 border border-dashed text-center"
        style={{ backgroundColor: BRUTALIST.bg, borderColor: BRUTALIST.border }}
      >
        <FileText className="w-12 h-12 mx-auto mb-3" style={{ color: BRUTALIST.textMuted }} />
        <p className="font-mono" style={{ color: BRUTALIST.textMuted }}>
          {locale === 'en' 
            ? 'No modules yet. Course content is being prepared.' 
            : 'Sin módulos aún. El contenido del curso se está preparando.'}
        </p>
      </div>
    );
  }

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
            className="border transition-all"
            style={{ 
              backgroundColor: isCompleted ? BRUTALIST.bg : BRUTALIST.bgCard,
              borderColor: isCompleted ? BRUTALIST.text : BRUTALIST.border,
            }}
          >
            <button
              onClick={() => setExpandedModule(isExpanded ? null : module.id)}
              className="w-full p-4 flex items-center gap-4 text-left transition-colors"
              style={{ color: BRUTALIST.text }}
            >
              {/* Module Number */}
              <div 
                className="w-8 h-8 flex items-center justify-center font-mono font-bold text-sm shrink-0 border"
                style={{ 
                  backgroundColor: isCompleted ? BRUTALIST.text : BRUTALIST.bg,
                  color: isCompleted ? BRUTALIST.bg : BRUTALIST.textMuted,
                  borderColor: isCompleted ? BRUTALIST.text : BRUTALIST.border,
                }}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  index + 1
                )}
              </div>

              {/* Module Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-4 h-4 shrink-0" style={{ color: BRUTALIST.textMuted }} />
                  <h3 className="font-mono font-bold truncate" style={{ color: BRUTALIST.text }}>{title}</h3>
                </div>
                <div className="flex items-center gap-3 font-mono text-sm" style={{ color: BRUTALIST.textMuted }}>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {module.duration_minutes} min
                  </span>
                  {module.is_free && (
                    <span 
                      className="px-2 py-0.5 border font-mono text-xs uppercase"
                      style={{ borderColor: BRUTALIST.text, color: BRUTALIST.text }}
                    >
                      Free
                    </span>
                  )}
                </div>
              </div>

              {/* Status Icon */}
              <div className="shrink-0">
                {!canAccess ? (
                  <Lock className="w-5 h-5" style={{ color: BRUTALIST.textMuted }} />
                ) : (
                  <ChevronDown 
                    className="w-5 h-5 transition-transform"
                    style={{ 
                      color: BRUTALIST.textMuted,
                      transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    }}
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
                    <p className="font-mono text-sm pl-12" style={{ color: BRUTALIST.textMuted }}>
                      {description}
                    </p>

                    {canAccess ? (
                      <div className="pl-12">
                        <Link
                          href={`/${locale}/courses/${courseId}/learn?module=${module.id}`}
                          className="inline-flex items-center gap-2 px-4 py-2 font-mono text-sm uppercase tracking-wider transition-colors border"
                          style={{
                            backgroundColor: isCompleted ? 'transparent' : BRUTALIST.text,
                            color: isCompleted ? BRUTALIST.text : BRUTALIST.bg,
                            borderColor: BRUTALIST.text,
                          }}
                        >
                          {isCompleted ? (
                            <>
                              <CheckCircle2 className="w-4 h-4" />
                              {locale === 'en' ? 'Review' : 'Revisar'}
                            </>
                          ) : (
                            <>
                              <PlayCircle className="w-4 h-4" />
                              {locale === 'en' ? 'Start' : 'Iniciar'}
                            </>
                          )}
                        </Link>
                      </div>
                    ) : (
                      <div className="pl-12 font-mono text-sm flex items-center gap-2" style={{ color: BRUTALIST.textMuted }}>
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
