"use client";

import { useState, useEffect } from 'react';

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
    <div className="w-full bg-[#0A0A0A] border-y border-[#1F1F1F] px-4 md:px-8 py-3">
      <div className="w-full">
        <h3 className="sr-only">
          {locale === 'en' ? 'FILTER BY CATEGORY' : 'FILTRAR POR CATEGORÍA'}
        </h3>
        <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {/* All button */}
          <button
            onClick={() => handleCategoryClick(null)}
            className={`border px-3 py-2 text-xs font-mono uppercase tracking-wider shrink-0 ${
              activeCategory === null
                ? 'border-[#EAEAEA] bg-[#EAEAEA] text-[#020309]'
                : 'border-[#1F1F1F] bg-transparent text-[#888888] hover:border-[#EAEAEA] hover:text-[#EAEAEA]'
            }`}
          >
            {locale === 'en' ? 'ALL' : 'TODAS'}
          </button>

          {/* Category buttons */}
          {categories.map((category) => {
            const count = categoryCounts[category.id] || 0;
            return (
              <button
                key={category.id}
                onClick={() => handleCategoryClick(category.id)}
                className={`border px-3 py-2 text-xs font-mono uppercase tracking-wider relative shrink-0 ${
                  activeCategory === category.id
                    ? 'border-[#EAEAEA] bg-[#EAEAEA] text-[#020309]'
                    : 'border-[#1F1F1F] bg-transparent text-[#888888] hover:border-[#EAEAEA] hover:text-[#EAEAEA]'
                }`}
              >
                <span className="mr-2">{category.icon}</span>
                {category.label}
                {count > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center border border-current px-1.5 py-0.5 text-[10px] font-bold">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
