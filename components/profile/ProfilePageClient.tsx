"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { FadeSlideTransition } from '@/components/shared/PageTransition';
import { XPProgress } from '@/components/dashboard/XPProgress';
import { AchievementsGrid } from '@/components/dashboard/AchievementsGrid';
import { ProfileEditor } from '@/components/profile/ProfileEditor';
import { ActivityFeed } from '@/components/profile/ActivityFeed';
import type { UserProfile, UserAchievement, Badge, UserXPLog } from '@/lib/types/user';

interface ProfilePageClientProps {
  profile: UserProfile | null;
  achievements: UserAchievement[];
  badges: Badge[];
  recentXP: UserXPLog[];
  stats: {
    enrolledCount: number;
    createdCount: number;
    completedCount: number;
  };
  locale: 'en' | 'es';
  translations: Record<string, string>;
}

export function ProfilePageClient({
  profile,
  achievements,
  badges,
  recentXP,
  stats,
  locale,
  translations: t,
}: ProfilePageClientProps) {
  const [isEditing, setIsEditing] = useState(false);

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">{locale === 'en' ? 'Loading profile...' : 'Cargando perfil...'}</p>
      </div>
    );
  }

  return (
    <FadeSlideTransition>
      <main className="min-h-screen px-4 py-12">
        <div className="container mx-auto max-w-7xl">
          {/* Header */}
          <header className="mb-12 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-6">
              {/* Avatar */}
              <div className="relative">
                <div className="h-24 w-24 overflow-hidden rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/20 to-purple-600/20 md:h-32 md:w-32">
                  {profile.avatar_url ? (
                    <Image
                      src={profile.avatar_url}
                      alt={profile.display_name || 'User'}
                      width={128}
                      height={128}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-primary md:text-5xl">
                      {(profile.display_name || 'U')[0].toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-2 -right-2 rounded-full bg-primary px-3 py-1 text-sm font-bold">
                  Lv {profile.level || 1}
                </div>
              </div>

              {/* Info */}
              <div>
                <h1 className="mb-2 text-3xl font-bold md:text-4xl">{profile.display_name || 'User'}</h1>
                {profile.bio && (
                  <p className="mb-4 max-w-2xl text-muted-foreground">{profile.bio}</p>
                )}
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🔥</span>
                    <span className="font-semibold">{profile.streak_days || 0}</span>
                    <span className="text-muted-foreground">{t.streak}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">⭐</span>
                    <span className="font-semibold">{profile.total_xp || 0}</span>
                    <span className="text-muted-foreground">{t.totalXP}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Edit Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsEditing(!isEditing)}
              className="rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-lg transition-all hover:shadow-xl hover:shadow-primary/50"
            >
              {isEditing ? t.cancel : t.editProfile}
            </motion.button>
          </header>

          {/* Edit Mode */}
          {isEditing && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-8"
            >
              <ProfileEditor
                profile={profile}
                locale={locale}
                translations={t}
                onSave={() => setIsEditing(false)}
                onCancel={() => setIsEditing(false)}
              />
            </motion.div>
          )}

          {/* XP Progress */}
          <div className="mb-8">
            <XPProgress
              totalXP={profile.total_xp || 0}
              locale={locale}
            />
          </div>

          {/* Stats Grid */}
          <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
            <StatCard
              icon="📚"
              label={t.coursesEnrolled}
              value={stats.enrolledCount}
              color="from-blue-500/20 to-cyan-500/20"
            />
            <StatCard
              icon="✍️"
              label={t.coursesCreated}
              value={stats.createdCount}
              color="from-purple-500/20 to-pink-500/20"
            />
            <StatCard
              icon="✅"
              label={t.coursesCompleted}
              value={stats.completedCount}
              color="from-green-500/20 to-emerald-500/20"
            />
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Main Content */}
            <div className="space-y-8 lg:col-span-2">
              {/* Achievements */}
              <section>
                <h2 className="mb-4 text-2xl font-bold">{t.achievements}</h2>
                <AchievementsGrid achievements={achievements} locale={locale} />
              </section>

              {/* Recent Activity */}
              <section>
                <h2 className="mb-4 text-2xl font-bold">{t.recentActivity}</h2>
                <ActivityFeed activities={recentXP} locale={locale} />
              </section>
            </div>

            {/* Sidebar */}
            <div className="space-y-8">
              {/* Badges */}
              <section>
                <h2 className="mb-4 text-xl font-bold">{t.badges}</h2>
                <div className="grid grid-cols-2 gap-3">
                  {badges.map((badge) => (
                    <motion.div
                      key={badge.id}
                      whileHover={{ scale: 1.05, rotateZ: 5 }}
                      className="glass rounded-xl border border-white/10 p-4 text-center"
                    >
                      <div className="mb-2 text-3xl">{badge.badge_icon}</div>
                      <p className="text-xs font-semibold">{badge.badge_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(badge.earned_at).toLocaleDateString(locale)}
                      </p>
                    </motion.div>
                  ))}
                  {badges.length === 0 && (
                    <div className="col-span-2 py-8 text-center text-muted-foreground">
                      {locale === 'en' ? 'No badges yet. Keep learning!' : '¡Aún no hay insignias. Sigue aprendiendo!'}
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>
    </FadeSlideTransition>
  );
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      className={`glass rounded-2xl border border-white/10 bg-gradient-to-br p-6 ${color}`}
    >
      <div className="mb-2 text-3xl">{icon}</div>
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </motion.div>
  );
}
