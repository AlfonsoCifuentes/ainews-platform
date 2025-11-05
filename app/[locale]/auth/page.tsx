import { Metadata } from 'next';
import AuthPageClient from './AuthPageClient';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ mode?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  
  return {
    title: locale === 'es' ? 'Autenticación | AINews' : 'Authentication | AINews',
    description: locale === 'es' 
      ? 'Inicia sesión o regístrate en AINews'
      : 'Sign in or sign up to AINews',
  };
}

export default async function AuthPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { mode } = await searchParams;
  
  return <AuthPageClient locale={locale as 'en' | 'es'} initialMode={mode as 'signin' | 'signup' | undefined} />;
}
