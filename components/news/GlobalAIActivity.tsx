'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Globe2, TrendingUp, Users, Building2 } from 'lucide-react';

interface GlobalAIActivityProps {
  articlesAnalyzed: number;
  topCompanies?: Array<{ company: string; count: number; trend: 'up' | 'down' | 'stable' }>;
  activeRegions?: number;
  researchPapers?: number;
}

export function GlobalAIActivity({
  articlesAnalyzed,
  topCompanies = [],
  activeRegions = 0,
  researchPapers = 0
}: GlobalAIActivityProps) {
  const t = useTranslations('news');

  // Defensive: ensure all values are valid
  const safeArticles = Number(articlesAnalyzed) || 0;
  const safeRegions = Number(activeRegions) || 0;
  const safePapers = Number(researchPapers) || 0;
  const safeCompanies = Array.isArray(topCompanies) ? topCompanies.filter(c => c && c.company) : [];

  const stats = [
    {
      label: t('globalActivity.articles'),
      value: safeArticles,
      icon: Globe2,
      color: 'text-blue-400',
      bgColor: 'bg-blue-400/10'
    },
    {
      label: t('globalActivity.regions'),
      value: safeRegions,
      icon: Users,
      color: 'text-purple-400',
      bgColor: 'bg-purple-400/10'
    },
    {
      label: t('globalActivity.papers'),
      value: safePapers,
      icon: TrendingUp,
      color: 'text-green-400',
      bgColor: 'bg-green-400/10'
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl backdrop-blur-xl bg-white/5 border border-white/10 p-6"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-xl bg-blue-400/10">
          <Globe2 className="w-5 h-5 text-blue-400" />
        </div>
        <h3 className="text-lg font-bold text-white">
          {t('globalActivity.title')}
        </h3>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className="text-center"
            >
              <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${stat.bgColor} mb-2`}>
                <Icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div className="text-2xl font-bold text-white mb-1">
                {stat.value}
              </div>
              <div className="text-xs text-gray-400">
                {stat.label}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Top Companies */}
      {safeCompanies.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-400 font-medium">
              {t('globalActivity.topCompanies')}
            </span>
          </div>
          <div className="space-y-2">
            {safeCompanies.slice(0, 3).map((company, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="flex items-center justify-between p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
              >
                <span className="text-sm text-white font-medium">
                  {String(company.company || '')}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">
                    {Number(company.count) || 0}
                  </span>
                  {company.trend === 'up' && (
                    <TrendingUp className="w-4 h-4 text-green-400" />
                  )}
                  {company.trend === 'down' && (
                    <TrendingUp className="w-4 h-4 text-red-400 rotate-180" />
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Background Decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-3xl -z-10" />
    </motion.div>
  );
}
