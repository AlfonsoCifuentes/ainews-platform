'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Users, BookOpen, Trophy, Search, Zap, Award } from 'lucide-react';

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

export default function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/analytics');
      const result = await response.json();
      setData(result.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Failed to load analytics data</p>
      </div>
    );
  }

  const stats = [
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
      color: 'from-purple-500 to-pink-500'
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
      color: 'from-indigo-500 to-purple-500'
    },
    {
      label: 'Average Streak',
      value: `${Math.round(data.avg_streak_days)} days`,
      change: 'User engagement',
      icon: Zap,
      color: 'from-rose-500 to-red-500'
    }
  ];

  const engagement = {
    daily: Math.round((data.active_users_week / data.total_users) * 100),
    monthly: Math.round((data.active_users_month / data.total_users) * 100),
    saved: Math.round((data.users_with_saved_articles / data.total_users) * 100)
  };

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12"
      >
        <div className="flex items-center gap-3 mb-4">
          <BarChart3 className="w-8 h-8 text-primary" />
          <h1 className="text-4xl font-bold">Analytics Dashboard</h1>
        </div>
        <p className="text-muted-foreground text-lg">Platform performance and user engagement metrics</p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="relative overflow-hidden rounded-3xl backdrop-blur-xl bg-white/10 border border-white/20 p-6 group hover:scale-105 transition-transform duration-300"
            >
              {/* Gradient background */}
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
                  <TrendingUp className="w-5 h-5 text-green-500" />
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
        transition={{ delay: 0.6 }}
        className="rounded-3xl backdrop-blur-xl bg-white/10 border border-white/20 p-8"
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
                transition={{ duration: 1, delay: 0.7 }}
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"
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
                transition={{ duration: 1, delay: 0.8 }}
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
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
                transition={{ duration: 1, delay: 0.9 }}
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Refresh Note */}
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
