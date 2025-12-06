'use client';

import { useEffect, useState } from 'react';
import { AILeaderboardPodium } from '@/components/trending/AILeaderboardPodium';
import { GlobalAIActivity } from './GlobalAIActivity';
import { DomainDistribution } from './DomainDistribution';
import type { NewsAnalytics } from '@/lib/types/news-analytics';

interface NewsInsightsProps {
  locale: 'en' | 'es';
}

export function NewsInsights({ locale }: NewsInsightsProps) {
  const [insights, setInsights] = useState<NewsAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchInsights() {
      try {
        const response = await fetch('/api/news/insights');
        const data = await response.json();
        
        if (data.success && data.data) {
          setInsights(data.data);
        }
      } catch (error) {
        console.error('Error fetching insights:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchInsights();

    // Refresh every 2 hours
    const interval = setInterval(fetchInsights, 2 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !insights) {
    return (
      <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-8">
        {/* Loading skeletons - Brutalist style */}
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="w-full h-[400px] bg-transparent border border-white/12 animate-pulse"
          >
            <div className="h-full flex flex-col">
              <div className="h-8 bg-white/10 m-4" />
              <div className="flex-1 bg-white/10 mx-4 mb-4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-8">
      {/* Column 1: AI Leaderboard Podium */}
      <div className="w-full">
        <AILeaderboardPodium locale={locale} />
      </div>

      {/* Column 2: Global AI Activity */}
      <div className="w-full">
        <GlobalAIActivity
          articlesAnalyzed={insights.articles_analyzed}
          topCompanies={insights.company_activity}
          activeRegions={5}
          researchPapers={insights.articles_analyzed ? Math.floor(insights.articles_analyzed * 0.3) : 0}
        />
      </div>

      {/* Column 3: Domain Distribution */}
      <div className="w-full">
        <DomainDistribution
          distribution={insights.domain_distribution}
          locale={locale}
        />
      </div>
    </div>
  );
}
