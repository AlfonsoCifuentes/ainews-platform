'use client';

import { motion } from 'framer-motion';
import { Link } from '@/i18n';
import Image from 'next/image';

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

/**
 * LeaderboardStrip - Gamification leaderboard preview
 * Shows top learners with XP and weekly progress
 */
export function LeaderboardStrip({ leaders, summary, locale }: LeaderboardStripProps) {
  return (
    <section className="relative py-16 lg:py-24 overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        <div className="grid lg:grid-cols-[1fr_auto] gap-12 items-center">
          {/* Left: Content */}
          <div>
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex items-center gap-3 mb-3"
            >
              <span className="text-2xl">🏆</span>
              <span className="text-xs uppercase tracking-[0.2em] text-amber-500/80 font-semibold">
                {locale === 'en' ? 'Leaderboard' : 'Clasificación'}
              </span>
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-4"
            >
              {locale === 'en' ? 'Top Learners' : 'Mejores Estudiantes'}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-white/50 max-w-md"
            >
              {locale === 'en'
                ? 'Compete with the community. Complete courses and exercises to earn XP.'
                : 'Compite con la comunidad. Completa cursos y ejercicios para ganar XP.'
              }
            </motion.p>

            {/* Stats summary */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="flex gap-8 mt-8"
            >
              <div>
                <p className="text-3xl font-black text-primary">
                  {summary.totalUsers.toLocaleString()}
                </p>
                <p className="text-xs text-white/40 uppercase tracking-wider mt-1">
                  {locale === 'en' ? 'Active Learners' : 'Estudiantes Activos'}
                </p>
              </div>
              <div>
                <p className="text-3xl font-black text-amber-500">
                  {summary.weeklyXpAwarded.toLocaleString()}
                </p>
                <p className="text-xs text-white/40 uppercase tracking-wider mt-1">
                  {locale === 'en' ? 'Weekly XP' : 'XP Semanal'}
                </p>
              </div>
            </motion.div>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="mt-8"
            >
              <Link href="/leaderboard">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-6 py-3 rounded-full bg-white/5 border border-white/10 text-white font-semibold hover:bg-white/10 transition-colors flex items-center gap-2"
                >
                  {locale === 'en' ? 'View Full Leaderboard' : 'Ver Clasificación Completa'}
                  <motion.span
                    animate={{ x: [0, 4, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    →
                  </motion.span>
                </motion.button>
              </Link>
            </motion.div>
          </div>

          {/* Right: Top 5 leaders */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="w-full lg:w-[360px]"
          >
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-sm overflow-hidden">
              {/* Header */}
              <div className="px-5 py-4 border-b border-white/5 bg-white/[0.02]">
                <h3 className="text-sm font-semibold text-white/70">
                  {locale === 'en' ? 'This Week' : 'Esta Semana'}
                </h3>
              </div>

              {/* Leader list */}
              <div className="divide-y divide-white/5">
                {leaders.slice(0, 5).map((leader, i) => (
                  <motion.div
                    key={leader.id}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + i * 0.05 }}
                    className="px-5 py-3 flex items-center gap-4 hover:bg-white/[0.02] transition-colors"
                  >
                    {/* Rank */}
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                      ${leader.rank === 1 
                        ? 'bg-amber-500/20 text-amber-400' 
                        : leader.rank === 2 
                          ? 'bg-gray-400/20 text-gray-300'
                          : leader.rank === 3
                            ? 'bg-orange-700/20 text-orange-400'
                            : 'bg-white/5 text-white/40'
                      }
                    `}>
                      {leader.rank <= 3 ? ['🥇', '🥈', '🥉'][leader.rank - 1] : leader.rank}
                    </div>

                    {/* Avatar */}
                    <div className="relative w-10 h-10 rounded-full overflow-hidden bg-white/10 flex-shrink-0">
                      {leader.avatarUrl ? (
                        <Image
                          src={leader.avatarUrl}
                          alt={leader.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-lg">
                          {leader.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Name and XP */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white truncate">{leader.name}</p>
                      <p className="text-xs text-white/40">
                        {leader.xp.toLocaleString()} XP
                      </p>
                    </div>

                    {/* Weekly delta */}
                    <div className={`
                      text-xs font-semibold
                      ${leader.weeklyDelta > 0 ? 'text-green-400' : 'text-white/30'}
                    `}>
                      {leader.weeklyDelta > 0 ? '+' : ''}{leader.weeklyDelta.toLocaleString()}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
