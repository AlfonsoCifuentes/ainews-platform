'use client';

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
    },
    {
      label: t('globalActivity.regions'),
      value: safeRegions,
      icon: Users,
    },
    {
      label: t('globalActivity.papers'),
      value: safePapers,
      icon: TrendingUp,
    }
  ];

  return (
    <div className="relative overflow-hidden border border-[#1F1F1F] bg-[#0A0A0A] p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 border border-[#1F1F1F] bg-[#020309]">
          <Globe2 className="w-5 h-5 text-[#EAEAEA]" />
        </div>
        <h3 className="text-sm font-mono uppercase tracking-widest text-[#EAEAEA]">
          {t('globalActivity.title')}
        </h3>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div
              key={i}
              className="text-center"
            >
              <div className="inline-flex items-center justify-center w-10 h-10 border border-[#1F1F1F] bg-[#020309] mb-2">
                <Icon className="w-5 h-5 text-[#EAEAEA]" />
              </div>
              <div className="text-2xl font-bold text-white font-mono mb-1">
                {stat.value}
              </div>
              <div className="text-xs font-mono text-[#888888]">
                {stat.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Top Companies */}
      {safeCompanies.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="w-4 h-4 text-[#888888]" />
            <span className="text-xs font-mono uppercase tracking-widest text-[#888888]">
              {t('globalActivity.topCompanies')}
            </span>
          </div>
          <div className="space-y-2">
            {safeCompanies.slice(0, 3).map((company, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2 border border-[#1F1F1F] bg-[#020309] hover:border-[#EAEAEA]"
              >
                <span className="text-sm text-[#EAEAEA] font-mono">
                  {String(company.company || '')}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[#888888] font-mono">
                    {Number(company.count) || 0}
                  </span>
                  {company.trend === 'up' && (
                    <TrendingUp className="w-4 h-4 text-[#EAEAEA]" />
                  )}
                  {company.trend === 'down' && (
                    <TrendingUp className="w-4 h-4 text-[#888888] rotate-180" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
