import { setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { AI_NEWS_SOURCES } from '@/lib/ai/news-sources';
import { SITE_NAME, siteTagline } from '@/lib/config/site';

export const metadata = {
  title: `About · ${SITE_NAME}`,
  description: `How ${SITE_NAME} finds the most important AI stories by cross-checking dozens of sources and explains them in plain language.`,
};

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const isEs = locale === 'es';

  const pillars = isEs
    ? [
        {
          k: 'Corroboración multi-fuente',
          v: `Vigilamos ${AI_NEWS_SOURCES.length}+ fuentes —blogs de empresas, papers, prensa, newsletters, podcasts y YouTube—. Cuando una misma noticia aparece en varios medios independientes, sube en importancia. Si algo se está extendiendo por internet, aquí lo verás primero.`,
        },
        {
          k: 'Sin plagio, con criterio',
          v: 'No copiamos. Tomamos varias versiones de una noticia y escribimos la nuestra desde cero, fiel a los hechos, cifras y citas originales.',
        },
        {
          k: 'Como te lo contaría un amigo',
          v: 'Lenguaje claro y cercano, con un punto de buen profesor: explicamos los conceptos enrevesados y las siglas para que entiendas todo sin tropezar.',
        },
        {
          k: 'Imagen original',
          v: 'Cada noticia lleva la imagen que la acompaña en su fuente original, no ilustraciones genéricas.',
        },
      ]
    : [
        {
          k: 'Multi-source corroboration',
          v: `We watch ${AI_NEWS_SOURCES.length}+ sources — company blogs, papers, press, newsletters, podcasts and YouTube. When the same story shows up across several independent outlets, it rises in importance. If it's spreading across the internet, you'll see it here first.`,
        },
        {
          k: 'No plagiarism, real judgement',
          v: "We don't copy. We take several versions of a story and write our own from scratch — faithful to the original facts, figures and quotes.",
        },
        {
          k: 'Like a friend would explain it',
          v: 'Clear, warm language with a good-teacher streak: we unpack tangled concepts and spell out acronyms so nothing trips you up.',
        },
        {
          k: 'Original imagery',
          v: 'Every story carries the image that accompanies it at the original source — not generic stock art.',
        },
      ];

  return (
    <main className="relative min-h-screen bg-[#04050a] px-5 pb-28 pt-32 text-white md:px-12 md:pt-40">
      <div className="mx-auto max-w-4xl">
        <p className="mb-5 font-mono text-xs uppercase tracking-[0.3em] text-signal">
          {isEs ? 'Sobre nosotros' : 'About'}
        </p>
        <h1 className="text-4xl font-black leading-[1.05] tracking-tight md:text-6xl">
          {siteTagline(locale)}
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/60">
          {isEs
            ? `${SITE_NAME} no es un agregador más. Es un filtro de señal: leemos el ruido de la IA por ti, detectamos qué noticias importan de verdad y te las contamos para que las entiendas.`
            : `${SITE_NAME} isn't just another aggregator. It's a signal filter: we read the noise of AI for you, detect which stories genuinely matter, and tell them in a way you'll actually understand.`}
        </p>

        <section className="mt-16 grid gap-px border border-white/10 bg-white/10 md:grid-cols-2">
          {pillars.map((p) => (
            <div key={p.k} className="bg-[#04050a] p-7">
              <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-signal-soft">{p.k}</h2>
              <p className="text-sm leading-relaxed text-white/65">{p.v}</p>
            </div>
          ))}
        </section>

        <section className="mt-16 border-l-2 border-signal bg-signal/[0.06] p-8">
          <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.25em] text-signal-soft">
            {isEs ? 'Transparencia' : 'Transparency'}
          </h2>
          <p className="text-base leading-relaxed text-white/75">
            {isEs
              ? 'Usamos modelos de IA —los más eficientes que dan la calidad necesaria— para resumir y redactar. Mantenemos los hechos fieles a la fuente y enlazamos siempre al artículo original para que puedas comprobarlo.'
              : 'We use AI models — the most efficient ones that still deliver the quality we need — to summarize and write. We keep facts faithful to the source and always link back to the original article so you can verify it yourself.'}
          </p>
        </section>

        <div className="mt-16 flex flex-wrap gap-4">
          <Link
            href={`/${locale}/news`}
            className="bg-white px-8 py-3 font-mono text-xs uppercase tracking-[0.2em] text-black transition-colors hover:bg-signal hover:text-white"
          >
            {isEs ? 'Leer las noticias' : 'Read the news'}
          </Link>
          <Link
            href={`/${locale}/contact`}
            className="border border-white/20 px-8 py-3 font-mono text-xs uppercase tracking-[0.2em] text-white transition-colors hover:border-white"
          >
            {isEs ? 'Contacto' : 'Contact'}
          </Link>
        </div>
      </div>
    </main>
  );
}
