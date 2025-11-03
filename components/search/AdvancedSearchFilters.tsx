'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Filter, 
  X, 
  Calendar, 
  TrendingUp, 
  Clock,
  SlidersHorizontal,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface SearchFiltersProps {
  locale: 'en' | 'es';
  onSearch: (filters: SearchFilters) => void;
}

export interface SearchFilters {
  query: string;
  categories: string[];
  dateRange: 'today' | 'week' | 'month' | 'year' | 'all';
  sortBy: 'relevance' | 'date' | 'quality' | 'trending';
  minQuality: number;
}

const CATEGORIES = [
  { id: 'machine-learning', label_en: 'Machine Learning', label_es: 'Aprendizaje Automático' },
  { id: 'natural-language', label_en: 'Natural Language', label_es: 'Lenguaje Natural' },
  { id: 'computer-vision', label_en: 'Computer Vision', label_es: 'Visión por Computadora' },
  { id: 'generative-ai', label_en: 'Generative AI', label_es: 'IA Generativa' },
  { id: 'robotics', label_en: 'Robotics', label_es: 'Robótica' },
  { id: 'ai-safety', label_en: 'AI Safety', label_es: 'Seguridad IA' },
  { id: 'ai-healthcare', label_en: 'Healthcare', label_es: 'Salud' },
  { id: 'ai-business', label_en: 'Business', label_es: 'Negocios' },
];

export function AdvancedSearchFilters({ locale, onSearch }: SearchFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState<SearchFilters>({
    query: searchParams.get('q') || '',
    categories: searchParams.get('categories')?.split(',').filter(Boolean) || [],
    dateRange: (searchParams.get('date') as SearchFilters['dateRange']) || 'all',
    sortBy: (searchParams.get('sort') as SearchFilters['sortBy']) || 'relevance',
    minQuality: Number(searchParams.get('quality') || 0),
  });

  const updateFilter = <K extends keyof SearchFilters>(
    key: K,
    value: SearchFilters[K]
  ) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
  };

  const toggleCategory = (categoryId: string) => {
    const newCategories = filters.categories.includes(categoryId)
      ? filters.categories.filter(c => c !== categoryId)
      : [...filters.categories, categoryId];
    
    updateFilter('categories', newCategories);
  };

  const handleSearch = () => {
    startTransition(() => {
      onSearch(filters);
      
      // Update URL with filters
      const params = new URLSearchParams();
      if (filters.query) params.set('q', filters.query);
      if (filters.categories.length > 0) params.set('categories', filters.categories.join(','));
      if (filters.dateRange !== 'all') params.set('date', filters.dateRange);
      if (filters.sortBy !== 'relevance') params.set('sort', filters.sortBy);
      if (filters.minQuality > 0) params.set('quality', filters.minQuality.toString());
      
      router.push(`/${locale}/search?${params.toString()}`);
    });
  };

  const clearFilters = () => {
    const clearedFilters: SearchFilters = {
      query: '',
      categories: [],
      dateRange: 'all',
      sortBy: 'relevance',
      minQuality: 0,
    };
    setFilters(clearedFilters);
    onSearch(clearedFilters);
    router.push(`/${locale}/search`);
  };

  const activeFiltersCount = 
    filters.categories.length +
    (filters.dateRange !== 'all' ? 1 : 0) +
    (filters.sortBy !== 'relevance' ? 1 : 0) +
    (filters.minQuality > 0 ? 1 : 0);

  const t = locale === 'en' ? {
    searchPlaceholder: 'Search AI news, articles, courses...',
    filters: 'Filters',
    categories: 'Categories',
    dateRange: 'Date Range',
    sortBy: 'Sort By',
    quality: 'Min Quality Score',
    search: 'Search',
    clear: 'Clear All',
    today: 'Today',
    week: 'This Week',
    month: 'This Month',
    year: 'This Year',
    all: 'All Time',
    relevance: 'Relevance',
    date: 'Latest First',
    qualitySort: 'Highest Quality',
    trending: 'Trending',
  } : {
    searchPlaceholder: 'Buscar noticias, artículos, cursos de IA...',
    filters: 'Filtros',
    categories: 'Categorías',
    dateRange: 'Rango de Fecha',
    sortBy: 'Ordenar Por',
    quality: 'Puntuación Mínima',
    search: 'Buscar',
    clear: 'Limpiar Todo',
    today: 'Hoy',
    week: 'Esta Semana',
    month: 'Este Mes',
    year: 'Este Año',
    all: 'Todo',
    relevance: 'Relevancia',
    date: 'Más Recientes',
    qualitySort: 'Mayor Calidad',
    trending: 'Tendencias',
  };

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          value={filters.query}
          onChange={(e) => updateFilter('query', e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder={t.searchPlaceholder}
          className="pl-12 pr-32 h-14 text-lg rounded-2xl border-2 focus:border-primary"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="rounded-xl"
          >
            <SlidersHorizontal className="w-4 h-4 mr-2" />
            {t.filters}
            {activeFiltersCount > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-primary text-primary-foreground text-xs rounded-full">
                {activeFiltersCount}
              </span>
            )}
          </Button>
          <Button
            onClick={handleSearch}
            disabled={isPending}
            className="rounded-xl"
          >
            {t.search}
          </Button>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-6 rounded-2xl bg-card/50 backdrop-blur-sm border-2 space-y-6">
              {/* Categories */}
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  {t.categories}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((category) => {
                    const isSelected = filters.categories.includes(category.id);
                    return (
                      <button
                        key={category.id}
                        onClick={() => toggleCategory(category.id)}
                        className={cn(
                          'px-4 py-2 rounded-full text-sm font-medium transition-all',
                          isSelected
                            ? 'bg-primary text-primary-foreground shadow-lg'
                            : 'bg-secondary hover:bg-secondary/80'
                        )}
                      >
                        {locale === 'en' ? category.label_en : category.label_es}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Date Range */}
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {t.dateRange}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {(['today', 'week', 'month', 'year', 'all'] as const).map((range) => (
                    <button
                      key={range}
                      onClick={() => updateFilter('dateRange', range)}
                      className={cn(
                        'px-4 py-2 rounded-full text-sm font-medium transition-all',
                        filters.dateRange === range
                          ? 'bg-primary text-primary-foreground shadow-lg'
                          : 'bg-secondary hover:bg-secondary/80'
                      )}
                    >
                      {t[range]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sort By */}
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  {t.sortBy}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {([
                    { value: 'relevance', label: t.relevance, icon: Sparkles },
                    { value: 'date', label: t.date, icon: Clock },
                    { value: 'quality', label: t.qualitySort, icon: TrendingUp },
                    { value: 'trending', label: t.trending, icon: TrendingUp },
                  ] as const).map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      onClick={() => updateFilter('sortBy', value)}
                      className={cn(
                        'p-3 rounded-xl text-sm font-medium transition-all flex items-center gap-2',
                        filters.sortBy === value
                          ? 'bg-primary text-primary-foreground shadow-lg'
                          : 'bg-secondary hover:bg-secondary/80'
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quality Score */}
              <div>
                <h3 className="text-sm font-semibold mb-3">
                  {t.quality}: {filters.minQuality.toFixed(1)}
                </h3>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={filters.minQuality}
                  onChange={(e) => updateFilter('minQuality', Number(e.target.value))}
                  className="w-full h-2 bg-secondary rounded-full appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>0.0</span>
                  <span>0.5</span>
                  <span>1.0</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  className="flex-1 rounded-xl"
                >
                  <X className="w-4 h-4 mr-2" />
                  {t.clear}
                </Button>
                <Button
                  onClick={handleSearch}
                  disabled={isPending}
                  className="flex-1 rounded-xl"
                >
                  {t.search}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
