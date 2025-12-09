'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useRouter } from '@/i18n';
import Image from 'next/image';
import { PlayCircle, BarChart, Clock, Plus, Loader2 } from 'lucide-react';

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
 * CourseGalaxyNavigator - Brutalist tracklist-style course navigation
 * - Section numbering (02 — COURSE GALAXY)
 * - Two-column: tracklist + sticky preview
 * - Grayscale images, mono fonts
 */
export function CourseGalaxyNavigator({ courses, featuredCourseId: _featuredCourseId, locale }: CourseGalaxyNavigatorProps) {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeCourseId, setActiveCourseId] = useState<string>(() => {
    if (_featuredCourseId && courses.some((course) => course.id === _featuredCourseId)) {
      return _featuredCourseId;
    }
    return courses[0]?.id || '';
  });

  useEffect(() => {
    if (!courses.length) {
      setActiveCourseId('');
      return;
    }

    if (_featuredCourseId && courses.some((course) => course.id === _featuredCourseId)) {
      setActiveCourseId((current) => (current === _featuredCourseId ? current : _featuredCourseId));
      return;
    }

    setActiveCourseId((current) => {
      if (current && courses.some((course) => course.id === current)) {
        return current;
      }
      return courses[0].id;
    });
  }, [courses, _featuredCourseId]);

  const activeCourse = courses.find((c) => c.id === activeCourseId) || courses[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = prompt.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    router.push(`/courses?generate=${encodeURIComponent(trimmed)}`);
  };

  return (
    <section className="py-24 bg-[#0A0A0A] relative z-10">
      <div className="max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 lg:grid-cols-2 gap-24">
        {/* Left: Tracklist */}
        <div>
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-sm font-mono tracking-widest text-[#888888]">
                02 — {locale === 'en' ? 'COURSE GALAXY' : 'GALAXIA DE CURSOS'}
              </h2>
              <div className="h-px w-24 bg-white/50 mt-2" />
            </div>
          </div>

          {/* Generator Input */}
          <form onSubmit={handleSubmit} className="mb-12 relative group">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                locale === 'en'
                  ? "Generate new course (e.g. 'Quantum Computing')..."
                  : "Generar curso (ej. 'Computación Cuántica')..."
              }
              className="w-full bg-black/50 border border-[#1F1F1F] p-4 pr-12 text-white placeholder-[#888888] focus:border-white focus:outline-none transition-colors"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !prompt}
              className="absolute right-2 top-2 bottom-2 w-10 flex items-center justify-center text-white hover:bg-white/10 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
            </button>
          </form>

          <div className="space-y-2">
            {courses.map((course, index) => (
              <div
                key={course.id}
                onMouseEnter={() => setActiveCourseId(course.id)}
                className={`group cursor-pointer flex items-center justify-between py-8 border-b transition-all duration-300 ${
                  activeCourseId === course.id
                    ? 'border-white opacity-100 pl-4'
                    : 'border-[#1F1F1F] opacity-40 hover:opacity-70'
                }`}
              >
                <Link href={`/courses/${course.id}`} className="flex items-baseline gap-6 flex-1">
                  <span className="font-mono text-xs text-[#888888]">
                    {(index + 1).toString().padStart(2, '0')}
                  </span>
                  <h3 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                    {course.title}
                  </h3>
                </Link>
                <div
                  className={`hidden md:block transition-transform duration-300 ${
                    activeCourseId === course.id ? 'translate-x-0' : '-translate-x-4 opacity-0'
                  }`}
                >
                  <PlayCircle className="w-8 h-8 text-white" />
                </div>
              </div>
            ))}
          </div>

          {/* View all link */}
          <Link href="/courses-library">
            <div className="mt-8 flex items-center gap-2 text-sm font-mono text-[#888888] hover:text-white transition-colors">
              <span>{locale === 'en' ? 'VIEW COURSE LIBRARY' : 'VER BIBLIOTECA DE CURSOS'}</span>
              <span>→</span>
            </div>
          </Link>
        </div>

        {/* Right: Sticky 3D Preview */}
        <div className="hidden lg:block relative h-full min-h-[600px]">
          <div className="sticky top-32" style={{ perspective: 1000 }}>
            <AnimatePresence mode="wait">
              {activeCourse && (
                <motion.div
                  key={activeCourse.id}
                  initial={{ opacity: 0, rotateY: 10, x: 20 }}
                  animate={{ opacity: 1, rotateY: 0, x: 0 }}
                  exit={{ opacity: 0, rotateY: -10, x: -20 }}
                  transition={{ duration: 0.4 }}
                  className="relative w-full aspect-[3/4] max-h-[600px] bg-black border border-[#1F1F1F] overflow-hidden cursor-pointer shadow-2xl shadow-black/50"
                >
                  <Link href={`/courses/${activeCourse.id}`}>
                    {activeCourse.heroImage ? (
                      <Image
                        src={activeCourse.heroImage}
                        alt={activeCourse.title}
                        fill
                        className="w-full h-full object-cover grayscale opacity-60 transition-transform duration-700 hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#1F1F1F] to-black" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90" />

                    <div className="absolute bottom-0 left-0 w-full p-8">
                      <div className="flex gap-4 mb-6">
                        <div className="flex items-center gap-2 text-[#EAEAEA] font-mono text-sm border border-white/20 px-3 py-1 bg-black/50">
                          <BarChart size={14} /> {activeCourse.level}
                        </div>
                        <div className="flex items-center gap-2 text-[#EAEAEA] font-mono text-sm border border-white/20 px-3 py-1 bg-black/50">
                          <Clock size={14} /> {activeCourse.duration}
                        </div>
                      </div>

                      {activeCourse.progress !== undefined && activeCourse.progress > 0 && (
                        <>
                          <div className="w-full bg-[#1F1F1F] h-1 mb-2">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${activeCourse.progress}%` }}
                              className="bg-white h-full"
                            />
                          </div>
                          <p className="text-xs font-mono text-[#888888] text-right">
                            {activeCourse.progress}% {locale === 'en' ? 'Completed' : 'Completado'}
                          </p>
                        </>
                      )}
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
