'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from '@/i18n';
import Image from 'next/image';

interface Course {
  id: string;
  title: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  duration: string;
  progress?: number;
  heroImage?: string;
  description?: string;
  moduleCount?: number;
}

interface CourseGalaxyNavigatorProps {
  courses: Course[];
  featuredCourseId?: string;
  locale: 'en' | 'es';
}

/**
 * CourseGalaxyNavigator - Tracklist-style course navigation
 * Reference: phlntn.com tracklist navigation with cross-panel preview
 * - Left: Course list (tracklist style)
 * - Right: Preview panel for hovered/selected course
 */
export function CourseGalaxyNavigator({ courses, featuredCourseId, locale }: CourseGalaxyNavigatorProps) {
  const [hoveredCourse, setHoveredCourse] = useState<Course | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(
    courses.find(c => c.id === featuredCourseId) || courses[0] || null
  );
  const listRef = useRef<HTMLDivElement>(null);

  const displayedCourse = hoveredCourse || selectedCourse;

  const levelColors = {
    beginner: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/40' },
    intermediate: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/40' },
    advanced: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/40' },
  };

  const levelLabels = {
    beginner: locale === 'en' ? 'Beginner' : 'Principiante',
    intermediate: locale === 'en' ? 'Intermediate' : 'Intermedio',
    advanced: locale === 'en' ? 'Advanced' : 'Avanzado',
  };

  return (
    <section className="relative py-16 lg:py-24 overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        {/* Header */}
        <div className="mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex items-center gap-3 mb-3"
          >
            <span className="text-xs uppercase tracking-[0.2em] text-primary/80 font-semibold">
              {locale === 'en' ? 'Learning Paths' : 'Rutas de Aprendizaje'}
            </span>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-black text-white"
          >
            {locale === 'en' ? 'Course Galaxy' : 'Galaxia de Cursos'}
          </motion.h2>
        </div>

        {/* Two-panel layout */}
        <div className="grid lg:grid-cols-[1fr_1.2fr] gap-8">
          {/* Left: Tracklist */}
          <div ref={listRef} className="relative">
            {/* Track numbers column line */}
            <div className="absolute left-5 top-0 bottom-0 w-px bg-white/5" />

            <div className="space-y-1">
              {courses.map((course, i) => (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  onMouseEnter={() => setHoveredCourse(course)}
                  onMouseLeave={() => setHoveredCourse(null)}
                  onClick={() => setSelectedCourse(course)}
                  className={`
                    relative flex items-center gap-4 p-4 rounded-lg cursor-pointer
                    transition-all duration-200
                    ${selectedCourse?.id === course.id 
                      ? 'bg-white/10 border border-primary/30' 
                      : 'hover:bg-white/5 border border-transparent'
                    }
                  `}
                >
                  {/* Track number */}
                  <div className="relative z-10 w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-mono text-white/50">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                  </div>

                  {/* Course info */}
                  <div className="flex-1 min-w-0">
                    <h3 className={`
                      font-bold truncate transition-colors
                      ${selectedCourse?.id === course.id ? 'text-primary' : 'text-white group-hover:text-primary'}
                    `}>
                      {course.title}
                    </h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`
                        text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded
                        ${levelColors[course.level].bg} ${levelColors[course.level].text}
                      `}>
                        {levelLabels[course.level]}
                      </span>
                      <span className="text-xs text-white/40">
                        {course.duration}
                      </span>
                    </div>
                  </div>

                  {/* Progress indicator */}
                  {course.progress !== undefined && course.progress > 0 && (
                    <div className="flex-shrink-0 w-12">
                      <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-primary rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${course.progress}%` }}
                          transition={{ delay: 0.3, duration: 0.5 }}
                        />
                      </div>
                      <span className="text-[10px] text-white/40 mt-0.5 block text-right">
                        {course.progress}%
                      </span>
                    </div>
                  )}

                  {/* Arrow */}
                  <motion.span
                    className="text-white/20"
                    animate={{ 
                      x: selectedCourse?.id === course.id ? [0, 3, 0] : 0,
                      opacity: selectedCourse?.id === course.id ? 1 : 0.3
                    }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    →
                  </motion.span>
                </motion.div>
              ))}
            </div>

            {/* View all link */}
            <Link href="/courses">
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                className="mt-6 flex items-center gap-2 text-sm text-white/50 hover:text-primary transition-colors group"
              >
                <span>{locale === 'en' ? 'View all courses' : 'Ver todos los cursos'}</span>
                <motion.span
                  animate={{ x: [0, 4, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  →
                </motion.span>
              </motion.div>
            </Link>
          </div>

          {/* Right: Preview panel */}
          <div className="relative hidden lg:block">
            <AnimatePresence mode="wait">
              {displayedCourse && (
                <motion.div
                  key={displayedCourse.id}
                  initial={{ opacity: 0, y: 20, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.98 }}
                  transition={{ duration: 0.3 }}
                  className="sticky top-24"
                >
                  <Link href={`/courses/${displayedCourse.id}`}>
                    <div className="relative rounded-3xl overflow-hidden border border-white/10 bg-white/[0.02] backdrop-blur-sm group cursor-pointer">
                      {/* Hero image */}
                      <div className="relative h-64 overflow-hidden">
                        {displayedCourse.heroImage ? (
                          <Image
                            src={displayedCourse.heroImage}
                            alt={displayedCourse.title}
                            fill
                            className="object-cover transition-transform duration-700 group-hover:scale-105"
                          />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-primary/10 to-amber-500/20" />
                        )}
                        
                        {/* Gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#020309] via-black/40 to-transparent" />

                        {/* Level badge */}
                        <div className="absolute top-4 left-4">
                          <span className={`
                            px-3 py-1 text-xs uppercase tracking-wider font-bold rounded-full
                            ${levelColors[displayedCourse.level].bg} ${levelColors[displayedCourse.level].text} ${levelColors[displayedCourse.level].border} border
                          `}>
                            {levelLabels[displayedCourse.level]}
                          </span>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-6">
                        <h3 className="text-2xl font-black text-white mb-3 group-hover:text-primary transition-colors">
                          {displayedCourse.title}
                        </h3>
                        
                        {displayedCourse.description && (
                          <p className="text-white/60 text-sm leading-relaxed mb-4 line-clamp-2">
                            {displayedCourse.description}
                          </p>
                        )}

                        <div className="flex items-center gap-6 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-white/40">⏱</span>
                            <span className="text-white/70">{displayedCourse.duration}</span>
                          </div>
                          {displayedCourse.moduleCount && (
                            <div className="flex items-center gap-2">
                              <span className="text-white/40">📚</span>
                              <span className="text-white/70">
                                {displayedCourse.moduleCount} {locale === 'en' ? 'modules' : 'módulos'}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Progress bar if applicable */}
                        {displayedCourse.progress !== undefined && displayedCourse.progress > 0 && (
                          <div className="mt-4">
                            <div className="flex items-center justify-between text-xs text-white/50 mb-1">
                              <span>{locale === 'en' ? 'Progress' : 'Progreso'}</span>
                              <span>{displayedCourse.progress}%</span>
                            </div>
                            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                              <motion.div
                                className="h-full bg-gradient-to-r from-primary to-amber-500 rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${displayedCourse.progress}%` }}
                                transition={{ delay: 0.2, duration: 0.6 }}
                              />
                            </div>
                          </div>
                        )}

                        {/* CTA */}
                        <motion.div
                          className="mt-6 flex items-center gap-2 text-primary font-semibold"
                          animate={{ x: [0, 4, 0] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          {displayedCourse.progress 
                            ? (locale === 'en' ? 'Continue Learning' : 'Continuar')
                            : (locale === 'en' ? 'Start Course' : 'Comenzar Curso')
                          }
                          <span>→</span>
                        </motion.div>
                      </div>

                      {/* Glow effect */}
                      <div className="absolute -inset-px rounded-3xl bg-gradient-to-r from-primary/0 via-primary/10 to-amber-500/0 opacity-0 group-hover:opacity-100 blur-xl transition-opacity pointer-events-none" />
                    </div>
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
