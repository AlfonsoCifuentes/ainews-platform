'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Users, BookOpen, Trophy, Search, Zap, Award, Download, ShieldCheck, RefreshCcw } from 'lucide-react';

interface AnalyticsData {
  total_users: number;
  active_users_week: number;
  active_users_month: number;
  total_articles: number;
  articles_week: number;
  total_courses: number;
  total_enrollments: number;
  completed_enrollments: number;
  avg_quiz_score: number;
  searches_week: number;
  users_with_saved_articles: number;
  avg_streak_days: number;
}

interface TrendPoint {
  date: string;
  count: number;
  delta?: number;
}

export default function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [searchTrends, setSearchTrends] = useState<TrendPoint[]>([]);
  const [xpTrends, setXpTrends] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [needsToken, setNeedsToken] = useState(false);
  const [token, setToken] = useState('');

  const fetchAnalytics = useCallback(async (tokenOverride?: string) => {
    try {
      const headers: Record<string, string> = {};
      const effectiveToken = tokenOverride || token;
      if (effectiveToken) headers['x-analytics-token'] = effectiveToken;

      const response = await fetch('/api/analytics', { headers });
      if (response.status === 401) {
        setNeedsToken(true);
        setData(null);
        return;
      }
      const result = await response.json();
      setData(result.data);
      setSearchTrends(result.searchTrends || []);
      setXpTrends(result.xpTrends || []);
      setNeedsToken(false);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const saved = localStorage.getItem('analyticsToken');
    if (saved) setToken(saved);
    fetchAnalytics(saved ?? undefined);
  }, [fetchAnalytics]);

  const handleTokenSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    localStorage.setItem('analyticsToken', token);
    setLoading(true);
    await fetchAnalytics(token);
  };

  const handleExportCsv = async () => {
    try {
      const headers: Record<string, string> = {};
      if (token) headers['x-analytics-token'] = token;
      const res = await fetch('/api/analytics/export', { headers });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'analytics-export.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export analytics:', error);
    }
  };

  const insights = useMemo(() => {
    if (!data) return [] as Array<{ title: string; detail: string; severity: 'info' | 'warn' | 'alert' }>;

    const items: Array<{ title: string; detail: string; severity: 'info' | 'warn' | 'alert' }> = [];
    const completionRate = data.total_enrollments > 0
      ? Math.round((data.completed_enrollments / data.total_enrollments) * 100)
      : 0;

    if (completionRate >= 60) {
      items.push({
        title: 'Course completion momentum',
        detail: `Strong completion rate at ${completionRate}% of enrollments. Consider nudging streak users to finish pending modules.`,
        severity: 'info',
      });
    } else {
      items.push({
        title: 'Completion headroom',
        detail: `Completion rate is ${completionRate}%. Add reminders or shorter modules to lift completions.`,
        severity: 'warn',
      });
    }

    if (searchTrends.length > 3) {
      const last = searchTrends[searchTrends.length - 1].count;
      const avg = searchTrends.slice(-5).reduce((acc, p) => acc + p.count, 0) / Math.min(5, searchTrends.length);
      if (last > avg * 1.3) {
        items.push({
          title: 'Search spike detected',
          detail: `Queries jumped to ${last} vs ${avg.toFixed(1)} avg in the last few days. Consider caching/topical content surfacing.`,
          severity: 'info',
        });
      }
    }

    if (xpTrends.length > 3) {
      const lastDelta = xpTrends[xpTrends.length - 1].delta ?? 0;
      if (lastDelta < 0) {
        items.push({
          title: 'XP momentum slowing',
          detail: `Daily XP delta is negative (${lastDelta}). Re-engagement emails or streak boosts could help.`,
          severity: 'warn',
        });
      }
    }

    return items;
  }, [data, searchTrends, xpTrends]);

  const stats = data
    ? [
        {
          label: 'Total Users',
          value: data.total_users.toLocaleString(),
          change: `+${data.active_users_week} active this week`,
          icon: Users,
          color: 'from-blue-500 to-cyan-500'
        },
        {
          label: 'Articles Published',
          value: data.total_articles.toLocaleString(),
          change: `+${data.articles_week} this week`,
          icon: BookOpen,
          color: 'from-sky-500 to-cyan-500'
        },
        {
          label: 'Course Enrollments',
          value: data.total_enrollments.toLocaleString(),
          change: `${Math.round((data.completed_enrollments / data.total_enrollments) * 100)}% completed`,
          icon: Trophy,
          color: 'from-amber-500 to-orange-500'
        },
        {
          label: 'Search Queries',
          value: data.searches_week.toLocaleString(),
          change: 'Last 7 days',
          icon: Search,
          color: 'from-green-500 to-emerald-500'
        },
        {
          label: 'Average Quiz Score',
          value: `${Math.round(data.avg_quiz_score)}%`,
          change: 'Across all courses',
          icon: Award,
          color: 'from-indigo-500 to-blue-500'
        },
        {
          label: 'Average Streak',
          value: `${Math.round(data.avg_streak_days)} days`,
          change: 'User engagement',
          icon: Zap,
          color: 'from-rose-500 to-red-500'
        }
      ]
    : [];

  const engagement = useMemo(() => {
    if (!data || data.total_users === 0) {
      return { daily: 0, monthly: 0, saved: 0 };
    }
    return {
      daily: Math.round((data.active_users_week / data.total_users) * 100),
      monthly: Math.round((data.active_users_month / data.total_users) * 100),
      saved: Math.round((data.users_with_saved_articles / data.total_users) * 100)
    };
  }, [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!data && !needsToken) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Failed to load analytics data</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
      >
        <div>
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-bold">Analytics Dashboard</h1>
          </div>
          <p className="text-muted-foreground text-lg">Platform performance and user engagement metrics</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchAnalytics()}
            className="flex items-center gap-2 px-3 py-2 rounded-full border border-white/20 bg-white/5 text-sm hover:bg-white/10 transition"
          >
            <RefreshCcw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-3 py-2 rounded-full border border-primary/40 bg-primary/10 text-sm text-primary hover:bg-primary/20 transition"
          >
            <Download className="w-4 h-4" />
            CSV Export
          </button>
        </div>
      </motion.div>

      {/* Token Gate */}
      {needsToken && (
        <div className="mb-6 rounded-2xl border border-amber-400/50 bg-amber-500/10 p-4 text-sm">
          <div className="flex items-center gap-2 font-semibold text-amber-200">
            <ShieldCheck className="w-4 h-4" /> Admin token required
          </div>
          <p className="text-amber-100/80 mt-2">Enter the analytics access token to view data.</p>
          <form onSubmit={handleTokenSubmit} className="mt-3 flex gap-2 flex-col sm:flex-row">
            <input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
              placeholder="Enter token"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold"
            >
              Unlock
            </button>
          </form>
        </div>
      )}

      {/* Stats Grid */}
      {data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="relative overflow-hidden rounded-3xl backdrop-blur-xl bg-white/5 border border-white/15 p-6 group hover:scale-105 transition-transform duration-300"
                >
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}
                  />

                  <div className="relative">
                    <div className="flex items-start justify-between mb-4">
                      <div
                        className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}
                      >
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <TrendingUp className="w-5 h-5 text-green-400" />
                    </div>

                    <h3 className="text-3xl font-bold mb-2">{stat.value}</h3>
                    <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                    <p className="text-xs text-primary">{stat.change}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Engagement Metrics */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-3xl backdrop-blur-xl bg-white/5 border border-white/15 p-8 mb-8"
          >
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Users className="w-6 h-6 text-primary" />
              User Engagement
            </h2>

            <div className="space-y-6">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Weekly Active Users</span>
                  <span className="text-sm font-bold text-primary">{engagement.daily}%</span>
                </div>
                <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${engagement.daily}%` }}
                    transition={{ duration: 1, delay: 0.3 }}
                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Monthly Active Users</span>
                  <span className="text-sm font-bold text-primary">{engagement.monthly}%</span>
                </div>
                <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${engagement.monthly}%` }}
                    transition={{ duration: 1, delay: 0.4 }}
                    className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Users with Saved Content</span>
                  <span className="text-sm font-bold text-primary">{engagement.saved}%</span>
                </div>
                <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${engagement.saved}%` }}
                    transition={{ duration: 1, delay: 0.5 }}
                    className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
                  />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Insights */}
          {insights.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-3xl border border-primary/30 bg-primary/5 p-6"
            >
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2 text-primary">
                <Zap className="w-5 h-5" /> ML-ish Insights
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {insights.map((insight) => (
                  <div
                    key={insight.title}
                    className="rounded-2xl bg-black/30 border border-white/10 p-4"
                  >
                    <p className="text-sm text-white font-semibold">{insight.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{insight.detail}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </>
      )}

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="text-center text-sm text-muted-foreground mt-8"
      >
        Data refreshes automatically every hour
      </motion.p>
    </div>
  );
}
