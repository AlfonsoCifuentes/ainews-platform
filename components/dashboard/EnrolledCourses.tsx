'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

interface EnrolledCoursesProps {
  enrollments: Array<{
    id: string;
    course_id: string;
    modules_completed: number;
    total_modules: number;
    average_quiz_score: number;
    last_accessed_at: string;
    completed_at: string | null;
    courses: {
      title_en: string;
      title_es: string;
      difficulty: string;
    };
  }>;
  locale: 'en' | 'es';
  translations: {
    title: string;
  };
}

export function EnrolledCourses({ enrollments, locale, translations }: EnrolledCoursesProps) {
  if (enrollments.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg">
        <h2 className="text-2xl font-bold mb-4">{translations.title}</h2>
        <p className="text-gray-600 dark:text-gray-400">
          {locale === 'en'
            ? 'No courses enrolled yet. Start learning today!'
            : '¡Aún no tienes cursos inscritos. Comienza a aprender hoy!'}
        </p>
        <Link
          href={`/${locale}/courses`}
          className="inline-block mt-4 px-6 py-3 bg-gradient-to-r from-primary to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg hover:scale-105 transition-all"
        >
          {locale === 'en' ? 'Browse Courses' : 'Explorar Cursos'}
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg">
      <h2 className="text-2xl font-bold mb-6">{translations.title}</h2>

      <div className="space-y-4">
        {enrollments.map((enrollment, index) => {
          const progress = (enrollment.modules_completed / enrollment.total_modules) * 100;
          const title = locale === 'en' ? enrollment.courses.title_en : enrollment.courses.title_es;

          return (
            <motion.div
              key={enrollment.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:shadow-md transition-shadow"
            >
              <Link href={`/${locale}/courses/${enrollment.course_id}`}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1 hover:text-primary transition-colors">
                      {title}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
                        {enrollment.courses.difficulty}
                      </span>
                      <span>
                        {enrollment.modules_completed}/{enrollment.total_modules}{' '}
                        {locale === 'en' ? 'modules' : 'módulos'}
                      </span>
                    </div>
                  </div>

                  {enrollment.completed_at && (
                    <div className="flex items-center gap-1 text-green-500">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-sm font-medium">
                        {locale === 'en' ? 'Completed' : 'Completado'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Progress Bar */}
                <div className="mt-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-gray-400">
                      {locale === 'en' ? 'Progress' : 'Progreso'}
                    </span>
                    <span className="font-semibold">{Math.round(progress)}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 1, delay: index * 0.1 }}
                      className="h-full bg-gradient-to-r from-primary to-purple-600"
                    />
                  </div>
                </div>

                {/* Quiz Score */}
                {enrollment.average_quiz_score > 0 && (
                  <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    {locale === 'en' ? 'Avg. Quiz Score' : 'Puntaje Promedio'}:{' '}
                    <span className="font-semibold text-primary">
                      {Math.round(enrollment.average_quiz_score * 100)}%
                    </span>
                  </div>
                )}
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
