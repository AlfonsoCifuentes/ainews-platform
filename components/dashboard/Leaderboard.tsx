/**
 * Leaderboard & Gamification Dashboard
 * Shows rankings, badges, and XP progress
 */

'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Trophy,
  TrendingUp,
  Award,
  Zap,
  Target,
  Crown,
  Medal,
  Star,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import LoadingSkeleton from '@/components/shared/LoadingSkeleton';

interface LeaderboardEntry {
  user_id: string;
  total_xp: number;
  level: number;
  streak_days: number;
  rank: number;
}

interface UserBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  xp_reward: number;
  isEarned: boolean;
  earnedAt?: string;
}

interface UserStats {
  xp: {
    total_xp: number;
    level: number;
    current_level_xp: number;
    xp_to_next_level: number;
    streak_days: number;
  };
  badges: UserBadge[];
}

interface LeaderboardProps {
  locale: 'en' | 'es';
}

export default function Leaderboard({ locale }: LeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'badges'>('leaderboard');

  const isSpanish = locale === 'es';

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Load leaderboard
        const leaderboardRes = await fetch(
          '/api/gamification?action=leaderboard&limit=50'
        );
        const leaderboardData = await leaderboardRes.json();
        setLeaderboard(leaderboardData.leaderboard || []);

        // Load badges
        const badgesRes = await fetch(
          `/api/gamification?action=badges&locale=${locale}`
        );
        const badgesData = await badgesRes.json();
        setBadges(badgesData.badges || []);

        // Load user stats
        const statsRes = await fetch('/api/gamification?action=stats');
        const statsData = await statsRes.json();
        setUserStats(statsData);
      } catch (error) {
        console.error('Failed to load leaderboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [locale]);

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary':
        return 'from-yellow-500 to-amber-600';
      case 'epic':
        return 'from-purple-500 to-pink-600';
      case 'rare':
        return 'from-blue-500 to-cyan-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const getRarityIcon = (rarity: string) => {
    switch (rarity) {
      case 'legendary':
        return <Crown className="w-4 h-4" />;
      case 'epic':
        return <Star className="w-4 h-4" />;
      case 'rare':
        return <Medal className="w-4 h-4" />;
      default:
        return <Award className="w-4 h-4" />;
    }
  };

  if (loading) {
    return <LoadingSkeleton variant="dashboard" count={1} />;
  }

  return (
    <div className="space-y-8">
      {/* User stats header */}
      {userStats && userStats.xp && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Level */}
          <Card className="p-6 backdrop-blur-xl bg-gradient-to-br from-primary/20 to-primary/5 border-primary/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">
                {isSpanish ? 'Nivel' : 'Level'}
              </span>
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div className="text-4xl font-bold">{userStats.xp.level}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {userStats.xp.current_level_xp} / {userStats.xp.xp_to_next_level} XP
            </div>
            {/* Progress bar */}
            <div className="mt-3 h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-primary to-purple-500"
                initial={{ width: 0 }}
                animate={{
                  width: `${(userStats.xp.current_level_xp / userStats.xp.xp_to_next_level) * 100}%`,
                }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </div>
          </Card>

          {/* Total XP */}
          <Card className="p-6 backdrop-blur-xl bg-gradient-to-br from-white/10 to-white/5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">
                {isSpanish ? 'XP Total' : 'Total XP'}
              </span>
              <Zap className="w-5 h-5 text-yellow-500" />
            </div>
            <div className="text-4xl font-bold">
              {userStats.xp.total_xp.toLocaleString()}
            </div>
          </Card>

          {/* Streak */}
          <Card className="p-6 backdrop-blur-xl bg-gradient-to-br from-orange-500/20 to-orange-500/5 border-orange-500/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">
                {isSpanish ? 'Racha' : 'Streak'}
              </span>
              <Target className="w-5 h-5 text-orange-500" />
            </div>
            <div className="text-4xl font-bold">{userStats.xp.streak_days}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {isSpanish ? 'días' : 'days'}
            </div>
          </Card>

          {/* Badges */}
          <Card className="p-6 backdrop-blur-xl bg-gradient-to-br from-purple-500/20 to-purple-500/5 border-purple-500/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">
                {isSpanish ? 'Insignias' : 'Badges'}
              </span>
              <Trophy className="w-5 h-5 text-purple-500" />
            </div>
            <div className="text-4xl font-bold">{userStats.badges.length}</div>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-4 border-b border-white/10">
        <button
          className={`pb-4 px-4 font-medium transition-all ${
            activeTab === 'leaderboard'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-white'
          }`}
          onClick={() => setActiveTab('leaderboard')}
        >
          <Trophy className="w-4 h-4 inline-block mr-2" />
          {isSpanish ? 'Clasificación' : 'Leaderboard'}
        </button>
        <button
          className={`pb-4 px-4 font-medium transition-all ${
            activeTab === 'badges'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-white'
          }`}
          onClick={() => setActiveTab('badges')}
        >
          <Award className="w-4 h-4 inline-block mr-2" />
          {isSpanish ? 'Insignias' : 'Badges'}
        </button>
      </div>

      {/* Content */}
      {activeTab === 'leaderboard' && (
        <div className="space-y-4">
          {leaderboard.map((entry, index) => (
            <motion.div
              key={entry.user_id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card
                className={`p-4 flex items-center gap-4 backdrop-blur-xl ${
                  index < 3
                    ? 'bg-gradient-to-r from-yellow-500/20 to-transparent border-yellow-500/30'
                    : 'bg-white/5'
                }`}
              >
                {/* Rank */}
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white/10 shrink-0">
                  {index === 0 && <Crown className="w-6 h-6 text-yellow-500" />}
                  {index === 1 && <Medal className="w-6 h-6 text-gray-400" />}
                  {index === 2 && <Medal className="w-6 h-6 text-amber-700" />}
                  {index > 2 && (
                    <span className="text-xl font-bold">{entry.rank}</span>
                  )}
                </div>

                {/* User info */}
                <div className="flex-1">
                  <div className="font-medium">
                    {isSpanish ? 'Usuario' : 'User'} {entry.user_id.slice(0, 8)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {isSpanish ? 'Nivel' : 'Level'} {entry.level} • {entry.streak_days}{' '}
                    {isSpanish ? 'días de racha' : 'day streak'}
                  </div>
                </div>

                {/* XP */}
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary">
                    {entry.total_xp.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">XP</div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {activeTab === 'badges' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {badges.map((badge, index) => (
            <motion.div
              key={badge.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card
                className={`p-6 backdrop-blur-xl ${
                  badge.isEarned
                    ? `bg-gradient-to-br ${getRarityColor(badge.rarity)}/20 border-${badge.rarity}/30`
                    : 'bg-white/5 opacity-60'
                }`}
              >
                {/* Badge icon */}
                <div className="text-6xl mb-4">{badge.icon}</div>

                {/* Badge info */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg">{badge.name}</h3>
                    <Badge
                      variant="secondary"
                      className={`flex items-center gap-1 bg-gradient-to-r ${getRarityColor(badge.rarity)}`}
                    >
                      {getRarityIcon(badge.rarity)}
                      {badge.rarity}
                    </Badge>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    {badge.description}
                  </p>

                  <div className="flex items-center gap-2 text-sm">
                    <Zap className="w-4 h-4 text-yellow-500" />
                    <span>
                      +{badge.xp_reward} XP
                    </span>
                  </div>

                  {badge.isEarned && badge.earnedAt && (
                    <div className="text-xs text-green-500 mt-2">
                      ✓ {isSpanish ? 'Conseguido el' : 'Earned on'}{' '}
                      {new Date(badge.earnedAt).toLocaleDateString(
                        locale === 'en' ? 'en-US' : 'es-ES'
                      )}
                    </div>
                  )}

                  {!badge.isEarned && (
                    <div className="text-xs text-muted-foreground mt-2">
                      🔒 {isSpanish ? 'Bloqueado' : 'Locked'}
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
