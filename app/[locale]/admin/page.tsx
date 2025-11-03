import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { getSupabaseServerClient } from '@/lib/db/supabase';
import { isAdmin } from '@/lib/admin/admin';
import { AdminDashboard } from '@/components/admin/AdminDashboard';

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

  return <AdminDashboard locale={locale as 'en' | 'es'} />;
}
