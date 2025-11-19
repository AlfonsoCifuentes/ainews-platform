"use client";

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { CourseCard } from './CourseCard';
import { ArrowRight, Zap } from 'lucide-react';

interface Course {
  id: string;
  title_en: string;
  title_es: string;
  category: string;
  description_en: string;
  description_es: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration_minutes: number;
  topics: string[];
  enrollment_count: number;
  rating_avg: number;
  view_count: number;
  created_at: string;
  modules_count?: number;
  rating?: number;
  popularity?: number;
}

interface TopCoursesPreviewProps {
  locale: 'en' | 'es';
}

export function TopCoursesPreview({ locale }: TopCoursesPreviewProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const t = {
    en: {
      title: '⭐ Top Courses',
      subtitle: 'Explore the most popular courses right now',
      viewAll: 'View Complete Library',
      noCoursesYet: 'No courses yet. Create one to get started!',
    },
    es: {
      title: '⭐ Cursos Destacados',
      subtitle: 'Explora los cursos más populares en este momento',
      viewAll: 'Ver Biblioteca Completa',
      noCoursesYet: '¡Sin cursos aún. ¡Crea uno para empezar!',
    }
  };

  const texts = t[locale];

  const fetchTopCourses = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/courses?locale=${locale}&limit=3&sort=popular`);
      if (!response.ok) throw new Error('Failed to fetch top courses');
      const data = await response.json();
      setCourses(data.courses || []);
    } catch (error) {
      console.error('Error fetching top courses:', error);
      setCourses([]);
    } finally {
      setIsLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    fetchTopCourses();
  }, [fetchTopCourses]);

  if (isLoading) {
    return (
      <div className="py-12">
        <div className="text-center">
          <div className="inline-block">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.3 }}
      className="mt-16 border-t border-border/50 pt-12"
    >
      {/* Header */}
      <div className="mb-12 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-5 h-5 text-primary" />
            <span className="text-sm font-bold uppercase tracking-wider text-primary">Popular</span>
          </div>
          <h2 className="text-4xl font-bold">{texts.title}</h2>
          <p className="mt-2 text-muted-foreground">{texts.subtitle}</p>
        </div>
        <Link
          href={`/${locale}/courses-library`}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-all hover:gap-3"
        >
          {texts.viewAll}
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Courses Grid */}
      {courses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course, idx) => (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <CourseCard 
                course={course}
                locale={locale}
                showPopularBadge={idx === 0}
              />
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-muted/50 rounded-lg border border-border">
          <p className="text-muted-foreground">{texts.noCoursesYet}</p>
        </div>
      )}
    </motion.section>
  );
}
