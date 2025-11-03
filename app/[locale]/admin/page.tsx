import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { getSupabaseServerClient } from '@/lib/db/supabase';
import { isAdmin } from '@/lib/admin/admin';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { AgentControls } from '@/components/admin/AgentControls';

export default async function AdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Check authentication and admin status
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth?redirect=/${locale}/admin`);
  }

  const hasAdminAccess = await isAdmin(user.id);

  if (!hasAdminAccess) {
    redirect(`/${locale}`);
  }

  return (
    <div className="space-y-8">
      {/* AI Agent Control Center - Phase 5+ */}
      <section className="rounded-3xl border border-border bg-gradient-to-br from-background via-primary/5 to-background p-8">
        <h2 className="mb-2 text-3xl font-black">
          {locale === 'en' ? 'AI Agent Control Center' : 'Centro de Control de Agentes IA'}
        </h2>
        <p className="mb-8 text-muted-foreground">
          {locale === 'en' 
            ? 'Monitor and control all autonomous AI agents in real-time' 
            : 'Monitorea y controla todos los agentes IA autónomos en tiempo real'}
        </p>
        <AgentControls locale={locale as 'en' | 'es'} />
      </section>

      {/* Original Admin Dashboard */}
      <AdminDashboard locale={locale as 'en' | 'es'} />
    </div>
  );
}
