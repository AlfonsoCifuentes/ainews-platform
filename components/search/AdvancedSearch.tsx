'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArticleCard } from '../news/ArticleCard';
import type { INewsArticle } from '@/lib/types/news';

interface AdvancedSearchProps {
  locale: 'en' | 'es';
  initialQuery?: string;
}

export function AdvancedSearch({ locale, initialQuery = '' }: AdvancedSearchProps) {
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState<string>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [minQuality, setMinQuality] = useState(0.6);
  const [sortBy, setSortBy] = useState<'relevance' | 'date' | 'quality'>('relevance');
  const [semantic, setSemantic] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const [results, setResults] = useState<INewsArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);

  const translations = {
    en: {
      search: 'Search',
      placeholder: 'Search AI news, courses, and more...',
      filters: 'Filters',
      category: 'Category',
      allCategories: 'All Categories',
      dateRange: 'Date Range',
      from: 'From',
      to: 'To',
      minQuality: 'Min Quality',
      sortBy: 'Sort By',
      relevance: 'Relevance',
      date: 'Date',
      quality: 'Quality',
      semantic: 'Semantic Search',
      semanticHint: 'Use AI to find similar articles',
      searching: 'Searching...',
      noResults: 'No results found',
      results: 'results',
      loadMore: 'Load More'
    },
    es: {
      search: 'Buscar',
      placeholder: 'Buscar noticias de IA, cursos y más...',
      filters: 'Filtros',
      category: 'Categoría',
      allCategories: 'Todas las Categorías',
      dateRange: 'Rango de Fechas',
      from: 'Desde',
      to: 'Hasta',
      minQuality: 'Calidad Mínima',
      sortBy: 'Ordenar Por',
      relevance: 'Relevancia',
      date: 'Fecha',
      quality: 'Calidad',
      semantic: 'Búsqueda Semántica',
      semanticHint: 'Usa IA para encontrar artículos similares',
      searching: 'Buscando...',
      noResults: 'No se encontraron resultados',
      results: 'resultados',
      loadMore: 'Cargar Más'
    }
  };

  const t = translations[locale];

  const categories = [
    { value: '', label: t.allCategories },
    { value: 'machinelearning', label: 'Machine Learning' },
    { value: 'nlp', label: 'NLP' },
    { value: 'computervision', label: 'Computer Vision' },
    { value: 'ethics', label: locale === 'en' ? 'Ethics' : 'Ética' },
    { value: 'industry', label: locale === 'en' ? 'Industry' : 'Industria' },
    { value: 'research', label: locale === 'en' ? 'Research' : 'Investigación' }
  ];

  const performSearch = async (reset = false) => {
    if (!query.trim()) return;

    setLoading(true);

    try {
      const params = new URLSearchParams({
        q: query,
        locale,
        sortBy,
        semantic: semantic.toString(),
        limit: '20',
        offset: reset ? '0' : (page * 20).toString()
      });

      if (category) params.append('category', category);
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);
      if (minQuality > 0) params.append('minQuality', minQuality.toString());

      const response = await fetch(`/api/search?${params}`);
      const data = await response.json();

      if (data.success) {
        setResults(reset ? data.data.articles : [...results, ...data.data.articles]);
        setTotal(data.data.pagination.total);
        if (!reset) setPage(page + 1);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialQuery) {
      performSearch(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    performSearch(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Search Bar */}
      <form onSubmit={handleSearch} className="relative mb-8">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.placeholder}
            className="w-full px-6 py-4 pl-14 pr-32 text-lg rounded-2xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-lg"
          />
          <svg
            className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2 bg-gradient-to-r from-primary to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t.searching : t.search}
          </button>
        </div>

        {/* Filter Toggle */}
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className="mt-4 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-primary transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
          {t.filters}
        </button>
      </form>

      {/* Advanced Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-8 p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Category */}
              <div>
                <label className="block text-sm font-medium mb-2">{t.category}</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                >
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              {/* Date From */}
              <div>
                <label className="block text-sm font-medium mb-2">{t.from}</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                />
              </div>

              {/* Date To */}
              <div>
                <label className="block text-sm font-medium mb-2">{t.to}</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                />
              </div>

              {/* Min Quality */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t.minQuality}: {minQuality.toFixed(1)}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={minQuality}
                  onChange={(e) => setMinQuality(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* Sort By */}
              <div>
                <label className="block text-sm font-medium mb-2">{t.sortBy}</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'relevance' | 'date' | 'quality')}
                  className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                >
                  <option value="relevance">{t.relevance}</option>
                  <option value="date">{t.date}</option>
                  <option value="quality">{t.quality}</option>
                </select>
              </div>

              {/* Semantic Search */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={semantic}
                    onChange={(e) => setSemantic(e.target.checked)}
                    className="w-5 h-5 text-primary rounded focus:ring-2 focus:ring-primary"
                  />
                  <div>
                    <div className="font-medium">{t.semantic}</div>
                    <div className="text-xs text-gray-500">{t.semanticHint}</div>
                  </div>
                </label>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      {query && (
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {total} {t.results}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {results.map((article) => (
              <ArticleCard 
                key={article.id} 
                article={article} 
                locale={locale}
                translations={{
                  readTime: locale === 'en' ? 'min read' : 'min de lectura',
                  aiGenerated: locale === 'en' ? 'AI Generated' : 'Generado por IA',
                  readMore: locale === 'en' ? 'Read More' : 'Leer Más',
                  category: locale === 'en' ? 'Category' : 'Categoría'
                }}
              />
            ))}
          </div>

          {loading && (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          )}

          {!loading && results.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">{t.noResults}</p>
            </div>
          )}

          {!loading && results.length > 0 && results.length < total && (
            <div className="flex justify-center mt-8">
              <button
                onClick={() => performSearch(false)}
                className="px-8 py-3 bg-gradient-to-r from-primary to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg hover:scale-105 transition-all"
              >
                {t.loadMore}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
