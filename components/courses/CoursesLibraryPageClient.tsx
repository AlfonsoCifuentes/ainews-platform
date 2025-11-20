"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, ChevronDown } from 'lucide-react';
import { CourseCard } from './CourseCard';
import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import { useLogger } from '@/lib/utils/logging';

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

interface CoursesLibraryPageClientProps {
  locale: 'en' | 'es';
}

const PAGE_SIZE = 24;

const CATEGORY_OPTIONS = [
  { value: 'all', label: { en: 'All', es: 'Todos' } },
  { value: 'Machine Learning', label: { en: 'Machine Learning', es: 'Aprendizaje Automático' } },
  { value: 'Deep Learning', label: { en: 'Deep Learning', es: 'Deep Learning' } },
  { value: 'Natural Language Processing', label: { en: 'Natural Language Processing', es: 'Procesamiento de Lenguaje Natural' } },
  { value: 'Computer Vision', label: { en: 'Computer Vision', es: 'Visión por Computadora' } },
  { value: 'Reinforcement Learning', label: { en: 'Reinforcement Learning', es: 'Aprendizaje por Refuerzo' } },
  { value: 'Data Science', label: { en: 'Data Science', es: 'Ciencia de Datos' } },
  { value: 'AI Ethics', label: { en: 'AI Ethics', es: 'Ética en IA' } },
  { value: 'Generative AI', label: { en: 'Generative AI', es: 'IA Generativa' } },
  { value: 'Large Language Models', label: { en: 'Large Language Models', es: 'Modelos de Lenguaje Grande' } },
 ] as const;

const DIFFICULTY_OPTIONS = [
  { value: 'all', label: { en: 'All', es: 'Todos' } },
  { value: 'beginner', label: { en: 'Beginner', es: 'Principiante' } },
  { value: 'intermediate', label: { en: 'Intermediate', es: 'Intermedio' } },
  { value: 'advanced', label: { en: 'Advanced', es: 'Avanzado' } },
] as const;

type DifficultyFilter = 'all' | 'beginner' | 'intermediate' | 'advanced';

export function CoursesLibraryPageClient({ locale }: CoursesLibraryPageClientProps) {
  const logger = useLogger('CoursesLibraryPageClient');
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyFilter>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'popular' | 'rating'>('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [totalAvailable, setTotalAvailable] = useState(0);

  const t = {
    en: {
      title: '📚 Complete Courses Library',
      subtitle: 'Explore all AI courses. Filter, search, and find your next learning adventure.',
      search: 'Search courses...',
      category: 'Category',
      difficulty: 'Difficulty',
      sort: 'Sort by',
      filters: 'Filters',
      newest: 'Newest',
      popular: 'Most Popular',
      rating: 'Highest Rated',
      all: 'All',
      beginner: 'Beginner',
      intermediate: 'Intermediate',
      advanced: 'Advanced',
      noCourses: 'No courses found matching your filters.',
      tryOther: 'Try adjusting your search or filters.',
      startLearning: 'Start Learning',
    },
    es: {
      title: '📚 Biblioteca Completa de Cursos',
      subtitle: 'Explora todos los cursos de IA. Filtra, busca y encuentra tu próxima aventura de aprendizaje.',
      search: 'Buscar cursos...',
      category: 'Categoría',
      difficulty: 'Dificultad',
      sort: 'Ordenar por',
      filters: 'Filtros',
      newest: 'Más Recientes',
      popular: 'Más Popular',
      rating: 'Mejor Valorados',
      all: 'Todos',
      beginner: 'Principiante',
      intermediate: 'Intermedio',
      advanced: 'Avanzado',
      noCourses: 'No se encontraron cursos que coincidan con tus filtros.',
      tryOther: 'Intenta ajustar tu búsqueda o filtros.',
      startLearning: 'Comenzar a Aprender',
    }
  };

  const texts = t[locale];
  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 350);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const abortRef = useRef<AbortController | null>(null);
  const lastFetchKeyRef = useRef<string | null>(null);

  const fetchCourses = useCallback(async ({ offset, reset }: { offset: number; reset: boolean }) => {
    logger.info('fetchCourses invoked', {
      offset,
      reset,
      locale,
      selectedCategory,
      selectedDifficulty,
      sortBy,
      debouncedSearchLength: debouncedSearch.length,
    });

    if (reset) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }

    try {
      // If we're already requested the exact same params recently, avoid making a second request
      const reqKey = JSON.stringify({ locale, selectedCategory, selectedDifficulty, sortBy, debouncedSearch, limit: PAGE_SIZE, offset });
      if (reqKey === lastFetchKeyRef.current) {
        logger.debug('Skipping duplicate fetch', { reqKey });
        return;
      }
      lastFetchKeyRef.current = reqKey;

      // Abort previous request if any
      if (abortRef.current) {
        abortRef.current.abort();
      }
      abortRef.current = new AbortController();
      const params = new URLSearchParams({
        locale,
        limit: `${PAGE_SIZE}`,
        offset: `${offset}`,
        sort: sortBy,
      });

      if (selectedCategory !== 'all') {
        params.set('category', selectedCategory);
      }

      if (selectedDifficulty !== 'all') {
        params.set('difficulty', selectedDifficulty);
      }

      if (debouncedSearch) {
        params.set('search', debouncedSearch);
      }

      const response = await fetch(`/api/courses?${params.toString()}`, { signal: abortRef.current.signal });
      if (!response.ok) {
        throw new Error(`Failed to fetch courses: ${response.status}`);
      }

      const data = await response.json();
      const coursesArray: Course[] = data.data || [];
      setCourses((prev) => (reset ? coursesArray : [...prev, ...coursesArray]));
      setTotalAvailable(data.pagination?.total ?? coursesArray.length);
      setHasMore(Boolean(data.pagination?.hasMore));
      setError(null);

      logger.info('Courses loaded', {
        batchSize: coursesArray.length,
        totalAvailable: data.pagination?.total,
        hasMore: data.pagination?.hasMore,
      });
    } catch (err) {
      if (typeof err === 'object' && err !== null && 'name' in err && (err as { name?: string }).name === 'AbortError') {
        logger.warn('Fetch aborted', { offset, locale });
        return;
      }
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      setCourses((prev) => (reset ? [] : prev));
      logger.error('fetchCourses failed', { message });
    } finally {
      if (reset) {
        setIsLoading(false);
      } else {
        setIsLoadingMore(false);
      }
    }
  }, [locale, selectedCategory, selectedDifficulty, sortBy, debouncedSearch, logger]);

  useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    fetchCourses({ offset: 0, reset: true });
  }, [fetchCourses]);

  const handleLoadMore = () => {
    if (isLoadingMore || !hasMore) return;
    fetchCourses({ offset: courses.length, reset: false });
  };

  return (
    <>
      {/* Header */}
      <section className="relative overflow-hidden border-b border-border/50 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/5 px-4 py-16">
        <div className="absolute inset-0 bg-grid-white/5 [mask-image:radial-gradient(white,transparent_70%)]" />
        <div className="container relative mx-auto max-w-6xl">
          <div className="mb-8 flex items-center gap-3">
            <div className="h-1 w-12 bg-gradient-to-r from-primary to-accent" />
            <span className="text-sm font-bold uppercase tracking-wider text-primary">
              {locale === 'en' ? 'Learning' : 'Aprendizaje'}
            </span>
          </div>
          <h1 className="mb-4 text-5xl font-black tracking-tight md:text-6xl">
            <span className="bg-gradient-to-r from-foreground via-primary to-accent bg-clip-text text-transparent">
              {texts.title}
            </span>
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground">
            {texts.subtitle}
          </p>
          <div className="mt-6 flex gap-2">
            <Link
              href={`/${locale}/courses`}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors flex items-center gap-2"
            >
              <BookOpen className="w-4 h-4" />
              {locale === 'en' ? 'Generate New Course' : 'Generar Nuevo Curso'}
            </Link>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="px-4 py-12">
        <div className="container mx-auto max-w-6xl">
          {/* Search and Filters */}
          <div className="mb-12 space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder={texts.search}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Filter Controls */}
            <div className="flex gap-2 flex-wrap items-center">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 bg-muted border border-border rounded-lg hover:bg-muted/80 transition-colors"
              >
                <Filter className="w-4 h-4" />
                {texts.filters}
                <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </button>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'newest' | 'popular' | 'rating')}
                className="px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
              >
                <option value="newest">{texts.newest}</option>
                <option value="popular">{texts.popular}</option>
                <option value="rating">{texts.rating}</option>
              </select>
            </div>

            {/* Expandable Filters */}
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 p-4 bg-muted rounded-lg border border-border"
              >
                {/* Category Filter */}
                <div>
                  <label className="block text-sm font-semibold mb-2">{texts.category}</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                    {CATEGORY_OPTIONS.map((cat) => (
                      <button
                        key={cat.value}
                        onClick={() => setSelectedCategory(cat.value)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          selectedCategory === cat.value
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-background border border-border hover:border-primary'
                        }`}
                      >
                        {cat.label[locale]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Difficulty Filter */}
                <div>
                  <label className="block text-sm font-semibold mb-2">{texts.difficulty}</label>
                  <div className="flex gap-2">
                    {DIFFICULTY_OPTIONS.map((diff) => (
                      <button
                        key={diff.value}
                        onClick={() => setSelectedDifficulty(diff.value as DifficultyFilter)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          selectedDifficulty === diff.value
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-background border border-border hover:border-primary'
                        }`}
                      >
                        {diff.label[locale]}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Results */}
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">{locale === 'en' ? 'Unable to load courses right now.' : 'No se pueden cargar los cursos en este momento.'}</p>
              <p className="text-sm text-muted-foreground mt-2">{error}</p>
            </div>
          ) : courses.length > 0 ? (
            <div>
              <p className="text-sm text-muted-foreground mb-6">
                {locale === 'en' 
                  ? `Showing ${courses.length} of ${totalAvailable} course${totalAvailable !== 1 ? 's' : ''}`
                  : `Mostrando ${courses.length} de ${totalAvailable} curso${totalAvailable !== 1 ? 's' : ''}`
                }
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map((course, idx) => (
                  <motion.div
                    key={course.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <CourseCard 
                      course={course}
                      locale={locale}
                    />
                  </motion.div>
                ))}
              </div>
              {hasMore && (
                <div className="text-center mt-10">
                  <button
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                    className="px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoadingMore ? (locale === 'en' ? 'Loading...' : 'Cargando...') : (locale === 'en' ? 'Load more courses' : 'Cargar más cursos')}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <BookOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-xl font-semibold mb-2">{texts.noCourses}</h3>
              <p className="text-muted-foreground">{texts.tryOther}</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
