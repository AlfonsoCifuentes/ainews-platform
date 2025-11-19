'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Clock, BookOpen, TrendingUp, Star, Play, ArrowRight, CheckCircle, Zap } from 'lucide-react';
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

// XP rewards based on difficulty
const XP_REWARDS = {
  beginner: 50,
  intermediate: 100,
  advanced: 200
};

// Gradient backgrounds and borders based on difficulty
const DIFFICULTY_STYLES = {
  beginner: {
    badge: 'bg-green-500/20 text-green-300 border-green-500/30',
    border: 'hover:border-green-500/50',
    progress: 'bg-green-500/20',
    progressFill: 'bg-green-500',
    glow: 'hover:shadow-green-500/20',
    gradient: 'from-green-500/10 to-transparent'
  },
  intermediate: {
    badge: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    border: 'hover:border-yellow-500/50',
    progress: 'bg-yellow-500/20',
    progressFill: 'bg-yellow-500',
    glow: 'hover:shadow-yellow-500/20',
    gradient: 'from-yellow-500/10 to-transparent'
  },
  advanced: {
    badge: 'bg-red-500/20 text-red-300 border-red-500/30',
    border: 'hover:border-red-500/50',
    progress: 'bg-red-500/20',
    progressFill: 'bg-red-500',
    glow: 'hover:shadow-red-500/20',
    gradient: 'from-red-500/10 to-transparent'
  }
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
  const [isCompleted, setIsCompleted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isChecking, setIsChecking] = useState(true);

  const xpReward = XP_REWARDS[course.difficulty];
  const styles = DIFFICULTY_STYLES[course.difficulty];

  useEffect(() => {
    const checkEnrollment = async () => {
      try {
        const supabase = getClientAuthClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setIsEnrolled(false);
          setIsCompleted(false);
          return;
        }

        // Check if user is enrolled in this course
        const { data: enrollment } = await supabase
          .from('user_courses')
          .select('*')
          .eq('user_id', user.id)
          .eq('course_id', course.id)
          .eq('relationship_type', 'enrolled')
          .single();

        if (enrollment) {
          setIsEnrolled(true);
          setProgress(enrollment.progress_percentage || 0);
          setIsCompleted(!!enrollment.completed_at);
        } else {
          setIsEnrolled(false);
          setIsCompleted(false);
        }
      } catch (error) {
        console.error('[CourseCard] Error checking enrollment:', error);
        setIsEnrolled(false);
        setIsCompleted(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkEnrollment();
  }, [course.id]);

  const buttonText = isCompleted 
    ? (locale === 'es' ? 'Completado' : 'Completed')
    : isEnrolled 
    ? (locale === 'es' ? 'Continuar' : 'Continue')
    : (locale === 'es' ? 'Comenzar' : 'Start');

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={`group relative h-full overflow-hidden rounded-2xl backdrop-blur-xl 
                   bg-white/5 border border-white/10 ${styles.border}
                   transition-all duration-300 hover:shadow-2xl ${styles.glow}
                   flex flex-col`}
    >
      {/* Background gradient overlay */}
      <div className={`absolute inset-0 bg-gradient-to-br ${styles.gradient} 
                      opacity-0 group-hover:opacity-100 
                      transition-opacity duration-300 pointer-events-none`} />

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
      <Link href={`/${locale}/courses/${course.id}`} className="block p-6 flex flex-col flex-grow relative z-[1]">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className={`px-3 py-1 rounded-full text-xs font-medium border ${styles.badge}`}>
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

        {/* Gamification Stats - XP Reward */}
        <div className="mb-4 p-3 rounded-lg bg-white/5 border border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-semibold text-amber-300">
                +{xpReward} {locale === 'es' ? 'XP' : 'XP'}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              {locale === 'es' ? 'Por completar' : 'To complete'}
            </span>
          </div>
        </div>

        {/* Progress Bar - Only show if enrolled and not completed */}
        {isEnrolled && !isCompleted && (
          <div className="mb-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {locale === 'es' ? 'Progreso' : 'Progress'}
              </span>
              <span className="font-semibold text-primary">{progress}%</span>
            </div>
            <div className={`w-full h-2 rounded-full ${styles.progress} overflow-hidden`}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className={`h-full ${styles.progressFill} rounded-full`}
              />
            </div>
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
      <div className="p-6 pt-0 mt-auto relative z-[1]">
        <motion.button
          whileHover={!isChecking ? { scale: 1.05 } : {}}
          whileTap={!isChecking ? { scale: 0.95 } : {}}
          onClick={(e) => {
            e.preventDefault();
            // Navigate to course detail
            window.location.href = `/${locale}/courses/${course.id}`;
          }}
          disabled={isChecking}
          className={`w-full py-3 px-4 rounded-xl font-semibold transition-all duration-300 
                       flex items-center justify-center gap-2
                       ${isCompleted
                         ? 'bg-green-500/20 hover:bg-green-500/30 text-green-300 border border-green-500/50'
                         : isEnrolled 
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
              {isCompleted ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  <span>{buttonText}</span>
                </>
              ) : isEnrolled ? (
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

      {/* Status Badges - Top Left Corner */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        {isCompleted && !isChecking && (
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.4, type: 'spring', stiffness: 200 }}
            className="bg-green-500/20 border border-green-500/50 text-green-300 
                       px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"
          >
            <CheckCircle className="w-3 h-3" />
            {locale === 'es' ? 'Completado' : 'Completed'}
          </motion.div>
        )}
        {isEnrolled && !isCompleted && !isChecking && (
          <div className="bg-primary/20 border border-primary/50 text-primary 
                          px-3 py-1 rounded-full text-xs font-medium">
            {locale === 'es' ? 'En Progreso' : 'In Progress'}
          </div>
        )}
      </div>
    </motion.div>
  );
}
