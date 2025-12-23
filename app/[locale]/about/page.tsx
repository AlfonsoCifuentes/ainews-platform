import { setRequestLocale } from 'next-intl/server';
import Image from 'next/image';

export const metadata = {
  title: 'About Us - ThotNet Core',
  description: 'Learn about ThotNet Core, our mission to democratize AI education, and the technology behind our autonomous learning platform.',
};

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const isEs = locale === 'es';

  return (
    <main className="container mx-auto px-4 py-12 max-w-4xl">
      {/* Hero Section */}
      <div className="text-center mb-16">
        <div className="flex justify-center mb-6">
          <Image 
            src="/logos/thotnet-core-white-only.svg" 
            alt="ThotNet Core Logo" 
            width={120}
            height={120}
            className="drop-shadow-[0_0_30px_rgba(59,130,246,0.5)]"
          />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
          {isEs ? 'Democratizando la Educación en IA' : 'Democratizing AI Education'}
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          {isEs 
            ? 'ThotNet Core es una plataforma de aprendizaje autónoma impulsada por IA, diseñada para curar noticias y generar cursos educativos de clase mundial.'
            : 'ThotNet Core is an autonomous AI-powered learning platform designed to curate news and generate world-class educational courses.'}
        </p>
      </div>

      {/* Mission Section */}
      <section className="mb-16 space-y-6">
        <h2 className="text-3xl font-bold mb-4 border-b border-white/10 pb-2">
          {isEs ? 'Nuestra Misión' : 'Our Mission'}
        </h2>
        <div className="prose prose-invert max-w-none text-muted-foreground">
          <p>
            {isEs
              ? 'En una era donde la Inteligencia Artificial avanza a un ritmo exponencial, mantenerse actualizado se ha convertido en un desafío casi imposible para los profesionales y estudiantes. La brecha de conocimiento se amplía cada día.'
              : 'In an era where Artificial Intelligence advances at an exponential pace, staying updated has become a nearly impossible challenge for professionals and students. The knowledge gap widens every day.'}
          </p>
          <p>
            {isEs
              ? 'Nuestra misión en ThotNet Core es cerrar esa brecha. No somos solo un agregador de noticias; somos un motor de síntesis de conocimiento. Utilizamos agentes de IA avanzados para leer, analizar y destilar miles de fuentes de información diariamente, convirtiendo el ruido en señales claras y accionables.'
              : 'Our mission at ThotNet Core is to bridge that gap. We are not just a news aggregator; we are a knowledge synthesis engine. We use advanced AI agents to read, analyze, and distill thousands of information sources daily, turning noise into clear, actionable signals.'}
          </p>
          <p>
            {isEs
              ? 'Creemos que la educación de alta calidad sobre IA debe ser accesible, gratuita y estar siempre actualizada. Por eso hemos construido una infraestructura que se mantiene a sí misma, aprendiendo y mejorando continuamente.'
              : 'We believe that high-quality AI education should be accessible, free, and always up-to-date. That is why we have built an infrastructure that sustains itself, learning and improving continuously.'}
          </p>
        </div>
      </section>

      {/* Technology Section */}
      <section className="mb-16 space-y-6">
        <h2 className="text-3xl font-bold mb-4 border-b border-white/10 pb-2">
          {isEs ? 'Nuestra Tecnología' : 'Our Technology'}
        </h2>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-card border rounded-xl p-6">
            <h3 className="text-xl font-semibold mb-3 text-primary">
              {isEs ? 'Agentes Autónomos' : 'Autonomous Agents'}
            </h3>
            <p className="text-muted-foreground text-sm">
              {isEs
                ? 'Nuestra flota de agentes de IA trabaja 24/7. El "News Curator" escanea más de 50 fuentes globales, filtra contenido de baja calidad y genera resúmenes técnicos. El "Course Generator" crea planes de estudio completos bajo demanda.'
                : 'Our fleet of AI agents works 24/7. The "News Curator" scans over 50 global sources, filters low-quality content, and generates technical summaries. The "Course Generator" creates comprehensive study plans on demand.'}
            </p>
          </div>
          <div className="bg-card border rounded-xl p-6">
            <h3 className="text-xl font-semibold mb-3 text-primary">
              {isEs ? 'Gráfico de Conocimiento' : 'Knowledge Graph'}
            </h3>
            <p className="text-muted-foreground text-sm">
              {isEs
                ? 'Todo el contenido está interconectado a través de nuestro Knowledge Graph vectorial. Esto nos permite identificar tendencias emergentes y conectar conceptos aparentemente no relacionados para ofrecer una experiencia de aprendizaje holística.'
                : 'All content is interconnected through our vector Knowledge Graph. This allows us to identify emerging trends and connect seemingly unrelated concepts to offer a holistic learning experience.'}
            </p>
          </div>
          <div className="bg-card border rounded-xl p-6">
            <h3 className="text-xl font-semibold mb-3 text-primary">
              {isEs ? 'Generación RAG' : 'RAG Generation'}
            </h3>
            <p className="text-muted-foreground text-sm">
              {isEs
                ? 'Utilizamos Retrieval-Augmented Generation (RAG) para asegurar que nuestros cursos no sean alucinaciones, sino que estén fundamentados en la documentación técnica más reciente y en noticias verificadas.'
                : 'We use Retrieval-Augmented Generation (RAG) to ensure our courses are not hallucinations, but are grounded in the latest technical documentation and verified news.'}
            </p>
          </div>
          <div className="bg-card border rounded-xl p-6">
            <h3 className="text-xl font-semibold mb-3 text-primary">
              {isEs ? 'Infraestructura Zero-Cost' : 'Zero-Cost Infrastructure'}
            </h3>
            <p className="text-muted-foreground text-sm">
              {isEs
                ? 'Operamos bajo una filosofía de eficiencia extrema. Utilizamos niveles gratuitos de proveedores de nube de primer nivel y optimizamos cada ciclo de cómputo para mantener la plataforma sostenible y gratuita para los usuarios.'
                : 'We operate under a philosophy of extreme efficiency. We utilize free tiers from top-tier cloud providers and optimize every compute cycle to keep the platform sustainable and free for users.'}
            </p>
          </div>
        </div>
      </section>

      {/* Editorial Standards */}
      <section className="mb-16 space-y-6">
        <h2 className="text-3xl font-bold mb-4 border-b border-white/10 pb-2">
          {isEs ? 'Estándares Editoriales' : 'Editorial Standards'}
        </h2>
        <div className="prose prose-invert max-w-none text-muted-foreground">
          <p>
            {isEs
              ? 'Aunque utilizamos IA para escalar nuestra producción, mantenemos estándares editoriales rigurosos. Priorizamos la precisión técnica sobre el sensacionalismo. Nuestro contenido está diseñado para ingenieros, investigadores y entusiastas serios.'
              : 'Although we use AI to scale our production, we maintain rigorous editorial standards. We prioritize technical accuracy over sensationalism. Our content is designed for engineers, researchers, and serious enthusiasts.'}
          </p>
          <ul className="list-disc pl-6 space-y-2 mt-4">
            <li>
              {isEs 
                ? 'Verificación de fuentes cruzadas para evitar desinformación.' 
                : 'Cross-source verification to avoid misinformation.'}
            </li>
            <li>
              {isEs 
                ? 'Transparencia total sobre el uso de IA en la generación de contenido.' 
                : 'Full transparency regarding the use of AI in content generation.'}
            </li>
            <li>
              {isEs 
                ? 'Enfoque en "Deep Dives" y explicaciones técnicas, no solo titulares.' 
                : 'Focus on "Deep Dives" and technical explanations, not just headlines.'}
            </li>
          </ul>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="bg-primary/5 border border-primary/20 rounded-2xl p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">
          {isEs ? '¿Tienes preguntas?' : 'Have Questions?'}
        </h2>
        <p className="text-muted-foreground mb-6">
          {isEs
            ? 'Estamos siempre buscando mejorar. Si tienes sugerencias o encuentras un error, contáctanos.'
            : 'We are always looking to improve. If you have suggestions or find a bug, contact us.'}
        </p>
        <a 
          href={`/${locale}/contact`} 
          className="inline-block bg-primary text-primary-foreground px-8 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
        >
          {isEs ? 'Contáctanos' : 'Contact Us'}
        </a>
      </section>
    </main>
  );
}
