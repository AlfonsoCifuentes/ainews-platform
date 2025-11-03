'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  FileText,
  Flag,
  Shield,
  Activity,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import { ModerationQueue } from './ModerationQueue';
import { ContentReports } from './ContentReports';
import { SystemLogs } from './SystemLogs';
import { UserManagement } from './UserManagement';

interface AdminStats {
  pendingModeration: number;
  pendingReports: number;
  totalUsers: number;
  totalArticles: number;
  totalCourses: number;
}

type TabType = 'dashboard' | 'moderation' | 'reports' | 'users' | 'logs';

interface AdminDashboardProps {
  locale: 'en' | 'es';
}

export function AdminDashboard({ locale }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const t = locale === 'en' ? {
    title: 'Admin Dashboard',
    dashboard: 'Dashboard',
    moderation: 'Moderation Queue',
    reports: 'Content Reports',
    users: 'User Management',
    logs: 'System Logs',
    pendingModeration: 'Pending Moderation',
    pendingReports: 'Pending Reports',
    totalUsers: 'Total Users',
    totalArticles: 'Total Articles',
    totalCourses: 'Total Courses',
    items: 'items',
    usersLabel: 'users',
    articlesLabel: 'articles',
    coursesLabel: 'courses',
  } : {
    title: 'Panel de Administración',
    dashboard: 'Panel',
    moderation: 'Cola de Moderación',
    reports: 'Reportes de Contenido',
    users: 'Gestión de Usuarios',
    logs: 'Registros del Sistema',
    pendingModeration: 'Moderación Pendiente',
    pendingReports: 'Reportes Pendientes',
    totalUsers: 'Total de Usuarios',
    totalArticles: 'Total de Artículos',
    totalCourses: 'Total de Cursos',
    items: 'elementos',
    usersLabel: 'usuarios',
    articlesLabel: 'artículos',
    coursesLabel: 'cursos',
  };

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await fetch('/api/admin/stats');
      const data = await response.json();
      if (response.ok) {
        setStats(data.data);
      }
    } catch {
      console.error('Failed to load stats');
    } finally {
      setIsLoading(false);
    }
  };

  const tabs = [
    { id: 'dashboard' as TabType, label: t.dashboard, icon: LayoutDashboard },
    { id: 'moderation' as TabType, label: t.moderation, icon: Shield, badge: stats?.pendingModeration },
    { id: 'reports' as TabType, label: t.reports, icon: Flag, badge: stats?.pendingReports },
    { id: 'users' as TabType, label: t.users, icon: Users },
    { id: 'logs' as TabType, label: t.logs, icon: Activity },
  ];

  const statCards = [
    {
      title: t.pendingModeration,
      value: stats?.pendingModeration || 0,
      subtitle: t.items,
      icon: Shield,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
    },
    {
      title: t.pendingReports,
      value: stats?.pendingReports || 0,
      subtitle: t.items,
      icon: AlertCircle,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
    },
    {
      title: t.totalUsers,
      value: stats?.totalUsers || 0,
      subtitle: t.usersLabel,
      icon: Users,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: t.totalArticles,
      value: stats?.totalArticles || 0,
      subtitle: t.articlesLabel,
      icon: FileText,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: t.totalCourses,
      value: stats?.totalCourses || 0,
      subtitle: t.coursesLabel,
      icon: TrendingUp,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">{t.title}</h1>
          <p className="text-muted-foreground">
            Manage content, users, and system settings
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl whitespace-nowrap transition-all relative ${
                  activeTab === tab.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary hover:bg-secondary/80'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="space-y-6">
          {activeTab === 'dashboard' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-32 rounded-2xl bg-secondary animate-pulse"
                  />
                ))
              ) : (
                statCards.map((card, index) => {
                  const Icon = card.icon;
                  return (
                    <motion.div
                      key={card.title}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-6 rounded-2xl bg-secondary border border-white/10 hover:border-primary/50 transition-all"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className={`p-3 rounded-xl ${card.bgColor}`}>
                          <Icon className={`w-6 h-6 ${card.color}`} />
                        </div>
                      </div>
                      <h3 className="text-sm text-muted-foreground mb-1">
                        {card.title}
                      </h3>
                      <div className="text-3xl font-bold mb-1">
                        {card.value.toLocaleString()}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {card.subtitle}
                      </p>
                    </motion.div>
                  );
                })
              )}
            </motion.div>
          )}

          {activeTab === 'moderation' && <ModerationQueue locale={locale} />}
          {activeTab === 'reports' && <ContentReports locale={locale} />}
          {activeTab === 'users' && <UserManagement locale={locale} />}
          {activeTab === 'logs' && <SystemLogs locale={locale} />}
        </div>
      </div>
    </div>
  );
}
