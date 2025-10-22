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

interface DashboardPageProps {
  params: {
    locale: Locale;
  };
}

export async function generateMetadata({ params }: DashboardPageProps) {
  const { locale } = params;

  return {
    title: `${locale === 'en' ? 'Dashboard' : 'Panel'} | AINews`,
    description:
      locale === 'en'
        ? 'Track your learning progress, manage courses, and view achievements.'
        : 'Rastrea tu progreso de aprendizaje, gestiona cursos y ve tus logros.',
  };
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { locale } = params;
  setRequestLocale(locale);
  
  const user = await getServerAuthUser();

  if (!user) {
    redirect(`/${locale}/auth/signin`);
  }

  const db = getSupabaseServerClient();

  // Fetch user profile with stats
  const { data: profile } = await db
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // Fetch enrolled courses
  const { data: enrollments } = await db
    .from('user_course_enrollments')
    .select('*, courses(*)')
    .eq('user_id', user.id)
    .order('last_accessed_at', { ascending: false });

  // Fetch badges
  const { data: badges } = await db
    .from('user_badges')
    .select('*')
    .eq('user_id', user.id)
    .order('earned_at', { ascending: false });

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
    },
  }[locale];

  return (
    <DashboardPageClient
      userName={user.name || user.email || 'User'}
      welcomeText={t.welcome}
      overviewText={t.overview}
    >
      {/* Stats Grid */}
      <UserStats
        profile={profile}
        enrollments={enrollments || []}
        locale={locale}
        translations={t}
      />

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
