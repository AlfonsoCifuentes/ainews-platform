import { redirect } from 'next/navigation';

export default async function UnsubscribePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: 'en' | 'es' }>;
  searchParams: Promise<{ email?: string; token?: string }>;
}) {
  const { locale } = await params;
  const { email } = await searchParams;

  // If no email provided, redirect to settings
  if (!email) {
    redirect(`/${locale}/settings#notifications`);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6 p-8 rounded-2xl bg-card border">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <svg
            className="w-8 h-8 text-primary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>

        <div>
          <h1 className="text-3xl font-bold mb-2">
            {locale === 'en' 
              ? 'Unsubscribe from Emails' 
              : 'Cancelar Suscripción de Emails'}
          </h1>
          <p className="text-muted-foreground">
            {locale === 'en'
              ? `You are unsubscribing: ${email}`
              : `Vas a cancelar la suscripción de: ${email}`}
          </p>
        </div>

        <form action={`/${locale}/api/unsubscribe`} method="POST" className="space-y-4">
          <input type="hidden" name="email" value={email} />
          
          <p className="text-sm text-muted-foreground">
            {locale === 'en'
              ? 'You will no longer receive weekly digest emails from AINews.'
              : 'Ya no recibirás emails de resumen semanal de AINews.'}
          </p>

          <button
            type="submit"
            className="w-full px-6 py-3 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-xl font-semibold transition-colors"
          >
            {locale === 'en' ? 'Confirm Unsubscribe' : 'Confirmar Cancelación'}
          </button>

          <a
            href={`/${locale}/settings#notifications`}
            className="block text-sm text-primary hover:underline"
          >
            {locale === 'en' 
              ? 'Go to notification settings instead' 
              : 'Ir a configuración de notificaciones'}
          </a>
        </form>

        <p className="text-xs text-muted-foreground">
          {locale === 'en'
            ? 'You can always re-enable email notifications from your account settings.'
            : 'Siempre puedes reactivar las notificaciones por email desde la configuración de tu cuenta.'}
        </p>
      </div>
    </div>
  );
}

export function generateMetadata({ params }: { params: { locale: 'en' | 'es' } }) {
  return {
    title: params.locale === 'en' ? 'Unsubscribe - AINews' : 'Cancelar Suscripción - AINews',
    description: params.locale === 'en' 
      ? 'Unsubscribe from AINews email notifications' 
      : 'Cancelar suscripción de notificaciones por email de AINews',
  };
}
