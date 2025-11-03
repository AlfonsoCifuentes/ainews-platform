import { setRequestLocale } from 'next-intl/server';
import { getServerAuthUser } from '@/lib/auth/auth-config';
import type { Locale } from '@/i18n';
import { LeaderboardPageClient } from '@/components/leaderboard/LeaderboardPageClient';

interface LeaderboardPageProps {
  params: Promise<{
    locale: Locale;
  }>;
}

export async function generateMetadata({ params }: LeaderboardPageProps) {
  const { locale } = await params;

  return {
    title: `${locale === 'en' ? 'Leaderboard' : 'Clasificación'} | AINews`,
    description:
      locale === 'en'
        ? 'See the top learners and compete for the highest XP.'
        : 'Ve a los mejores estudiantes y compite por el XP más alto.',
  };
}

export default async function LeaderboardPage({ params }: LeaderboardPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Optional: require authentication
  const user = await getServerAuthUser();

  const t = {
    en: {
      title: 'Leaderboard',
      subtitle: 'Compete with the best learners',
      all: 'All Time',
      week: 'This Week',
      month: 'This Month',
      signInPrompt: 'Sign in to see your rank and compete!',
      signIn: 'Sign In',
    },
    es: {
      title: 'Clasificación',
      subtitle: 'Compite con los mejores estudiantes',
      all: 'Todo el Tiempo',
      week: 'Esta Semana',
      month: 'Este Mes',
      signInPrompt: '¡Inicia sesión para ver tu rango y competir!',
      signIn: 'Iniciar Sesión',
    },
  }[locale];

  return (
    <LeaderboardPageClient
      isAuthenticated={!!user}
      locale={locale}
      translations={t}
    />
  );
}
