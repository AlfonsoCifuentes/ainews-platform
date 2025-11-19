"use client";

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, ChevronDown } from 'lucide-react';
import { CourseCard } from './CourseCard';
import Link from 'next/link';
import { BookOpen } from 'lucide-react';

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

const CATEGORIES = [
  'All',
  'Machine Learning',
  'Deep Learning',
  'Natural Language Processing',
  'Computer Vision',
  'Reinforcement Learning',
  'Data Science',
  'AI Ethics',
  'Generative AI',
  'Large Language Models',
];

const CATEGORIES_ES = [
  'Todos',
  'Aprendizaje Automático',
  'Deep Learning',
  'Procesamiento de Lenguaje Natural',
  'Visión por Computadora',
  'Aprendizaje por Refuerzo',
  'Ciencia de Datos',
  'Ética en IA',
  'IA Generativa',
  'Modelos de Lenguaje Grande',
];

export function CoursesLibraryPageClient({ locale }: CoursesLibraryPageClientProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'newest' | 'popular' | 'rating'>('newest');
  const [showFilters, setShowFilters] = useState(false);

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
  const categories = locale === 'en' ? CATEGORIES : CATEGORIES_ES;

  const fetchCourses = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/courses?locale=${locale}&limit=1000`);
      if (!response.ok) throw new Error('Failed to fetch courses');
      const data = await response.json();
      setCourses(data.courses || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
      setCourses([]);
    } finally {
      setIsLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  useEffect(() => {
    let filtered = [...courses];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const titleField = locale === 'en' ? 'title_en' : 'title_es';
      const descField = locale === 'en' ? 'description_en' : 'description_es';
      filtered = filtered.filter(
        course =>
          course[titleField].toLowerCase().includes(query) ||
          course[descField].toLowerCase().includes(query)
      );
    }

    // Filter by category
    if (selectedCategory !== 'All' && selectedCategory !== 'Todos') {
      filtered = filtered.filter(course => course.category === selectedCategory);
    }

    // Filter by difficulty
    if (selectedDifficulty !== 'All') {
      filtered = filtered.filter(course => course.difficulty === selectedDifficulty);
    }

    // Sort
    switch (sortBy) {
      case 'popular':
        filtered.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
        break;
      case 'rating':
        filtered.sort((a, b) => (b.rating_avg || 0) - (a.rating_avg || 0));
        break;
      case 'newest':
      default:
        filtered.sort((a, b) => {
          if (!a.created_at || !b.created_at) return 0;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
    }

    setFilteredCourses(filtered);
  }, [courses, searchQuery, selectedCategory, selectedDifficulty, sortBy, locale]);

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
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          selectedCategory === cat
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-background border border-border hover:border-primary'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Difficulty Filter */}
                <div>
                  <label className="block text-sm font-semibold mb-2">{texts.difficulty}</label>
                  <div className="flex gap-2">
                    {['All', 'beginner', 'intermediate', 'advanced'].map((diff) => (
                      <button
                        key={diff}
                        onClick={() => setSelectedDifficulty(diff)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          selectedDifficulty === diff
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-background border border-border hover:border-primary'
                        }`}
                      >
                        {diff === 'All' ? texts.all : diff === 'beginner' ? texts.beginner : diff === 'intermediate' ? texts.intermediate : texts.advanced}
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
          ) : filteredCourses.length > 0 ? (
            <div>
              <p className="text-sm text-muted-foreground mb-6">
                {locale === 'en' 
                  ? `Found ${filteredCourses.length} course${filteredCourses.length !== 1 ? 's' : ''}`
                  : `Encontrados ${filteredCourses.length} curso${filteredCourses.length !== 1 ? 's' : ''}`
                }
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCourses.map((course, idx) => (
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
