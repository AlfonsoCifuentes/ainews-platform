'use client';

import { Link } from '@/i18n';
import Image from 'next/image';
import { Trophy, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface Leader {
  id: string;
  name: string;
  avatarUrl?: string;
  xp: number;
  weeklyDelta: number;
  rank: number;
}

interface LeaderboardStripProps {
  leaders: Leader[];
  summary: {
    totalUsers: number;
    weeklyXpAwarded: number;
  };
  locale: 'en' | 'es';
}

function getTrend(delta: number) {
  if (delta > 0) return 'up';
  if (delta < 0) return 'down';
  return 'neutral';
}

/**
 * LeaderboardStrip - Brutalist leaderboard section
 * - Centered, ranked list
 * - Trophy icon for top
 * - Trend indicators
 */
export function LeaderboardStrip({ leaders, summary, locale }: LeaderboardStripProps) {
  return (
    <section className="py-24 border-t border-[#1F1F1F] relative z-10">
      <div className="max-w-4xl mx-auto px-6 md:px-12 text-center">
        <h2 className="text-sm font-mono tracking-widest text-[#888888] mb-12 uppercase">
          {locale === 'en' ? 'LEADERBOARD' : 'CLASIFICACIÓN'}
        </h2>

        <div className="space-y-4">
          {leaders.slice(0, 5).map((leader) => {
            const trend = getTrend(leader.weeklyDelta);
            return (
              <div
                key={leader.id}
                className={`flex items-center justify-between p-4 border ${
                  leader.rank === 1
                    ? 'border-white bg-white/5 scale-105'
                    : 'border-[#1F1F1F] bg-[#0A0A0A]'
                } rounded-sm transition-transform hover:scale-[1.02]`}
              >
                <div className="flex items-center gap-6">
                  <div
                    className={`w-10 h-10 flex items-center justify-center font-bold text-lg ${
                      leader.rank === 1 ? 'text-white' : 'text-[#888888]'
                    }`}
                  >
                    {leader.rank === 1 ? (
                      <Trophy size={20} className="text-white" />
                    ) : (
                      `#${leader.rank}`
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white/10 rounded-full overflow-hidden">
                      {leader.avatarUrl ? (
                        <Image
                          src={leader.avatarUrl}
                          alt={leader.name}
                          width={40}
                          height={40}
                          className="w-full h-full object-cover grayscale"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white text-lg font-bold">
                          {leader.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <span className="text-lg font-medium text-[#EAEAEA]">{leader.name}</span>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <span className="font-mono text-white tracking-widest">
                    {leader.xp.toLocaleString()}
                  </span>
                  {trend === 'up' && <TrendingUp size={16} className="text-white" />}
                  {trend === 'down' && <TrendingDown size={16} className="text-[#888888]" />}
                  {trend === 'neutral' && <Minus size={16} className="text-[#888888]" />}
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary stats */}
        <div className="flex justify-center gap-12 mt-12 font-mono text-sm">
          <div>
            <span className="text-[#888888] block text-xs uppercase tracking-widest mb-1">
              {locale === 'en' ? 'LEARNERS' : 'ESTUDIANTES'}
            </span>
            <span className="text-white text-2xl font-bold">{summary.totalUsers}</span>
          </div>
          <div>
            <span className="text-[#888888] block text-xs uppercase tracking-widest mb-1">
              {locale === 'en' ? 'WEEKLY XP' : 'XP SEMANAL'}
            </span>
            <span className="text-white text-2xl font-bold">{summary.weeklyXpAwarded}</span>
          </div>
        </div>

        {/* View all link */}
        <Link href={`/${locale}/leaderboard`}>
          <div className="mt-8 inline-flex items-center gap-2 text-sm font-mono text-[#888888] hover:text-white transition-colors border border-[#1F1F1F] px-6 py-3 hover:border-white">
            <span>{locale === 'en' ? 'VIEW FULL LEADERBOARD' : 'VER CLASIFICACIÓN COMPLETA'}</span>
            <span>→</span>
          </div>
        </Link>
      </div>
    </section>
  );
}
