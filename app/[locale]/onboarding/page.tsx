import { redirect } from 'next/navigation';
import { getServerAuthUser } from '@/lib/auth/auth-config';
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';
import { getSupabaseServerClient } from '@/lib/db/supabase';

export default async function OnboardingPage({
  params,
}: {
  params: Promise<{ locale: 'en' | 'es' }>;
}) {
  const { locale } = await params;
  const user = await getServerAuthUser();

  if (!user) {
    redirect(`/${locale}/auth`);
  }

  // Check if user has already completed onboarding
  const supabase = getSupabaseServerClient();
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('onboarding_completed')
    .eq('user_id', user.id)
    .single();

  if (profile?.onboarding_completed) {
    redirect(`/${locale}/news`);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <OnboardingFlow locale={locale} userId={user.id} />
    </div>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ locale: 'en' | 'es' }> }) {
  const { locale } = await params;
  return {
    title: locale === 'en' ? 'Welcome to AINews' : 'Bienvenido a AINews',
    description: locale === 'en' 
      ? 'Set up your personalized AI news experience' 
      : 'Configura tu experiencia personalizada de noticias de IA',
  };
}
