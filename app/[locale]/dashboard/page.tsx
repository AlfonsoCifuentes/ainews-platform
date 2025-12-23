import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { getServerAuthUser } from '@/lib/auth/auth-config';
import { getSupabaseServerClient } from '@/lib/db/supabase';
import type { Locale } from '@/i18n';
import { UserStats } from '@/components/dashboard/UserStats';
import { EnrolledCourses } from '@/components/dashboard/EnrolledCourses';
import { BadgesCollection } from '@/components/dashboard/BadgesCollection';
import { SavedArticles } from '@/components/dashboard/SavedArticles';
import { DashboardPageClient } from '@/components/dashboard/DashboardPageClient';
import { XPProgress } from '@/components/dashboard/XPProgress';
import { AchievementsGrid } from '@/components/dashboard/AchievementsGrid';

interface DashboardPageProps {
  params: Promise<{
    locale: Locale;
  }>;
}

export async function generateMetadata({ params }: DashboardPageProps) {
  const { locale } = await params;

  return {
    title: `${locale === 'en' ? 'Dashboard' : 'Panel'} | ThotNet Core`,
    description:
      locale === 'en'
        ? 'Track your learning progress, manage courses, and view achievements.'
        : 'Rastrea tu progreso de aprendizaje, gestiona cursos y ve tus logros.',
  };
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  
  const user = await getServerAuthUser();

  if (!user) {
    redirect(`/${locale}/auth?mode=signin`);
  }

  const db = getSupabaseServerClient();

  // Fetch user profile with stats
  const { data: profile } = await db
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // Fetch enrolled courses
  const { data: rawEnrollments } = await db
    .from('user_courses')
    .select(`
      id,
      course_id,
      enrolled_at,
      completed_at,
      last_accessed_at,
      progress_percentage,
      courses (
        id,
        title_en,
        title_es,
        difficulty,
        course_modules (id)
      )
    `)
    .eq('user_id', user.id)
    .eq('relationship_type', 'enrolled')
    .order('last_accessed_at', { ascending: false });

  const courseIds = (rawEnrollments ?? [])
    .map((row) => row.course_id)
    .filter((courseId): courseId is string => typeof courseId === 'string' && courseId.length > 0);

  const { data: progressRows } = courseIds.length
    ? await db
        .from('user_progress')
        .select('course_id, completed, score')
        .eq('user_id', user.id)
        .in('course_id', courseIds)
    : { data: [] };

  const progressByCourse = new Map<string, { completed: number; scoreTotal: number; scoreCount: number }>();

  for (const row of progressRows ?? []) {
    const courseId = row.course_id as string | null;
    if (!courseId) continue;
    const entry = progressByCourse.get(courseId) ?? { completed: 0, scoreTotal: 0, scoreCount: 0 };
    if (row.completed) {
      entry.completed += 1;
    }
    const scoreValue = typeof row.score === 'number' ? row.score : null;
    if (scoreValue !== null) {
      entry.scoreTotal += scoreValue;
      entry.scoreCount += 1;
    }
    progressByCourse.set(courseId, entry);
  }

  const enrollments = (rawEnrollments ?? []).map((row) => {
    const courseId = row.course_id as string;
    const courseModules = Array.isArray((row.courses as { course_modules?: unknown })?.course_modules)
      ? (row.courses as { course_modules?: Array<{ id: string }> }).course_modules ?? []
      : [];
    const totalModules = courseModules.length;
    const progress = progressByCourse.get(courseId) ?? { completed: 0, scoreTotal: 0, scoreCount: 0 };
    const averageQuizScore = progress.scoreCount > 0 ? (progress.scoreTotal / progress.scoreCount) / 100 : 0;

    return {
      id: row.id,
      course_id: courseId,
      modules_completed: progress.completed,
      total_modules: totalModules,
      average_quiz_score: averageQuizScore,
      last_accessed_at: row.last_accessed_at ?? row.enrolled_at ?? new Date().toISOString(),
      completed_at: row.completed_at ?? null,
      courses: {
        title_en: (row.courses as { title_en?: string } | null)?.title_en ?? 'Course',
        title_es: (row.courses as { title_es?: string } | null)?.title_es ?? 'Curso',
        difficulty: (row.courses as { difficulty?: string } | null)?.difficulty ?? 'beginner',
      },
    };
  });

  // Fetch badges
  const { data: badges } = await db
    .from('user_badges')
    .select('*')
    .eq('user_id', user.id)
    .order('earned_at', { ascending: false });

  // Fetch user achievements
  const { data: achievements } = await db
    .from('user_achievements')
    .select('*')
    .eq('user_id', user.id);

  // Fetch saved articles
  const { data: savedArticles } = await db
    .from('user_saved_articles')
    .select('*, news_articles(*)')
    .eq('user_id', user.id)
    .order('saved_at', { ascending: false })
    .limit(10);

  const t = {
    en: {
      welcome: 'Welcome back',
      dashboard: 'Dashboard',
      overview: 'Overview',
      courses: 'My Courses',
      badges: 'Badges',
      saved: 'Saved Articles',
      streak: 'Day Streak',
      level: 'Level',
      xp: 'Total XP',
      coursesCompleted: 'Courses Completed',
      achievements: 'Achievements',
      progress: 'Your Progress',
    },
    es: {
      welcome: 'Bienvenido de nuevo',
      dashboard: 'Panel',
      overview: 'Resumen',
      courses: 'Mis Cursos',
      badges: 'Insignias',
      saved: 'Artículos Guardados',
      streak: 'Racha de Días',
      level: 'Nivel',
      xp: 'XP Total',
      coursesCompleted: 'Cursos Completados',
      achievements: 'Logros',
      progress: 'Tu Progreso',
    },
  }[locale];

  return (
    <DashboardPageClient
      userName={user.name || user.email || 'User'}
      welcomeText={t.welcome}
      overviewText={t.overview}
    >
      {/* XP Progress Bar */}
      {profile && (
        <div className="mb-8">
          <XPProgress
            totalXP={profile.total_xp || 0}
            locale={locale}
          />
        </div>
      )}

      {/* Stats Grid */}
      <UserStats
        profile={profile}
        enrollments={enrollments || []}
        locale={locale}
        translations={t}
      />

      {/* Achievements Section */}
      <div className="mt-8">
        <h2 className="mb-4 text-2xl font-bold">{t.achievements}</h2>
        <AchievementsGrid
          achievements={achievements || []}
          locale={locale}
        />
      </div>

      {/* Content Grid */}
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Enrolled Courses */}
        <div className="lg:col-span-2">
          <EnrolledCourses
            enrollments={enrollments || []}
            locale={locale}
            translations={{ title: t.courses }}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          {/* Badges */}
          <BadgesCollection
            badges={badges || []}
            locale={locale}
            translations={{ title: t.badges }}
          />

          {/* Saved Articles */}
          <SavedArticles
            articles={savedArticles || []}
            locale={locale}
            translations={{ title: t.saved }}
          />
        </div>
      </div>
    </DashboardPageClient>
  );
}
