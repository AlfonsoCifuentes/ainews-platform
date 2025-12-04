"use client";

import { useState, useEffect } from 'react';

interface NewsStatsProps {
  locale: 'en' | 'es';
}

interface Stats {
  todayCount: number;
  totalSources: number;
  lastUpdated: string;
  avgQualityScore: number;
}

export function NewsStats({ locale }: NewsStatsProps) {
  const [stats, setStats] = useState<Stats>({
    todayCount: 0,
    totalSources: 50,
    lastUpdated: '...',
    avgQualityScore: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
        });
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 120000);
    return () => clearInterval(interval);
  }, [locale]);

  const statsCards = [
    {
      label: locale === 'en' ? 'Today' : 'Hoy',
      value: loading ? '...' : stats.todayCount,
      icon: '📰',
      suffix: locale === 'en' ? 'articles' : 'artículos'
    },
    {
      label: locale === 'en' ? 'Sources' : 'Fuentes',
      value: stats.totalSources,
      icon: '🌐',
      suffix: '+'
    },
    {
      label: locale === 'en' ? 'Quality' : 'Calidad',
      value: loading ? '...' : stats.avgQualityScore,
      icon: '⭐',
      suffix: '%'
    },
    {
      label: locale === 'en' ? 'Updated' : 'Actualizado',
      value: stats.lastUpdated,
      icon: '🕐',
      suffix: ''
    }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {statsCards.map((stat) => (
        <div
          key={stat.label}
          className="relative overflow-hidden border border-[#1F1F1F] bg-[#0A0A0A] p-4"
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xl">{stat.icon}</span>
            <span className="text-xs font-mono tracking-widest text-[#888888]">
              {stat.label.toUpperCase()}
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-white font-mono">
              {stat.value}
            </span>
            {stat.suffix && (
              <span className="text-sm text-[#888888] font-mono">{stat.suffix}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
