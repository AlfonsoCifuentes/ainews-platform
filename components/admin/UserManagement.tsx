'use client';

export function UserManagement({ locale }: { locale: 'en' | 'es' }) {
  const t = locale === 'en' ? {
    title: 'User Management',
    comingSoon: 'User management features coming soon...',
  } : {
    title: 'Gestión de Usuarios',
    comingSoon: 'Características de gestión de usuarios próximamente...',
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">{t.title}</h2>
      <div className="p-12 text-center text-muted-foreground rounded-2xl bg-secondary">
        {t.comingSoon}
      </div>
    </div>
  );
}
