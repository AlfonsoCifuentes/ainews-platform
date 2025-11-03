import { getServerAuthUser } from '@/lib/auth/auth-config';
import { redirect } from 'next/navigation';
import { SettingsPageClient } from '@/components/profile/SettingsPageClient';
import { getSupabaseServerClient } from '@/lib/db/supabase';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Settings | AINews',
  description: 'Manage your account settings and preferences',
};

export default async function SettingsPage({
  params,
}: {
  params: { locale: 'en' | 'es' };
}) {
  const user = await getServerAuthUser();
  if (!user) {
    redirect(`/${params.locale}/login`);
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
    },
  }[params.locale];

  return (
    <SettingsPageClient
      profile={profile}
      locale={params.locale}
      translations={translations}
    />
  );
}
