'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Clock, BookOpen, TrendingUp, Star, Play, ArrowRight } from 'lucide-react';
import { ShareCourseButton } from './ShareCourseButton';
import { getClientAuthClient } from '@/lib/auth/auth-client';

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
  
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkEnrollment = async () => {
      try {
        const supabase = getClientAuthClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setIsEnrolled(false);
          return;
        }

        // Check if user is enrolled in this course
        const { data: enrollment } = await supabase
          .from('user_courses')
          .select('id')
          .eq('user_id', user.id)
          .eq('course_id', course.id)
          .eq('relationship_type', 'enrolled')
          .single();

        setIsEnrolled(!!enrollment);
      } catch (error) {
        console.error('[CourseCard] Error checking enrollment:', error);
        setIsEnrolled(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkEnrollment();
  }, [course.id]);

  const buttonText = isEnrolled 
    ? (locale === 'es' ? 'Continuar' : 'Continue')
    : (locale === 'es' ? 'Comenzar' : 'Start');

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="group relative h-full overflow-hidden rounded-2xl backdrop-blur-xl 
                 bg-white/5 border border-white/10 hover:border-primary/50
                 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/20
                 flex flex-col"
    >
      {/* Share Button - Top Right */}
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

      {/* Content Section - Clickable */}
      <Link href={`/${locale}/courses/${course.id}`} className="block p-6 flex flex-col flex-grow">
        {/* Header */}
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
            <span>{course.duration_minutes} min</span>
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
      </Link>

      {/* Button Section - Fixed at bottom, NOT affected by hover */}
      <div className="p-6 pt-0 mt-auto">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={(e) => {
            e.preventDefault();
            // Navigate to course detail
            window.location.href = `/${locale}/courses/${course.id}`;
          }}
          disabled={isChecking}
          className={`w-full py-3 px-4 rounded-xl font-semibold transition-all duration-300 
                       flex items-center justify-center gap-2
                       ${isEnrolled 
                         ? 'bg-primary/20 hover:bg-primary/30 text-primary border border-primary/50' 
                         : 'bg-primary hover:bg-primary/90 text-white border border-primary'
                       }
                       disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isChecking ? (
            <>
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              <span>{locale === 'es' ? 'Cargando...' : 'Loading...'}</span>
            </>
          ) : (
            <>
              {isEnrolled ? (
                <>
                  <ArrowRight className="w-5 h-5" />
                  <span>{buttonText}</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  <span>{buttonText}</span>
                </>
              )}
            </>
          )}
        </motion.button>
      </div>

      {/* Enrolled Badge - Optional visual indicator */}
      {isEnrolled && !isChecking && (
        <div className="absolute top-4 left-4 z-10 bg-primary/20 border border-primary/50 text-primary 
                        px-3 py-1 rounded-full text-xs font-medium">
          {locale === 'es' ? 'Matriculado' : 'Enrolled'}
        </div>
      )}
    </motion.div>
  );
}
