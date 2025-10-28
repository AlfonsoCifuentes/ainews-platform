'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, BookOpen, Clock, TrendingUp, Star } from 'lucide-react';
import { CourseCard } from './CourseCard';
import { COURSE_CATEGORIES } from '@/lib/ai/course-categorizer';

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

interface CourseLibraryProps {
  locale: string;
  searchParams: { [key: string]: string | string[] | undefined };
}

const DIFFICULTY_OPTIONS = [
  { id: 'all', label_en: 'All Levels', label_es: 'Todos los Niveles' },
  { id: 'beginner', label_en: 'Beginner', label_es: 'Principiante' },
  { id: 'intermediate', label_en: 'Intermediate', label_es: 'Intermedio' },
  { id: 'advanced', label_en: 'Advanced', label_es: 'Avanzado' }
];

const SORT_OPTIONS = [
  { id: 'newest', label_en: 'Newest First', label_es: 'Más Recientes', icon: Clock },
  { id: 'popular', label_en: 'Most Popular', label_es: 'Más Populares', icon: TrendingUp },
  { id: 'rating', label_en: 'Highest Rated', label_es: 'Mejor Valorados', icon: Star }
];

export function CourseLibrary({ locale, searchParams }: CourseLibraryProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.search?.toString() || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.category?.toString() || 'all');
  const [selectedDifficulty, setSelectedDifficulty] = useState(searchParams.difficulty?.toString() || 'all');
  const [selectedSort, setSelectedSort] = useState(searchParams.sort?.toString() || 'newest');
  const [totalCount, setTotalCount] = useState(0);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        locale,
        limit: '20',
        offset: '0'
      });

      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      if (selectedDifficulty !== 'all') params.append('difficulty', selectedDifficulty);
      if (selectedSort) params.append('sort', selectedSort);
      if (search) params.append('search', search);

      const response = await fetch(`/api/courses?${params}`);
      const data = await response.json();

      if (data.success) {
        setCourses(data.data);
        setTotalCount(data.pagination.total);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, selectedDifficulty, selectedSort, search]);

  const handleSearch = (value: string) => {
    setSearch(value);
  };

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-blue-400 to-primary bg-clip-text text-transparent">
          {locale === 'es' ? 'Biblioteca de Cursos' : 'Course Library'}
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          {locale === 'es' 
            ? 'Explora nuestra colección de cursos de IA generados automáticamente y continúa tu aprendizaje'
            : 'Explore our collection of AI-generated courses and continue your learning journey'}
        </p>
        <div className="mt-4 flex items-center justify-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            {totalCount} {locale === 'es' ? 'cursos' : 'courses'}
          </span>
        </div>
      </motion.div>

      {/* Search & Filters */}
      <div className="mb-8 space-y-4">
        {/* Search Bar */}
        <div className="relative max-w-2xl mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={locale === 'es' ? 'Buscar cursos...' : 'Search courses...'}
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl
                     focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 justify-center items-center">
          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 rounded-lg border border-white/10 bg-white/5 backdrop-blur-xl
                       focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            >
              {COURSE_CATEGORIES.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {locale === 'es' ? cat.label_es : cat.label_en}
                </option>
              ))}
            </select>
          </div>

          {/* Difficulty Filter */}
          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="px-4 py-2 rounded-lg border border-white/10 bg-white/5 backdrop-blur-xl
                     focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          >
            {DIFFICULTY_OPTIONS.map(opt => (
              <option key={opt.id} value={opt.id}>
                {locale === 'es' ? opt.label_es : opt.label_en}
              </option>
            ))}
          </select>

          {/* Sort Options */}
          <div className="flex gap-2">
            {SORT_OPTIONS.map(opt => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.id}
                  onClick={() => setSelectedSort(opt.id)}
                  className={`px-4 py-2 rounded-lg border flex items-center gap-2 transition-all
                    ${selectedSort === opt.id 
                      ? 'bg-primary text-white border-primary' 
                      : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">
                    {locale === 'es' ? opt.label_es : opt.label_en}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Course Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 rounded-2xl bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-semibold mb-2">
            {locale === 'es' ? 'No se encontraron cursos' : 'No courses found'}
          </h3>
          <p className="text-muted-foreground">
            {locale === 'es' 
              ? 'Intenta ajustar tus filtros de búsqueda'
              : 'Try adjusting your search filters'}
          </p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {courses.map((course, i) => (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <CourseCard course={course} locale={locale} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
