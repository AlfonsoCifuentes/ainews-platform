"use client";

import { useTranslations, useLocale } from 'next-intl';
import {
  KineticHero,
  ThotNetOrb,
  TodayDigestRail,
  OrbitingTopicsRail,
  CourseGalaxyNavigator,
  AIPlaygroundStrip,
  LeaderboardStrip,
  DeepDiveFeatures,
  FooterCTA,
} from '@/components/home';

export default function HomePage() {
  const t = useTranslations('home');
  const locale = useLocale() as 'en' | 'es';

  // Mock data - in production, these would come from API/database
  const heroStats = {
    sources: 50,
    freshnessMinutes: 15,
    courses: 12,
  };

  const orbMetrics = {
    sources: 50,
    articles: 2847,
    bilingual: true,
  };

  const orbitTopics = [
    'GPT-5', 'Claude 4', 'Gemini 3', 'Open Source',
    'Agents', 'RAG', 'Fine-tuning', 'Computer Vision',
    'NLP', 'Robotics'
  ];

  const digestArticles = [
    { id: '1', category: 'LLMs', title: 'OpenAI announces GPT-5 with unprecedented reasoning', relativeTime: '2h ago', href: '/news/gpt5-announcement', image: '/images/fallback/llm-neural-network.svg' },
    { id: '2', category: 'Research', title: 'New breakthrough in efficient transformer architectures', relativeTime: '4h ago', href: '/news/transformer-breakthrough', image: '/images/fallback/research-paper.svg' },
    { id: '3', category: 'Agents', title: 'Autonomous AI agents now capable of complex reasoning', relativeTime: '6h ago', href: '/news/autonomous-agents', image: '/images/fallback/ai-agent.svg' },
    { id: '4', category: 'Industry', title: 'Tech giants race to deploy AI infrastructure globally', relativeTime: '8h ago', href: '/news/ai-infrastructure', image: '/images/fallback/tech-infrastructure.svg' },
    { id: '5', category: 'Ethics', title: 'New framework proposed for responsible AI deployment', relativeTime: '12h ago', href: '/news/ai-ethics-framework', image: '/images/fallback/ai-ethics.svg' },
    { id: '6', category: 'Open Source', title: 'Community releases powerful open-weight model', relativeTime: '1d ago', href: '/news/open-source-model', image: '/images/fallback/open-source.svg' },
  ];

  const trendingTopics = [
    { slug: 'gpt-5', label: 'GPT-5', deltaArticles: 12 },
    { slug: 'claude-opus', label: 'Claude Opus 4', deltaArticles: 8 },
    { slug: 'ai-agents', label: 'AI Agents', deltaArticles: 6 },
    { slug: 'multimodal', label: 'Multimodal AI', deltaArticles: 5 },
    { slug: 'open-source', label: 'Open Source', deltaArticles: 4 },
    { slug: 'rag', label: 'RAG', deltaArticles: 3 },
    { slug: 'fine-tuning', label: 'Fine-tuning', deltaArticles: 2 },
    { slug: 'computer-vision', label: 'Computer Vision', deltaArticles: 2 },
  ];

  const courses = [
    { id: 'llm-fundamentals', title: 'LLM Fundamentals', level: 'beginner' as const, duration: '4h', progress: 75, description: 'Master the basics of Large Language Models', moduleCount: 8 },
    { id: 'prompt-engineering', title: 'Prompt Engineering Mastery', level: 'intermediate' as const, duration: '6h', progress: 30, description: 'Learn advanced prompting techniques', moduleCount: 12 },
    { id: 'ai-agents', title: 'Building AI Agents', level: 'advanced' as const, duration: '8h', description: 'Create autonomous AI agents from scratch', moduleCount: 15 },
    { id: 'rag-systems', title: 'RAG Systems Deep Dive', level: 'intermediate' as const, duration: '5h', description: 'Implement Retrieval Augmented Generation', moduleCount: 10 },
    { id: 'fine-tuning', title: 'Fine-tuning LLMs', level: 'advanced' as const, duration: '6h', description: 'Customize models for your use case', moduleCount: 11 },
  ];

  const agents = [
    { id: 'curator', name: 'News Curator', cadence: 'Every 6 hours', stack: ['LLM', 'RSS', 'Embeddings'], status: 'active' as const, metrics: { processed: 12847, accuracy: 94, lastRun: '2h ago' } },
    { id: 'translator', name: 'Bilingual Translator', cadence: 'On-demand', stack: ['GPT-5', 'DeepL'], status: 'active' as const, metrics: { processed: 5621, accuracy: 98 } },
    { id: 'learner', name: 'Learning Agent', cadence: 'Daily', stack: ['Feedback', 'RL'], status: 'learning' as const, metrics: { processed: 847, lastRun: '4h ago' } },
    { id: 'course-gen', name: 'Course Generator', cadence: 'On-demand', stack: ['RAG', 'LLM', 'Vision'], status: 'idle' as const, metrics: { processed: 156, accuracy: 91 } },
    { id: 'trend-detector', name: 'Trend Detector', cadence: 'Hourly', stack: ['Clustering', 'NLP'], status: 'active' as const, metrics: { processed: 3412, lastRun: '45m ago' } },
    { id: 'fact-checker', name: 'Fact Checker', cadence: 'Per article', stack: ['Search', 'LLM'], status: 'active' as const, metrics: { processed: 2156, accuracy: 89 } },
  ];

  const leaders = [
    { id: '1', name: 'TechExplorer', xp: 12450, weeklyDelta: 850, rank: 1 },
    { id: '2', name: 'AIEnthusiast', xp: 11200, weeklyDelta: 720, rank: 2 },
    { id: '3', name: 'DataScientist99', xp: 10800, weeklyDelta: 680, rank: 3 },
    { id: '4', name: 'MLNinja', xp: 9500, weeklyDelta: 520, rank: 4 },
    { id: '5', name: 'NeuralNetFan', xp: 8900, weeklyDelta: 450, rank: 5 },
  ];

  const featureBlocks = [
    {
      id: 'curated-news',
      title: locale === 'en' ? 'AI-Curated News' : 'Noticias Curadas por IA',
      copy: locale === 'en'
        ? 'Our autonomous AI agents monitor 50+ sources 24/7, filtering signal from noise to bring you only the most relevant and impactful AI news.'
        : 'Nuestros agentes IA autónomos monitorean 50+ fuentes 24/7, filtrando señal del ruido para traerte solo las noticias más relevantes e impactantes.',
      mediaType: 'lottie' as const,
      mediaSrc: '/animations/news-curation.json',
      icon: '📰',
    },
    {
      id: 'personalized-learning',
      title: locale === 'en' ? 'Personalized Learning' : 'Aprendizaje Personalizado',
      copy: locale === 'en'
        ? 'Generate custom courses on any AI topic in seconds. Our RAG-powered system creates comprehensive, textbook-quality content tailored to your level.'
        : 'Genera cursos personalizados sobre cualquier tema de IA en segundos. Nuestro sistema RAG crea contenido comprehensivo de calidad universitaria adaptado a tu nivel.',
      mediaType: 'lottie' as const,
      mediaSrc: '/animations/learning-path.json',
      icon: '🎓',
    },
    {
      id: 'knowledge-graph',
      title: locale === 'en' ? 'Interactive Knowledge Graph' : 'Grafo de Conocimiento Interactivo',
      copy: locale === 'en'
        ? 'Explore the interconnected world of AI through our visual knowledge graph. Discover relationships between concepts, companies, and technologies.'
        : 'Explora el mundo interconectado de la IA a través de nuestro grafo visual. Descubre relaciones entre conceptos, empresas y tecnologías.',
      mediaType: 'lottie' as const,
      mediaSrc: '/animations/knowledge-graph.json',
      icon: '🕸️',
    },
  ];

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020309]">
      {/* Subtle animated background grid */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.02]">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* Hero Section with Orb */}
      <div className="relative">
        <KineticHero
          locale={locale}
          headline={t('hero.title')}
          subheadline={t('hero.subtitle')}
          stats={heroStats}
          primaryCta={{ label: t('hero.cta'), href: '/news' }}
          secondaryCta={{ label: t('hero.ctaSecondary'), href: '/courses' }}
        />

        {/* Orb positioned absolutely on desktop */}
        <div className="hidden xl:block absolute right-[5%] top-1/2 -translate-y-1/2 z-10">
          <ThotNetOrb
            metrics={orbMetrics}
            orbitTopics={orbitTopics}
            interactive={true}
          />
        </div>

        {/* Orb below hero on mobile/tablet */}
        <div className="xl:hidden flex justify-center pb-16">
          <ThotNetOrb
            metrics={orbMetrics}
            orbitTopics={orbitTopics}
            interactive={false}
          />
        </div>
      </div>

      {/* Today's Digest */}
      <TodayDigestRail articles={digestArticles} locale={locale} />

      {/* Trending Topics */}
      <OrbitingTopicsRail topics={trendingTopics} locale={locale} />

      {/* Course Galaxy */}
      <CourseGalaxyNavigator
        courses={courses}
        featuredCourseId="llm-fundamentals"
        locale={locale}
      />

      {/* AI Playground */}
      <AIPlaygroundStrip agents={agents} locale={locale} />

      {/* Leaderboard */}
      <LeaderboardStrip
        leaders={leaders}
        summary={{ totalUsers: 2847, weeklyXpAwarded: 45600 }}
        locale={locale}
      />

      {/* Deep Dive Features */}
      <DeepDiveFeatures blocks={featureBlocks} locale={locale} />

      {/* Footer CTA */}
      <FooterCTA
        title={locale === 'en' ? 'Ready to master AI?' : '¿Listo para dominar la IA?'}
        subtitle={locale === 'en'
          ? 'Join thousands of learners exploring the future of artificial intelligence.'
          : 'Únete a miles de estudiantes explorando el futuro de la inteligencia artificial.'
        }
        primaryCta={{
          label: locale === 'en' ? 'Start Learning Free' : 'Comienza Gratis',
          href: '/courses',
        }}
        secondaryCta={{
          label: locale === 'en' ? 'Explore News' : 'Explorar Noticias',
          href: '/news',
        }}
        locale={locale}
      />

      <style jsx global>{`
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient {
          background-size: 200% auto;
          animation: gradient 3s ease infinite;
        }
      `}</style>
    </main>
  );
}
