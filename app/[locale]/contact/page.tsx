import { setRequestLocale } from 'next-intl/server';
import { Mail, MessageSquare, Rss } from 'lucide-react';
import { SITE_NAME } from '@/lib/config/site';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return {
    title: `Contact · ${SITE_NAME}`,
    description:
      locale === 'es'
        ? `Escríbenos: sugerencias, erratas o una noticia de IA que deberíamos cubrir.`
        : `Get in touch: feedback, corrections, or an AI story we should cover.`,
  };
}

// NOTE: placeholder contact address — change to the real inbox when chosen.
const CONTACT_EMAIL = 'hello@pulse.ai';

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const isEs = locale === 'es';

  const channels = [
    {
      icon: Mail,
      title: isEs ? 'Escríbenos' : 'Email us',
      body: isEs ? 'Para cualquier consulta o sugerencia:' : 'For any question or suggestion:',
      action: CONTACT_EMAIL,
      href: `mailto:${CONTACT_EMAIL}`,
    },
    {
      icon: Rss,
      title: isEs ? 'Una pista' : 'A tip',
      body: isEs
        ? '¿Una noticia de IA que se está extendiendo y no hemos cubierto? Cuéntanosla.'
        : "An AI story spreading that we haven't covered? Send it our way.",
    },
    {
      icon: MessageSquare,
      title: isEs ? 'Erratas' : 'Corrections',
      body: isEs
        ? 'Si ves un dato erróneo, avísanos y lo corregimos rápido.'
        : 'Spot a factual error? Let us know and we fix it fast.',
    },
  ];

  return (
    <main className="relative min-h-screen bg-[#04050a] px-5 pb-28 pt-32 text-white md:px-12 md:pt-40">
      <div className="mx-auto max-w-4xl">
        <p className="mb-5 font-mono text-xs uppercase tracking-[0.3em] text-signal">
          {isEs ? 'Contacto' : 'Contact'}
        </p>
        <h1 className="text-4xl font-black tracking-tight md:text-6xl">
          {isEs ? 'Hablemos' : "Let's talk"}
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/60">
          {isEs
            ? 'Valoramos tu opinión. Sugerencias, erratas o una noticia que deberíamos contar — todo suma.'
            : 'We value your input. Feedback, corrections, or a story we should tell — it all helps.'}
        </p>

        <div className="mt-14 grid gap-px border border-white/10 bg-white/10 md:grid-cols-3">
          {channels.map(({ icon: Icon, title, body, action, href }) => (
            <div key={title} className="flex flex-col bg-[#04050a] p-7">
              <Icon className="mb-4 h-5 w-5 text-signal" aria-hidden />
              <h2 className="mb-2 text-lg font-semibold">{title}</h2>
              <p className="text-sm leading-relaxed text-white/55">{body}</p>
              {action && href && (
                <a
                  href={href}
                  className="mt-4 font-mono text-xs uppercase tracking-[0.12em] text-signal-soft hover:text-white"
                >
                  {action}
                </a>
              )}
            </div>
          ))}
        </div>

        <div className="mt-12">
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="inline-block bg-white px-8 py-3 font-mono text-xs uppercase tracking-[0.2em] text-black transition-colors hover:bg-signal hover:text-white"
          >
            {isEs ? 'Enviar un email' : 'Send an email'}
          </a>
        </div>
      </div>
    </main>
  );
}
