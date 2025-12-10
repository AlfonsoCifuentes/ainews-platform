"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Filter, ChevronDown } from 'lucide-react';
import { CourseCard } from './CourseCard';
import { Link } from '@/i18n';
import { BookOpen, Plus } from 'lucide-react';
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
  thumbnail_url?: string | null;
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
      {/* Header - Brutalist Style */}
      <section className="py-24 border-t border-[#1F1F1F] relative z-10">
        <div className="px-6 md:px-12 max-w-7xl mx-auto">
          <div className="flex justify-between items-end mb-12">
            <div>
              <div className="flex items-center gap-4 mb-2">
                <h2 className="text-sm font-mono tracking-widest text-[#888888]">
                  02 — {locale === 'en' ? 'COURSE LIBRARY' : 'BIBLIOTECA DE CURSOS'}
                </h2>
              </div>
              <div className="h-px w-24 bg-white/50" />
            </div>
            <Link
              href="/courses"
              className="hidden md:flex items-center gap-2 px-5 py-2 border border-white/20 text-white text-xs font-mono tracking-widest hover:bg-white hover:text-black transition-colors"
            >
              <Plus className="w-4 h-4" />
              {locale === 'en' ? 'GENERATE NEW' : 'GENERAR NUEVO'}
            </Link>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tight mb-4">
            {texts.title.replace('📚 ', '')}
          </h1>
          <p className="max-w-2xl text-lg text-[#888888] font-mono">
            {texts.subtitle}
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="px-6 md:px-12 py-12 bg-[#0A0A0A]">
        <div className="max-w-7xl mx-auto">
          {/* Search and Filters */}
          <div className="mb-12 space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#888888]" />
              <input
                type="text"
                placeholder={texts.search}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-black/50 border border-[#1F1F1F] text-white placeholder-[#888888] focus:border-white focus:outline-none font-mono"
              />
            </div>

            {/* Filter Controls */}
            <div className="flex gap-4 flex-wrap items-center">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 border border-[#1F1F1F] text-[#888888] hover:border-white hover:text-white transition-colors font-mono text-sm"
              >
                <Filter className="w-4 h-4" />
                {texts.filters}
                <ChevronDown className={`w-4 h-4 ${showFilters ? 'rotate-180' : ''}`} />
              </button>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'newest' | 'popular' | 'rating')}
                className="px-4 py-2 bg-black/50 border border-[#1F1F1F] text-white focus:border-white focus:outline-none cursor-pointer font-mono text-sm"
              >
                <option value="newest">{texts.newest}</option>
                <option value="popular">{texts.popular}</option>
                <option value="rating">{texts.rating}</option>
              </select>
            </div>

            {/* Expandable Filters */}
            {showFilters && (
              <div className="space-y-6 p-6 bg-[#0A0A0A] border border-[#1F1F1F]">
                {/* Category Filter */}
                <div>
                  <label className="block text-sm font-mono tracking-widest text-[#888888] mb-4">{texts.category.toUpperCase()}</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                    {CATEGORY_OPTIONS.map((cat) => (
                      <button
                        key={cat.value}
                        onClick={() => setSelectedCategory(cat.value)}
                        className={`px-3 py-2 text-sm font-mono border ${
                          selectedCategory === cat.value
                            ? 'border-white bg-white text-black'
                            : 'border-[#1F1F1F] text-[#888888] hover:border-white hover:text-white'
                        }`}
                      >
                        {cat.label[locale]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Difficulty Filter */}
                <div>
                  <label className="block text-sm font-mono tracking-widest text-[#888888] mb-4">{texts.difficulty.toUpperCase()}</label>
                  <div className="flex gap-2 flex-wrap">
                    {DIFFICULTY_OPTIONS.map((diff) => (
                      <button
                        key={diff.value}
                        onClick={() => setSelectedDifficulty(diff.value as DifficultyFilter)}
                        className={`px-4 py-2 text-sm font-mono border ${
                          selectedDifficulty === diff.value
                            ? 'border-white bg-white text-black'
                            : 'border-[#1F1F1F] text-[#888888] hover:border-white hover:text-white'
                        }`}
                      >
                        {diff.label[locale]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Results */}
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block">
                <div className="w-8 h-8 border-2 border-white border-t-transparent animate-spin"></div>
              </div>
              <p className="mt-4 font-mono text-sm text-[#888888]">
                {locale === 'en' ? 'LOADING COURSES...' : 'CARGANDO CURSOS...'}
              </p>
            </div>
          ) : error ? (
            <div className="text-center py-12 border border-[#1F1F1F] p-8">
              <p className="text-[#888888] font-mono">{locale === 'en' ? 'Unable to load courses right now.' : 'No se pueden cargar los cursos en este momento.'}</p>
              <p className="text-sm text-[#888888] mt-2 font-mono">{error}</p>
            </div>
          ) : courses.length > 0 ? (
            <div>
              <p className="text-sm text-[#888888] mb-6 font-mono">
                {locale === 'en' 
                  ? `SHOWING ${courses.length} OF ${totalAvailable} COURSE${totalAvailable !== 1 ? 'S' : ''}`
                  : `MOSTRANDO ${courses.length} DE ${totalAvailable} CURSO${totalAvailable !== 1 ? 'S' : ''}`
                }
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map((course) => (
                  <div key={course.id}>
                    <CourseCard 
                      course={course}
                      locale={locale}
                    />
                  </div>
                ))}
              </div>
              {hasMore && (
                <div className="text-center mt-10">
                  <button
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                    className="px-6 py-3 border border-white/20 text-white text-xs font-mono tracking-widest hover:bg-white hover:text-black disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoadingMore 
                      ? (locale === 'en' ? 'LOADING...' : 'CARGANDO...') 
                      : (locale === 'en' ? 'LOAD MORE COURSES' : 'CARGAR MÁS CURSOS')
                    }
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 border border-[#1F1F1F] p-8">
              <BookOpen className="w-16 h-16 mx-auto text-[#888888] mb-4 opacity-50" />
              <h3 className="text-xl font-bold text-white mb-2">{texts.noCourses}</h3>
              <p className="text-[#888888] font-mono">{texts.tryOther}</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
