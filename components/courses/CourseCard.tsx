'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Clock, BookOpen, TrendingUp, Star, Play } from 'lucide-react';
import { ShareCourseButton } from './ShareCourseButton';

interface Course {
  id: string;
  title_en: string;
  title_es: string;
  description_en: string;
  description_es: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration_minutes: number;
  topics: string[];
  enrollment_count: number;
  rating_avg: number;
  view_count: number;
  created_at: string;
}

interface CourseCardProps {
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

export function CourseCard({ course, locale }: CourseCardProps) {
  const title = locale === 'es' ? course.title_es : course.title_en;
  const description = locale === 'es' ? course.description_es : course.description_en;
  const difficultyLabel = DIFFICULTY_LABELS[course.difficulty][locale as 'en' | 'es'];

  return (
    <motion.div
      whileHover={{ scale: 1.02, rotateX: 2, rotateY: 2 }}
      className="group relative h-full overflow-hidden rounded-2xl backdrop-blur-xl 
                 bg-white/5 border border-white/10 hover:border-primary/50
                 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/20"
    >
      {/* Share Button - Absolute positioned */}
      <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <div onClick={(e) => e.preventDefault()}>
          <ShareCourseButton
            courseId={course.id}
            courseTitle={title}
            courseDescription={description}
            locale={locale as 'en' | 'es'}
            variant="minimal"
          />
        </div>
      </div>

      <Link href={`/${locale}/courses/${course.id}`} className="block p-6 h-full flex flex-col">{/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className={`px-3 py-1 rounded-full text-xs font-medium border ${DIFFICULTY_COLORS[course.difficulty]}`}>
            {difficultyLabel}
          </div>
          {course.rating_avg > 0 && (
            <div className="flex items-center gap-1 text-yellow-400">
              <Star className="w-4 h-4 fill-current" />
              <span className="text-sm font-medium">{course.rating_avg.toFixed(1)}</span>
            </div>
          )}
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors line-clamp-2">
          {title}
        </h3>

        {/* Description */}
        <p className="text-muted-foreground text-sm mb-4 line-clamp-3 flex-grow">
          {description}
        </p>

        {/* Topics */}
        {course.topics && course.topics.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {course.topics.slice(0, 3).map((topic, i) => (
              <span
                key={i}
                className="px-2 py-1 rounded-md bg-primary/10 text-primary text-xs"
              >
                {topic}
              </span>
            ))}
            {course.topics.length > 3 && (
              <span className="px-2 py-1 rounded-md bg-white/5 text-muted-foreground text-xs">
                +{course.topics.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Footer Stats */}
        <div className="flex items-center justify-between text-sm text-muted-foreground pt-4 border-t border-white/10">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{course.duration_minutes} {locale === 'es' ? 'min' : 'min'}</span>
          </div>
          
          <div className="flex items-center gap-3">
            {course.enrollment_count > 0 && (
              <div className="flex items-center gap-1">
                <BookOpen className="w-4 h-4" />
                <span>{course.enrollment_count}</span>
              </div>
            )}
            
            {course.view_count > 0 && (
              <div className="flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                <span>{course.view_count}</span>
              </div>
            )}
          </div>
        </div>

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent 
                      opacity-0 group-hover:opacity-100 transition-opacity duration-300 
                      pointer-events-none flex items-end justify-center pb-6">
          <div className="flex items-center gap-2 text-white font-semibold">
            <Play className="w-5 h-5" />
            <span>{locale === 'es' ? 'Comenzar Curso' : 'Start Course'}</span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
