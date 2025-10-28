'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  BookOpen, Clock, TrendingUp, Star, CheckCircle2,
  Play, ChevronRight, Award, BarChart3
} from 'lucide-react';
import { ShareCourse } from './ShareCourse';
import { CourseRatings } from './CourseRatings';

interface Module {
  id: string;
  order_index: number;
  title_en: string;
  title_es: string;
  content_en: string;
  content_es: string;
  type: string;
  estimated_time: number;
  resources: unknown[];
}

interface Course {
  id: string;
  title_en: string;
  title_es: string;
  description_en: string;
  description_es: string;
  category: string;
  difficulty: string;
  duration_minutes: number;
  topics: string[];
  enrollment_count: number;
  rating_avg: number;
  view_count: number;
  course_modules: Module[];
  user_progress?: unknown[];
}

interface CourseDetailProps {
  course: Course;
  locale: string;
}

const DIFFICULTY_COLORS = {
  beginner: 'bg-green-500/20 text-green-300 border-green-500/30',
  intermediate: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  advanced: 'bg-red-500/20 text-red-300 border-red-500/30'
};

const DIFFICULTY_LABELS = {
  beginner: { en: 'Beginner', es: 'Principiante' },
  intermediate: { en: 'Intermediate', es: 'Intermedio' },
  advanced: { en: 'Advanced', es: 'Avanzado' }
};

export function CourseDetail({ course, locale }: CourseDetailProps) {
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [progress, setProgress] = useState<Record<string, boolean>>({});
  const [userId] = useState('demo-user'); // TODO: Replace with real auth

  const title = locale === 'es' ? course.title_es : course.title_en;
  const description = locale === 'es' ? course.description_es : course.description_en;
  const difficultyLabel = DIFFICULTY_LABELS[course.difficulty as keyof typeof DIFFICULTY_LABELS]?.[locale as 'en' | 'es'];

  // Sort modules by order_index
  const modules = [...(course.course_modules || [])].sort((a, b) => a.order_index - b.order_index);

  useEffect(() => {
    // Set first module as selected by default
    if (modules.length > 0 && !selectedModule) {
      setSelectedModule(modules[0]);
    }
  }, [modules, selectedModule]);

  useEffect(() => {
    // Load progress from localStorage
    const saved = localStorage.getItem(`course-progress-${course.id}`);
    if (saved) {
      setProgress(JSON.parse(saved));
    }
  }, [course.id]);

  const handleModuleComplete = async (moduleId: string) => {
    const newProgress = { ...progress, [moduleId]: true };
    setProgress(newProgress);
    localStorage.setItem(`course-progress-${course.id}`, JSON.stringify(newProgress));

    // Save to database
    try {
      await fetch(`/api/courses/${course.id}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          moduleId,
          completed: true,
          timeSpent: 0
        })
      });
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  };

  const handleModuleSelect = (module: Module) => {
    setSelectedModule(module);
  };

  const completedCount = Object.values(progress).filter(Boolean).length;
  const totalModules = modules.length;
  const progressPercentage = totalModules > 0 ? (completedCount / totalModules) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/5">
      <div className="container mx-auto px-4 py-12">
        {/* Course Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className={`px-3 py-1 rounded-full text-xs font-medium border ${
              DIFFICULTY_COLORS[course.difficulty as keyof typeof DIFFICULTY_COLORS] || 'bg-gray-500/20 text-gray-300'
            }`}>
              {difficultyLabel}
            </div>
            {course.rating_avg > 0 && (
              <div className="flex items-center gap-1 text-yellow-400">
                <Star className="w-4 h-4 fill-current" />
                <span className="text-sm font-medium">{course.rating_avg.toFixed(1)}</span>
              </div>
            )}
          </div>

          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-blue-400 to-primary bg-clip-text text-transparent">
            {title}
          </h1>

          <p className="text-xl text-muted-foreground mb-6 max-w-3xl">
            {description}
          </p>

          {/* Share Button */}
          <div className="mb-6">
            <ShareCourse 
              courseId={course.id}
              title={title}
              locale={locale}
            />
          </div>

          {/* Stats */}
          <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              <span>{course.duration_minutes} {locale === 'es' ? 'minutos' : 'minutes'}</span>
            </div>
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              <span>{totalModules} {locale === 'es' ? 'módulos' : 'modules'}</span>
            </div>
            {course.enrollment_count > 0 && (
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                <span>{course.enrollment_count} {locale === 'es' ? 'estudiantes' : 'students'}</span>
              </div>
            )}
          </div>

          {/* Topics */}
          {course.topics && course.topics.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {course.topics.map((topic, i) => (
                <span
                  key={i}
                  className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm"
                >
                  {topic}
                </span>
              ))}
            </div>
          )}
        </motion.div>

        {/* Progress Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8 p-6 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-6 h-6 text-primary" />
              <h2 className="text-xl font-bold">
                {locale === 'es' ? 'Tu Progreso' : 'Your Progress'}
              </h2>
            </div>
            <div className="text-2xl font-bold text-primary">
              {Math.round(progressPercentage)}%
            </div>
          </div>

          <div className="relative h-3 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="absolute h-full bg-gradient-to-r from-primary to-blue-400"
            />
          </div>

          <div className="mt-3 text-sm text-muted-foreground">
            {completedCount} {locale === 'es' ? 'de' : 'of'} {totalModules} {locale === 'es' ? 'módulos completados' : 'modules completed'}
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Module List */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-1"
          >
            <div className="sticky top-24 space-y-3">
              <h2 className="text-2xl font-bold mb-4">
                {locale === 'es' ? 'Módulos del Curso' : 'Course Modules'}
              </h2>
              {modules.map((module, i) => {
                const moduleTitle = locale === 'es' ? module.title_es : module.title_en;
                const isCompleted = progress[module.id];
                const isSelected = selectedModule?.id === module.id;

                return (
                  <button
                    key={module.id}
                    onClick={() => handleModuleSelect(module)}
                    className={`w-full text-left p-4 rounded-xl border transition-all
                      ${isSelected 
                        ? 'bg-primary/20 border-primary' 
                        : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-muted-foreground">
                            {locale === 'es' ? 'Módulo' : 'Module'} {i + 1}
                          </span>
                          {isCompleted && <CheckCircle2 className="w-4 h-4 text-green-400" />}
                        </div>
                        <h3 className="font-semibold text-sm line-clamp-2">{moduleTitle}</h3>
                        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>{module.estimated_time} min</span>
                        </div>
                      </div>
                      <ChevronRight className={`w-5 h-5 transition-transform ${isSelected ? 'rotate-90' : ''}`} />
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>

          {/* Module Content */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-2"
          >
            {selectedModule ? (
              <div className="space-y-6">
                <div className="p-8 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10">
                  <h2 className="text-3xl font-bold mb-4">
                    {locale === 'es' ? selectedModule.title_es : selectedModule.title_en}
                  </h2>

                  <div className="prose prose-invert prose-primary max-w-none">
                    <div 
                      dangerouslySetInnerHTML={{ 
                        __html: (locale === 'es' ? selectedModule.content_es : selectedModule.content_en)
                          .replace(/\n/g, '<br />')
                          .replace(/#{1,6}\s(.+)/g, '<h3 class="text-xl font-bold mt-4 mb-2">$1</h3>')
                          .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                          .replace(/\*(.+?)\*/g, '<em>$1</em>')
                      }}
                    />
                  </div>

                  {/* Complete Button */}
                  <div className="mt-8 flex items-center justify-between pt-6 border-t border-white/10">
                    {progress[selectedModule.id] ? (
                      <div className="flex items-center gap-2 text-green-400">
                        <CheckCircle2 className="w-5 h-5" />
                        <span className="font-semibold">
                          {locale === 'es' ? '¡Módulo Completado!' : 'Module Completed!'}
                        </span>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleModuleComplete(selectedModule.id)}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary hover:bg-primary/80 
                                 text-white font-semibold transition-all"
                      >
                        <CheckCircle2 className="w-5 h-5" />
                        {locale === 'es' ? 'Marcar como Completado' : 'Mark as Complete'}
                      </button>
                    )}

                    {modules[selectedModule.order_index + 1] && (
                      <button
                        onClick={() => handleModuleSelect(modules[selectedModule.order_index + 1])}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl border border-primary 
                                 text-primary hover:bg-primary/10 font-semibold transition-all"
                      >
                        {locale === 'es' ? 'Siguiente Módulo' : 'Next Module'}
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Completion Achievement */}
                {progressPercentage === 100 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-8 rounded-2xl backdrop-blur-xl bg-gradient-to-br from-primary/20 to-blue-500/20 
                             border border-primary/50 text-center"
                  >
                    <Award className="w-16 h-16 mx-auto mb-4 text-primary" />
                    <h3 className="text-2xl font-bold mb-2">
                      {locale === 'es' ? '¡Felicitaciones!' : 'Congratulations!'}
                    </h3>
                    <p className="text-muted-foreground">
                      {locale === 'es' 
                        ? 'Has completado todos los módulos de este curso'
                        : 'You have completed all modules in this course'}
                    </p>
                  </motion.div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-96 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10">
                <div className="text-center">
                  <Play className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    {locale === 'es' 
                      ? 'Selecciona un módulo para comenzar'
                      : 'Select a module to start'}
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        </div>

        {/* Ratings & Reviews Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-12"
        >
          <CourseRatings 
            courseId={course.id}
            locale={locale}
            userId={userId}
          />
        </motion.div>
      </div>
    </div>
  );
}
