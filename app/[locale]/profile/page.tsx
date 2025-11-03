import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { getServerAuthUser } from '@/lib/auth/auth-config';
import { getSupabaseServerClient } from '@/lib/db/supabase';
import type { Locale } from '@/i18n';
import { ProfilePageClient } from '@/components/profile/ProfilePageClient';

interface ProfilePageProps {
  params: Promise<{
    locale: Locale;
  }>;
}

export async function generateMetadata({ params }: ProfilePageProps) {
  const { locale } = await params;

  return {
    title: `${locale === 'en' ? 'Profile' : 'Perfil'} | AINews`,
    description:
      locale === 'en'
        ? 'Manage your profile, achievements, and preferences.'
        : 'Gestiona tu perfil, logros y preferencias.',
  };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  
  const user = await getServerAuthUser();

  if (!user) {
    redirect(`/${locale}/auth/signin`);
  }

  const db = getSupabaseServerClient();

  // Fetch user profile
  const { data: profile } = await db
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // Fetch achievements
  const { data: achievements } = await db
    .from('user_achievements')
    .select('*')
    .eq('user_id', user.id);

  // Fetch badges
  const { data: badges } = await db
    .from('user_badges')
    .select('*')
    .eq('user_id', user.id)
    .order('earned_at', { ascending: false });

  // Fetch XP log (recent activities)
  const { data: recentXP } = await db
    .from('user_xp_log')
    .select('*')
    .eq('user_id', user.id)
    .order('earned_at', { ascending: false })
    .limit(20);

  // Fetch course stats
  const { data: courseStats } = await db
    .from('user_courses')
    .select('*')
    .eq('user_id', user.id);

  const enrolledCount = courseStats?.filter(c => c.enrollment_type === 'enrolled').length || 0;
  const createdCount = courseStats?.filter(c => c.enrollment_type === 'created').length || 0;
  const completedCount = courseStats?.filter(c => c.completed_at !== null).length || 0;

  const t = {
    en: {
      profile: 'Profile',
      editProfile: 'Edit Profile',
      achievements: 'Achievements',
      badges: 'Badges',
      recentActivity: 'Recent Activity',
      stats: 'Statistics',
      level: 'Level',
      totalXP: 'Total XP',
      streak: 'Day Streak',
      coursesEnrolled: 'Courses Enrolled',
      coursesCreated: 'Courses Created',
      coursesCompleted: 'Courses Completed',
      displayName: 'Display Name',
      bio: 'Bio',
      preferredLocale: 'Preferred Language',
      theme: 'Theme',
      save: 'Save Changes',
      cancel: 'Cancel',
      lightTheme: 'Light',
      darkTheme: 'Dark',
      systemTheme: 'System',
      englishLocale: 'English',
      spanishLocale: 'Español',
    },
    es: {
      profile: 'Perfil',
      editProfile: 'Editar Perfil',
      achievements: 'Logros',
      badges: 'Insignias',
      recentActivity: 'Actividad Reciente',
      stats: 'Estadísticas',
      level: 'Nivel',
      totalXP: 'XP Total',
      streak: 'Racha de Días',
      coursesEnrolled: 'Cursos Inscritos',
      coursesCreated: 'Cursos Creados',
      coursesCompleted: 'Cursos Completados',
      displayName: 'Nombre de Usuario',
      bio: 'Biografía',
      preferredLocale: 'Idioma Preferido',
      theme: 'Tema',
      save: 'Guardar Cambios',
      cancel: 'Cancelar',
      lightTheme: 'Claro',
      darkTheme: 'Oscuro',
      systemTheme: 'Sistema',
      englishLocale: 'English',
      spanishLocale: 'Español',
    },
  }[locale];

  return (
    <ProfilePageClient
      profile={profile}
      achievements={achievements || []}
      badges={badges || []}
      recentXP={recentXP || []}
      stats={{
        enrolledCount,
        createdCount,
        completedCount,
      }}
      locale={locale}
      translations={t}
    />
  );
}
