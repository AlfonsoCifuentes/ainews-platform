'use client';

import { motion } from 'framer-motion';

interface BadgesCollectionProps {
  badges: Array<{
    badge_type: string;
    earned_at: string;
  }>;
  locale: 'en' | 'es';
  translations: {
    title: string;
  };
}

const badgeInfo = {
  first_course: {
    icon: '🎓',
    color: 'from-blue-400 to-blue-600',
    name: { en: 'First Course', es: 'Primer Curso' },
  },
  course_master: {
    icon: '👑',
    color: 'from-yellow-400 to-yellow-600',
    name: { en: 'Course Master', es: 'Maestro de Cursos' },
  },
  speed_learner: {
    icon: '⚡',
    color: 'from-purple-400 to-purple-600',
    name: { en: 'Speed Learner', es: 'Aprendiz Rápido' },
  },
  perfect_score: {
    icon: '💯',
    color: 'from-green-400 to-green-600',
    name: { en: 'Perfect Score', es: 'Puntaje Perfecto' },
  },
  week_streak: {
    icon: '🔥',
    color: 'from-orange-400 to-red-600',
    name: { en: '7-Day Streak', es: 'Racha de 7 Días' },
  },
  month_streak: {
    icon: '🚀',
    color: 'from-pink-400 to-red-600',
    name: { en: '30-Day Streak', es: 'Racha de 30 Días' },
  },
  year_streak: {
    icon: '🌟',
    color: 'from-indigo-400 to-purple-600',
    name: { en: 'Year Streak', es: 'Racha Anual' },
  },
  early_adopter: {
    icon: '🎖️',
    color: 'from-gray-400 to-gray-600',
    name: { en: 'Early Adopter', es: 'Adoptador Temprano' },
  },
  contributor: {
    icon: '🤝',
    color: 'from-teal-400 to-teal-600',
    name: { en: 'Contributor', es: 'Contribuidor' },
  },
  helpful: {
    icon: '💙',
    color: 'from-blue-400 to-cyan-600',
    name: { en: 'Helpful', es: 'Útil' },
  },
  news_reader: {
    icon: '📰',
    color: 'from-emerald-400 to-emerald-600',
    name: { en: 'News Reader', es: 'Lector de Noticias' },
  },
  course_creator: {
    icon: '🎨',
    color: 'from-violet-400 to-violet-600',
    name: { en: 'Course Creator', es: 'Creador de Cursos' },
  },
};

export function BadgesCollection({ badges, locale, translations }: BadgesCollectionProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
      <h2 className="text-2xl font-bold mb-4">{translations.title}</h2>

      {badges.length === 0 ? (
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          {locale === 'en'
            ? 'Complete courses and activities to earn badges!'
            : '¡Completa cursos y actividades para ganar insignias!'}
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {badges.map((badge, index) => {
            const info = badgeInfo[badge.badge_type as keyof typeof badgeInfo];
            if (!info) return null;

            return (
              <motion.div
                key={badge.badge_type}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="relative group"
              >
                <div
                  className={`aspect-square rounded-xl bg-gradient-to-br ${info.color} flex items-center justify-center text-4xl shadow-lg hover:scale-110 transition-transform cursor-pointer`}
                >
                  {info.icon}
                </div>
                <div className="absolute inset-0 bg-black/80 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2">
                  <p className="text-white text-xs text-center font-semibold">
                    {info.name[locale]}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
