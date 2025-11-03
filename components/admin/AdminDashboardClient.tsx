'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  TrendingUp,
  Users,
  FileText,
  BookOpen,
  AlertCircle,
  CheckCircle,
  Clock,
  Zap,
  BarChart3,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';

interface AdminDashboardClientProps {
  stats: {
    totalArticles: number;
    totalCourses: number;
    totalUsers: number;
    pendingFeedback: number;
  };
  recentArticles: Array<{
    id: string;
    created_at: string;
    ai_generated: boolean;
  }>;
  recentCourses: Array<{
    id: string;
    created_at: string;
  }>;
  recentLogs: Array<{
    id: string;
    action_type: string;
    success: boolean;
    timestamp: string;
    execution_time?: number;
  }>;
}

export function AdminDashboardClient({
  stats,
  recentArticles,
  recentCourses,
  recentLogs,
}: AdminDashboardClientProps) {
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h');

  const statCards = [
    {
      title: 'Total Articles',
      value: stats.totalArticles.toLocaleString(),
      icon: FileText,
      color: 'from-blue-500 to-cyan-500',
      change: '+12%',
    },
    {
      title: 'Total Courses',
      value: stats.totalCourses.toLocaleString(),
      icon: BookOpen,
      color: 'from-purple-500 to-pink-500',
      change: '+8%',
    },
    {
      title: 'Total Users',
      value: stats.totalUsers.toLocaleString(),
      icon: Users,
      color: 'from-green-500 to-emerald-500',
      change: '+24%',
    },
    {
      title: 'Pending Feedback',
      value: stats.pendingFeedback.toLocaleString(),
      icon: AlertCircle,
      color: 'from-orange-500 to-red-500',
      change: '-5%',
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-cyan-500 bg-clip-text text-transparent">
          Admin Dashboard
        </h1>
        <p className="text-muted-foreground">AI System Monitoring & Management</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="relative overflow-hidden border-white/10 bg-white/5 backdrop-blur-xl p-6 group hover:border-primary/50 transition-colors">
                {/* Gradient overlay */}
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-10 transition-opacity`} />
                
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color} bg-opacity-10`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <span className={`text-sm font-semibold ${stat.change.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
                      {stat.change}
                    </span>
                  </div>
                  
                  <h3 className="text-3xl font-bold mb-1">{stat.value}</h3>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Time Range Selector */}
      <div className="flex gap-2 mb-6">
        {(['24h', '7d', '30d'] as const).map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              timeRange === range
                ? 'bg-primary text-white'
                : 'bg-white/5 text-muted-foreground hover:bg-white/10'
            }`}
          >
            {range}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card className="border-white/10 bg-white/5 backdrop-blur-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-primary/10">
              <Activity className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-xl font-semibold">Recent Activity</h2>
          </div>

          <div className="space-y-4">
            {recentLogs.slice(0, 10).map((log) => (
              <div
                key={log.id}
                className="flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
              >
                {log.success ? (
                  <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{log.action_type}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(log.timestamp).toLocaleString()}
                  </p>
                </div>
                {log.execution_time && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{log.execution_time}ms</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* AI Performance */}
        <Card className="border-white/10 bg-white/5 backdrop-blur-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Zap className="h-5 w-5 text-purple-500" />
            </div>
            <h2 className="text-xl font-semibold">AI Performance</h2>
          </div>

          <div className="space-y-6">
            {/* Success Rate */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Success Rate</span>
                <span className="text-sm font-semibold">98.5%</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full" style={{ width: '98.5%' }} />
              </div>
            </div>

            {/* Avg Response Time */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Avg Response Time</span>
                <span className="text-sm font-semibold">245ms</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full" style={{ width: '65%' }} />
              </div>
            </div>

            {/* API Calls Today */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">API Calls Today</span>
                <span className="text-sm font-semibold">1,247</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" style={{ width: '82%' }} />
              </div>
            </div>

            {/* Cost Efficiency */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Cost Efficiency</span>
                <span className="text-sm font-semibold text-green-500">$0.00</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Running on free tier - 100% cost optimized
              </p>
            </div>
          </div>
        </Card>

        {/* Recent Content */}
        <Card className="border-white/10 bg-white/5 backdrop-blur-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-cyan-500/10">
              <BarChart3 className="h-5 w-5 text-cyan-500" />
            </div>
            <h2 className="text-xl font-semibold">Recent Articles</h2>
          </div>

          <div className="space-y-3">
            {recentArticles.slice(0, 8).map((article) => (
              <div
                key={article.id}
                className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${article.ai_generated ? 'bg-purple-500' : 'bg-blue-500'}`} />
                  <div>
                    <p className="text-sm font-medium line-clamp-1">Article #{article.id.slice(0, 8)}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(article.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {article.ai_generated && (
                  <span className="text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-300">
                    AI
                  </span>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Recent Courses */}
        <Card className="border-white/10 bg-white/5 backdrop-blur-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-green-500/10">
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
            <h2 className="text-xl font-semibold">Recent Courses</h2>
          </div>

          <div className="space-y-3">
            {recentCourses.slice(0, 8).map((course) => (
              <div
                key={course.id}
                className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <BookOpen className="h-4 w-4 text-green-500" />
                  <div>
                    <p className="text-sm font-medium">Course #{course.id.slice(0, 8)}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(course.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
