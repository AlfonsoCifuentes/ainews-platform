"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface CategoryFiltersProps {
  locale: 'en' | 'es';
  onCategoryFilter: (category: string | null) => void;
}

export function CategoryFilters({ locale, onCategoryFilter }: CategoryFiltersProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});

  const categories = [
    { 
      id: 'machinelearning', 
      icon: '🤖', 
      label: locale === 'en' ? 'Machine Learning' : 'Aprendizaje Automático',
    },
    { 
      id: 'nlp', 
      icon: '💬', 
      label: locale === 'en' ? 'NLP' : 'PLN',
    },
    { 
      id: 'computervision', 
      icon: '👁️', 
      label: locale === 'en' ? 'Computer Vision' : 'Visión Artificial',
    },
    { 
      id: 'robotics', 
      icon: '🦾', 
      label: locale === 'en' ? 'Robotics' : 'Robótica',
    },
    { 
      id: 'ethics', 
      icon: '⚖️', 
      label: locale === 'en' ? 'Ethics' : 'Ética',
    },
  ];

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const response = await fetch('/api/news/stats');
        if (!response.ok) throw new Error('Failed to fetch stats');
        const data = await response.json();
        setCategoryCounts(data.categoryCounts || {});
      } catch (error) {
        console.error('Failed to fetch category counts:', error);
      }
    };

    fetchCounts();
    const interval = setInterval(fetchCounts, 120000);
    return () => clearInterval(interval);
  }, []);

  const handleCategoryClick = (categoryId: string | null) => {
    setActiveCategory(categoryId);
    onCategoryFilter(categoryId);
  };

  return (
    <div className="w-full px-4 py-6 bg-gradient-to-r from-slate-900/50 via-slate-800/50 to-slate-900/50 border-y border-slate-700/50">
      <div className="container mx-auto max-w-7xl">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-white/70 text-center">
          {locale === 'en' ? '🎯 Filter by Category' : '🎯 Filtrar por Categoría'}
        </h3>
        <div className="flex flex-wrap justify-center gap-3">
          {/* All button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleCategoryClick(null)}
            className={`rounded-full border px-6 py-3 text-sm font-semibold transition-all ${
              activeCategory === null
                ? 'border-primary bg-primary/20 text-white shadow-lg shadow-primary/50'
                : 'border-white/10 bg-white/5 text-white/70 hover:border-white/20 hover:bg-white/10'
            }`}
          >
            {locale === 'en' ? '🌟 All' : '🌟 Todas'}
          </motion.button>

          {/* Category buttons */}
          {categories.map((category) => {
            const count = categoryCounts[category.id] || 0;
            return (
              <motion.button
                key={category.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleCategoryClick(category.id)}
                className={`rounded-full border px-6 py-3 text-sm font-semibold transition-all relative ${
                  activeCategory === category.id
                    ? 'border-primary bg-primary/20 text-white shadow-lg shadow-primary/50'
                    : 'border-white/10 bg-white/5 text-white/70 hover:border-white/20 hover:bg-white/10'
                }`}
              >
                <span className="mr-2">{category.icon}</span>
                {category.label}
                {count > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center rounded-full bg-primary/30 px-2 py-0.5 text-xs font-bold">
                    {count}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
