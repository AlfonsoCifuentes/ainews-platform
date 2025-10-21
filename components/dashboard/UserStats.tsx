'use client';

import { motion } from 'framer-motion';

interface UserStatsProps {
  profile: {
    total_xp: number;
    level: number;
    streak_days: number;
  } | null;
  enrollments: Array<{
    completed_at: string | null;
  }>;
  locale: 'en' | 'es';
  translations: {
    streak: string;
    level: string;
    xp: string;
    coursesCompleted: string;
  };
}

export function UserStats({ profile, enrollments, translations }: UserStatsProps) {
  const completedCourses = enrollments.filter((e) => e.completed_at !== null).length;

  const stats = [
    {
      label: translations.level,
      value: profile?.level || 1,
      icon: '🏆',
      color: 'from-yellow-400 to-orange-500',
    },
    {
      label: translations.xp,
      value: profile?.total_xp || 0,
      icon: '⚡',
      color: 'from-blue-400 to-purple-500',
    },
    {
      label: translations.streak,
      value: `${profile?.streak_days || 0}`,
      icon: '🔥',
      color: 'from-red-400 to-pink-500',
    },
    {
      label: translations.coursesCompleted,
      value: completedCourses,
      icon: '📚',
      color: 'from-green-400 to-teal-500',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="relative overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-lg"
        >
          <div
            className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-10`}
          ></div>
          <div className="relative">
            <div className="text-4xl mb-2">{stat.icon}</div>
            <div className="text-3xl font-bold mb-1">{stat.value}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
