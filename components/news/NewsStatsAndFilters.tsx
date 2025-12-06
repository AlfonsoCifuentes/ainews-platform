"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface NewsStatsAndFiltersProps {
  locale: 'en' | 'es';
  onCategoryFilter?: (category: string | null) => void;
}

interface Stats {
  todayCount: number;
  totalSources: number;
  lastUpdated: string;
  avgQualityScore: number;
  categoryCounts?: Record<string, number>;
}

export function NewsStatsAndFilters({ locale, onCategoryFilter }: NewsStatsAndFiltersProps) {
  const [stats, setStats] = useState<Stats>({
    todayCount: 0,
    totalSources: 50,
    lastUpdated: '...',
    avgQualityScore: 0,
    categoryCounts: {}
  });
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const categories = [
    { 
      id: 'machinelearning', 
      icon: '▢', 
      label: locale === 'en' ? 'Machine Learning' : 'Aprendizaje Automático'
    },
    { 
      id: 'nlp', 
      icon: '▢', 
      label: locale === 'en' ? 'NLP' : 'PLN'
    },
    { 
      id: 'computervision', 
      icon: '▢', 
      label: locale === 'en' ? 'Computer Vision' : 'Visión Artificial'
    },
    { 
      id: 'robotics', 
      icon: '▢', 
      label: locale === 'en' ? 'Robotics' : 'Robótica'
    },
    { 
      id: 'ethics', 
      icon: '▢', 
      label: locale === 'en' ? 'Ethics' : 'Ética'
    },
  ];

  useEffect(() => {
    // Fetch real stats
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/news/stats');
        if (!response.ok) throw new Error('Failed to fetch stats');
        
        const data = await response.json();
        
        setStats({
          todayCount: data.todayCount,
          totalSources: data.totalSources,
          lastUpdated: new Date(data.lastUpdated).toLocaleTimeString(locale === 'en' ? 'en-US' : 'es-ES', { 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
          avgQualityScore: data.avgQualityScore,
          categoryCounts: data.categoryCounts
        });
      } catch (error) {
        console.error('Failed to fetch stats:', error);
        // Keep placeholder data on error
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    // Refresh every 2 minutes
    const interval = setInterval(fetchStats, 120000);
    return () => clearInterval(interval);
  }, [locale]);

  const handleCategoryClick = (categoryId: string) => {
    const newCategory = activeCategory === categoryId ? null : categoryId;
    setActiveCategory(newCategory);
    onCategoryFilter?.(newCategory);
  };

  const statsCards = [
    {
      label: locale === 'en' ? 'Today' : 'Hoy',
      value: loading ? '...' : stats.todayCount,
      icon: '■',
      suffix: locale === 'en' ? 'articles' : 'artículos'
    },
    {
      label: locale === 'en' ? 'Sources' : 'Fuentes',
      value: stats.totalSources,
      icon: '◎',
      suffix: '+'
    },
    {
      label: locale === 'en' ? 'Quality' : 'Calidad',
      value: loading ? '...' : stats.avgQualityScore,
      icon: '★',
      suffix: '%'
    },
    {
      label: locale === 'en' ? 'Updated' : 'Actualizado',
      value: stats.lastUpdated,
      icon: '◔',
      suffix: ''
    }
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="relative overflow-hidden border border-[#1F1F1F] bg-[#0A0A0A] p-4"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-2xl">{stat.icon}</span>
              <span className="text-xs font-semibold uppercase tracking-wider text-white/50">
                {stat.label}
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-white">
                {stat.value}
              </span>
              {stat.suffix && (
                <span className="text-sm text-white/60">{stat.suffix}</span>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Category Filters */}
      <div>
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-white/70">
          {locale === 'en' ? 'Filter by Category' : 'Filtrar por Categoría'}
        </h3>
        <div className="flex flex-wrap gap-3">
          {/* All button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleCategoryClick('')}
            className={`border px-6 py-3 text-sm font-mono uppercase tracking-wider transition-all ${
              activeCategory === null
                ? 'border-white bg-white/10 text-white'
                : 'border-[#1F1F1F] bg-[#0A0A0A] text-white/70 hover:border-white/40 hover:bg-white/5'
            }`}
          >
            {locale === 'en' ? '▣ All' : '▣ Todas'}
          </motion.button>

          {/* Category buttons */}
          {categories.map((category) => {
            const count = stats.categoryCounts?.[category.id] || 0;
            return (
              <motion.button
                key={category.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleCategoryClick(category.id)}
                className={`border px-6 py-3 text-sm font-mono uppercase tracking-wider transition-all ${
                  activeCategory === category.id
                    ? 'border-white bg-white/10 text-white'
                    : 'border-[#1F1F1F] bg-[#0A0A0A] text-white/70 hover:border-white/40 hover:bg-white/5'
                }`}
              >
                <span className="mr-2">{category.icon}</span>
                {category.label}
                {count > 0 && (
                  <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-xs">
                    {count}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Active Filter Indicator */}
      {activeCategory && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="flex items-center gap-2 border border-white/40 bg-[#0A0A0A] px-4 py-3"
        >
          <span className="text-sm text-white/80 font-mono">
            {locale === 'en' ? 'Filtering by:' : 'Filtrando por:'}{' '}
            <span className="font-bold text-white">
              {categories.find(c => c.id === activeCategory)?.label}
            </span>
          </span>
          <button
            onClick={() => handleCategoryClick('')}
            className="ml-auto rounded-full p-1 transition-colors hover:bg-white/10"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </motion.div>
      )}
    </div>
  );
}
