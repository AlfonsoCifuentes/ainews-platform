'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Link } from '@/i18n';
import { Clock, BookOpen, TrendingUp, Star, Play, ArrowRight, CheckCircle, Zap } from 'lucide-react';
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
  thumbnail_url?: string | null;
}

interface CourseCardProps {
  course: Course;
  locale: string;
  showPopularBadge?: boolean;
}

// XP rewards based on difficulty
const XP_REWARDS = {
  beginner: 50,
  intermediate: 100,
  advanced: 200
};

const DIFFICULTY_LABELS = {
  beginner: { en: 'Beginner', es: 'Principiante' },
  intermediate: { en: 'Intermediate', es: 'Intermedio' },
  advanced: { en: 'Advanced', es: 'Avanzado' }
};

export function CourseCard({ course, locale, showPopularBadge = false }: CourseCardProps) {
  const title = locale === 'es' ? course.title_es : course.title_en;
  const description = locale === 'es' ? course.description_es : course.description_en;
  const difficultyLabel = DIFFICULTY_LABELS[course.difficulty][locale as 'en' | 'es'];
  
  const [isEnrolled] = useState(false);
  const [isCompleted] = useState(false);
  const [progress] = useState(0);
  const [isChecking, setIsChecking] = useState(false);

  const xpReward = XP_REWARDS[course.difficulty];

  useEffect(() => {
    // Note: Enrollment status should be fetched at the parent level 
    // and passed as props to avoid N+1 queries that exhaust browser resources.
    // For now, we'll show default state to prevent 406 errors.
    setIsChecking(false);
  }, [course.id]);

  const buttonText = isCompleted 
    ? (locale === 'es' ? 'Completado' : 'Completed')
    : isEnrolled 
    ? (locale === 'es' ? 'Continuar' : 'Continue')
    : (locale === 'es' ? 'Comenzar' : 'Start');

  return (
    <div className="group relative h-full overflow-hidden bg-[#0A0A0A] border border-[#1F1F1F] hover:border-white/30 flex flex-col">

      {/* Course Cover Image */}
      <Link href={`/courses/${course.id}`} className="block relative w-full aspect-video overflow-hidden">
        {course.thumbnail_url ? (
          <>
            <Image
              src={course.thumbnail_url}
              alt={title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-transparent" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] group-hover:scale-105 transition-transform duration-500">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(59,161,255,0.15)_0%,_transparent_70%)]" />
            <div className="absolute inset-0 flex items-center justify-center">
              <BookOpen className="w-12 h-12 text-white/20" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-transparent" />
          </div>
        )}
      </Link>

      {/* Share Button - Top Right */}
      <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100">
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
      <Link href={`/courses/${course.id}`} className="block p-6 flex flex-col flex-grow relative z-[1]">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex gap-2 items-center">
            <div className="px-3 py-1 text-xs font-mono border border-[#1F1F1F] text-[#888888]">
              {difficultyLabel.toUpperCase()}
            </div>
            {showPopularBadge && (
              <div className="px-2 py-1 text-xs font-mono border border-white/20 text-white flex items-center gap-1">
                <Zap className="w-3 h-3" />
                Popular
              </div>
            )}
          </div>
          {course.rating_avg > 0 && (
            <div className="flex items-center gap-1 text-white font-mono text-sm">
              <Star className="w-4 h-4" />
              <span>{course.rating_avg.toFixed(1)}</span>
            </div>
          )}
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-white mb-2 group-hover:underline decoration-1 underline-offset-4 line-clamp-2">
          {title}
        </h3>

        {/* Description */}
        <p className="text-[#888888] text-sm mb-4 line-clamp-3 flex-grow font-mono">
          {description}
        </p>

        {/* Topics */}
        {course.topics && course.topics.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {course.topics.slice(0, 3).map((topic, i) => (
              <span
                key={i}
                className="px-2 py-1 border border-[#1F1F1F] text-[#888888] text-xs font-mono"
              >
                {topic}
              </span>
            ))}
            {course.topics.length > 3 && (
              <span className="px-2 py-1 border border-[#1F1F1F] text-[#888888] text-xs font-mono">
                +{course.topics.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Gamification Stats - XP Reward */}
        <div className="mb-4 p-3 border border-[#1F1F1F] bg-black/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-white" />
              <span className="text-sm font-mono text-white">
                +{xpReward} XP
              </span>
            </div>
            <span className="text-xs font-mono text-[#888888]">
              {locale === 'es' ? 'POR COMPLETAR' : 'TO COMPLETE'}
            </span>
          </div>
        </div>

        {/* Progress Bar - Only show if enrolled and not completed */}
        {isEnrolled && !isCompleted && (
          <div className="mb-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-[#888888]">
                {locale === 'es' ? 'PROGRESO' : 'PROGRESS'}
              </span>
              <span className="text-white">{progress}%</span>
            </div>
            <div className="w-full h-1 bg-[#1F1F1F] overflow-hidden">
              <div
                style={{ width: `${progress}%` }}
                className="h-full bg-white"
              />
            </div>
          </div>
        )}

        {/* Footer Stats */}
        <div className="flex items-center justify-between text-sm text-[#888888] pt-4 border-t border-[#1F1F1F] font-mono">
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

      {/* Button Section - Fixed at bottom */}
      <div className="p-6 pt-0 mt-auto relative z-[1]">
        <button
          onClick={(e) => {
            e.preventDefault();
            window.location.href = `/${locale}/courses/${course.id}`;
          }}
          disabled={isChecking}
          className={`w-full py-3 px-4 font-mono text-xs tracking-widest 
                       flex items-center justify-center gap-2 border
                       ${isCompleted
                         ? 'bg-white text-black border-white'
                         : 'border-white/20 text-white hover:bg-white hover:text-black'
                       }
                       disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isChecking ? (
            <>
              <div className="w-4 h-4 border-2 border-current border-t-transparent animate-spin" />
              <span>{locale === 'es' ? 'CARGANDO...' : 'LOADING...'}</span>
            </>
          ) : (
            <>
              {isCompleted ? (
                <>
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{buttonText.toUpperCase()}</span>
                </>
              ) : isEnrolled ? (
                <>
                  <ArrowRight className="w-4 h-4 flex-shrink-0" />
                  <span>{buttonText.toUpperCase()}</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 flex-shrink-0" />
                  <span>{buttonText.toUpperCase()}</span>
                </>
              )}
            </>
          )}
        </button>
      </div>

      {/* Status Badges - Top Left Corner */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        {isCompleted && !isChecking && (
          <div className="border border-white bg-white text-black px-3 py-1 text-xs font-mono tracking-widest flex items-center gap-2">
            <CheckCircle className="w-3 h-3" />
            {locale === 'es' ? 'COMPLETADO' : 'COMPLETED'}
          </div>
        )}
        {isEnrolled && !isCompleted && !isChecking && (
          <div className="border border-[#1F1F1F] text-[#888888] px-3 py-1 text-xs font-mono">
            {locale === 'es' ? 'EN PROGRESO' : 'IN PROGRESS'}
          </div>
        )}
      </div>

      {/* Hover border effect */}
      <div className="absolute inset-0 border-2 border-white/0 group-hover:border-white/10 pointer-events-none z-10" />
    </div>
  );
}
