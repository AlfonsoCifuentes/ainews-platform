"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { FadeSlideTransition } from '@/components/shared/PageTransition';
import { useLeaderboard } from '@/lib/hooks/useLeaderboard';

interface LeaderboardPageClientProps {
  isAuthenticated: boolean;
  locale: 'en' | 'es';
  translations: Record<string, string>;
}

export function LeaderboardPageClient({
  isAuthenticated,
  locale,
  translations: t,
}: LeaderboardPageClientProps) {
  const [period, setPeriod] = useState<'all' | 'week' | 'month'>('all');
  const { users, currentUserRank, isLoading, error } = useLeaderboard(period, 100);

  return (
    <FadeSlideTransition>
      <main className="min-h-screen px-4 py-12">
        <div className="container mx-auto max-w-5xl">
          {/* Header */}
          <header className="mb-12 text-center">
            <h1 className="mb-3 bg-gradient-to-r from-primary via-purple-500 to-cyan-400 bg-clip-text text-5xl font-bold text-transparent">
              {t.title}
            </h1>
            <p className="text-lg text-muted-foreground">{t.subtitle}</p>
          </header>

          {/* Sign In Prompt for Unauthenticated Users */}
          {!isAuthenticated && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/10 to-purple-600/10 p-6 text-center"
            >
              <p className="mb-4 text-lg font-semibold">{t.signInPrompt}</p>
              <Link
                href={`/${locale}/auth/signin`}
                className="inline-block rounded-xl bg-primary px-8 py-3 font-semibold text-primary-foreground shadow-lg transition-all hover:shadow-xl hover:shadow-primary/50"
              >
                {t.signIn}
              </Link>
            </motion.div>
          )}

          {/* Period Tabs */}
          <div className="mb-6 flex justify-center gap-3">
            {(['all', 'week', 'month'] as const).map((p) => (
              <motion.button
                key={p}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setPeriod(p)}
                className={`rounded-xl px-6 py-2.5 font-semibold transition-all ${
                  period === p
                    ? 'bg-primary text-primary-foreground shadow-lg'
                    : 'border border-white/10 bg-black/20 text-muted-foreground hover:bg-white/5'
                }`}
              >
                {t[p]}
              </motion.button>
            ))}
          </div>

          {/* Leaderboard */}
          <div className="glass rounded-2xl border border-white/10 p-6">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold">{locale === 'en' ? 'Top Learners' : 'Mejores Estudiantes'}</h2>
              {currentUserRank && isAuthenticated && (
                <div className="rounded-full bg-primary/20 px-4 py-2 text-sm font-semibold text-primary">
                  {locale === 'en' ? 'Your Rank' : 'Tu Rango'}: #{currentUserRank}
                </div>
              )}
            </div>

            {isLoading ? (
              <div className="py-12 text-center text-muted-foreground">
                {locale === 'en' ? 'Loading...' : 'Cargando...'}
              </div>
            ) : error ? (
              <div className="py-12 text-center text-red-400">{error}</div>
            ) : (
              <>
                {/* Table Header */}
                <div className="mb-4 grid grid-cols-[60px_1fr_80px_100px_80px] gap-4 border-b border-white/10 pb-3 text-sm font-semibold text-muted-foreground">
                  <div className="text-center">{locale === 'en' ? 'Rank' : 'Rango'}</div>
                  <div>{locale === 'en' ? 'User' : 'Usuario'}</div>
                  <div className="text-center">{locale === 'en' ? 'Level' : 'Nivel'}</div>
                  <div className="text-right">XP</div>
                  <div className="text-center">{locale === 'en' ? 'Streak' : 'Racha'}</div>
                </div>

                {/* Users List */}
                <div className="space-y-2">
                  {users.map((user, index) => (
                    <motion.div
                      key={user.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className={`grid grid-cols-[60px_1fr_80px_100px_80px] gap-4 items-center rounded-xl p-3 transition-all hover:bg-white/5 ${
                        user.rank <= 3 ? 'bg-gradient-to-r from-primary/10 to-transparent' : ''
                      }`}
                    >
                      {/* Rank */}
                      <div className="text-center">
                        {user.rank === 1 && <span className="text-3xl">🥇</span>}
                        {user.rank === 2 && <span className="text-3xl">🥈</span>}
                        {user.rank === 3 && <span className="text-3xl">🥉</span>}
                        {user.rank > 3 && (
                          <span className="text-lg font-bold text-muted-foreground">#{user.rank}</span>
                        )}
                      </div>

                      {/* User */}
                      <div className="flex items-center gap-3">
                        <div className="relative h-10 w-10 overflow-hidden rounded-lg bg-gradient-to-br from-primary/20 to-purple-600/20">
                          {user.avatar_url ? (
                            <Image
                              src={user.avatar_url}
                              alt={user.display_name || 'User'}
                              width={40}
                              height={40}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-lg font-bold text-primary">
                              {(user.display_name || 'U')[0].toUpperCase()}
                            </div>
                          )}
                        </div>
                        <span className="font-semibold">{user.display_name || 'Anonymous'}</span>
                      </div>

                      {/* Level */}
                      <div className="text-center">
                        <span className="rounded-full bg-primary/20 px-3 py-1 text-sm font-bold text-primary">
                          Lv {user.level}
                        </span>
                      </div>

                      {/* XP */}
                      <div className="text-right font-bold">{user.total_xp.toLocaleString()}</div>

                      {/* Streak */}
                      <div className="text-center">
                        {user.streak_days > 0 ? (
                          <span className="flex items-center justify-center gap-1">
                            <span>🔥</span>
                            <span className="font-semibold">{user.streak_days}</span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </FadeSlideTransition>
  );
}
