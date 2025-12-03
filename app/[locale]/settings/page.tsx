import { getServerAuthUser } from '@/lib/auth/auth-config';
import { redirect } from 'next/navigation';
import { SettingsPageClient } from '@/components/profile/SettingsPageClient';
import { getSupabaseServerClient } from '@/lib/db/supabase';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Settings | ThotNet Core',
  description: 'Manage your account settings and preferences',
};

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: 'en' | 'es' }>;
}) {
  const { locale } = await params;
  const user = await getServerAuthUser();
  if (!user) {
    redirect(`/${locale}/login`);
  }

  const db = getSupabaseServerClient();

  const { data: profile } = await db
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  const translations = {
    en: {
      title: 'Settings',
      subtitle: 'Manage your account and preferences',
      profile: 'Profile Settings',
      displayName: 'Display Name',
      bio: 'Bio',
      locale: 'Language',
      theme: 'Theme',
      themeLight: 'Light',
      themeDark: 'Dark',
      themeSystem: 'System',
      notifications: 'Notifications',
      emailNotifications: 'Email Notifications',
      weeklyDigest: 'Weekly Digest',
      achievementNotifications: 'Achievement Notifications',
      courseReminders: 'Course Reminders',
      privacy: 'Privacy',
      dangerZone: 'Danger Zone',
      deleteAccount: 'Delete Account',
      deleteWarning: 'This action cannot be undone',
      save: 'Save Changes',
      cancel: 'Cancel',
      saved: 'Settings saved successfully',
      visualPreferences: 'Visual Preferences',
      visualStyle: 'Illustration Style',
      visualDensity: 'Diagram Density',
      autoDiagramming: 'Auto diagram suggestions',
      autoDiagrammingHint: 'Let the AI suggest when diagrams should appear inside modules',
      stylePhotorealistic: 'Photorealistic',
      styleAnime: 'Anime / Cel',
      styleComic: 'Comic / Graphic',
      densityMinimal: 'Minimal',
      densityBalanced: 'Balanced',
      densityImmersive: 'Immersive',
    },
    es: {
      title: 'Configuración',
      subtitle: 'Administra tu cuenta y preferencias',
      profile: 'Configuración de Perfil',
      displayName: 'Nombre',
      bio: 'Biografía',
      locale: 'Idioma',
      theme: 'Tema',
      themeLight: 'Claro',
      themeDark: 'Oscuro',
      themeSystem: 'Sistema',
      notifications: 'Notificaciones',
      emailNotifications: 'Notificaciones por Email',
      weeklyDigest: 'Resumen Semanal',
      achievementNotifications: 'Notificaciones de Logros',
      courseReminders: 'Recordatorios de Cursos',
      privacy: 'Privacidad',
      dangerZone: 'Zona Peligrosa',
      deleteAccount: 'Eliminar Cuenta',
      deleteWarning: 'Esta acción no se puede deshacer',
      save: 'Guardar Cambios',
      cancel: 'Cancelar',
      saved: 'Configuración guardada exitosamente',
      visualPreferences: 'Preferencias Visuales',
      visualStyle: 'Estilo de ilustración',
      visualDensity: 'Densidad de diagramas',
      autoDiagramming: 'Sugerencias automáticas de diagramas',
      autoDiagrammingHint: 'Permite que la IA detecte dónde insertar diagramas en los módulos',
      stylePhotorealistic: 'Fotorrealista',
      styleAnime: 'Anime / Cel',
      styleComic: 'Cómic / Gráfico',
      densityMinimal: 'Minimalista',
      densityBalanced: 'Equilibrada',
      densityImmersive: 'Inmersiva',
    },
  }[locale];

  return (
    <SettingsPageClient
      profile={profile}
      locale={locale}
      translations={translations}
    />
  );
}
