import type { SupabaseClient } from '@supabase/supabase-js';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import type { Locale } from '@/i18n';
import {
  KineticHero,
  TodayDigestRail,
  OrbitingTopicsRail,
  CourseGalaxyNavigator,
  AIPlaygroundStrip,
  LeaderboardStrip,
  DeepDiveFeatures,
  FooterCTA,
} from '@/components/home';
import { fetchLatestNews } from '@/lib/db/news';
import { getSupabaseServerClient } from '@/lib/db/supabase';
import { getLocalizedString } from '@/lib/utils/i18n';
import { formatRelativeTimeFromNow } from '@/lib/utils/dates';
import { assignFallbackImagesToArticles, generateCourseFallbackImage, getImageWithFallback } from '@/lib/utils/generate-fallback-image';
import { AI_NEWS_SOURCES } from '@/lib/ai/news-sources';
import { getTrendingTopicsFromCache, type TrendingTopic } from '@/lib/ai/trending';
import type { INewsArticle } from '@/lib/types/news';

type HomePageProps = {
  params: Promise<{
    locale: Locale;
  }>;
};

export const revalidate = 300;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'home' });

  const articles = await fetchLatestNews({ locale, limit: 12 });
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const hasSupabase = Boolean(supabaseUrl && supabaseKey);
  const supabase = hasSupabase ? getSupabaseServerClient() : null;

  const [courseData, leaderboardData, agents, trendingRecords, _articleCount] = await Promise.all([
    loadCourseGalaxyData(supabase, locale),
    loadLeaderboardData(supabase, locale),
    loadAgentTelemetry(supabase, locale),
    loadTrendingTopicRecords(hasSupabase),
    getArticleCount(supabase),
  ]);

  const digestArticles = buildDigestArticles(articles, locale);
  const trendingTopics = buildTrendingTopics(trendingRecords, articles);

  const heroStats = {
    sources: AI_NEWS_SOURCES.length,
    freshnessMinutes: getFreshnessMinutes(articles),
    courses: courseData.totalCourses,
  };

  const featureBlocks = getFeatureBlocks(locale);

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

      {/* Hero Section */}
      <KineticHero
        locale={locale}
        headline={t('hero.title')}
        subheadline={t('hero.subtitle')}
        stats={heroStats}
        primaryCta={{ label: t('hero.cta'), href: '/news' }}
        secondaryCta={{ label: t('hero.ctaSecondary'), href: '/courses' }}
      />

      {/* Today's Digest */}
      <TodayDigestRail articles={digestArticles} locale={locale} />

      {/* Trending Topics */}
      <OrbitingTopicsRail topics={trendingTopics} locale={locale} />

      {/* Course Galaxy */}
      <CourseGalaxyNavigator
            courses={courseData.courses}
            featuredCourseId={courseData.featuredCourseId}
            locale={locale}
          />

      {/* AI Playground */}
      <AIPlaygroundStrip agents={agents} locale={locale} />

      {/* Leaderboard */}
      <LeaderboardStrip
        leaders={leaderboardData.leaders}
        summary={leaderboardData.summary}
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
    </main>
  );
}

function buildDigestArticles(articles: INewsArticle[], locale: Locale) {
  const slice = articles.slice(0, 8);
  const withSpacedFallbacks = assignFallbackImagesToArticles(slice, 5);

  return withSpacedFallbacks.map((article) => {
    const localizedTitle = getLocalizedString(article, 'title', locale);
    const title = localizedTitle || article.title_en;
    return {
      id: article.id,
      category: translateCategory(article.category, locale),
      title,
      relativeTime: formatRelativeTimeFromNow(article.published_at, locale),
      href: `/news/${article.id}`,
      image:
        (article.computed_image_url && article.computed_image_url.trim() !== '')
          ? article.computed_image_url
          : getImageWithFallback(article.image_url, title, article.category, article.id),
      preferredFallback:
        (article.preferred_fallback_image_url && article.preferred_fallback_image_url.trim() !== '')
          ? article.preferred_fallback_image_url
          : getImageWithFallback('', title, article.category, article.id),
      fallbackCategory: article.category,
    };
  });
}

function translateCategory(category: string, locale: Locale) {
  const normalized = category?.toLowerCase().replace(/\s+/g, '') || 'all';
  const labels: Record<string, { en: string; es: string }> = {
    all: { en: 'AI', es: 'IA' },
    machinelearning: { en: 'Machine Learning', es: 'Aprendizaje automático' },
    nlp: { en: 'NLP', es: 'PLN' },
    computervision: { en: 'Computer Vision', es: 'Visión' },
    robotics: { en: 'Robotics', es: 'Robótica' },
    ethics: { en: 'Ethics', es: 'Ética' },
    industry: { en: 'Industry', es: 'Industria' },
    research: { en: 'Research', es: 'Investigación' },
  };

  return labels[normalized]?.[locale] || labels.all[locale];
}

function getFreshnessMinutes(articles: INewsArticle[]) {
  if (!articles.length) return 0;
  const latest = new Date(articles[0].published_at);
  const diffMinutes = Math.max(1, Math.round((Date.now() - latest.getTime()) / 60000));
  return diffMinutes;
}

function getFeatureBlocks(locale: Locale) {
  return [
    {
      id: 'curated-news',
      title: locale === 'en' ? 'AI-Curated News' : 'Noticias Curadas por IA',
      copy:
        locale === 'en'
          ? 'Our autonomous AI agents monitor 50+ sources 24/7, filtering signal from noise to bring you only the most relevant and impactful AI news.'
          : 'Nuestros agentes IA autónomos monitorean 50+ fuentes 24/7, filtrando señal del ruido para traerte solo las noticias más relevantes e impactantes.',
      mediaType: 'lottie' as const,
      mediaSrc: '/animations/news-curation.json',
      icon: '📰',
    },
    {
      id: 'personalized-learning',
      title: locale === 'en' ? 'Personalized Learning' : 'Aprendizaje Personalizado',
      copy:
        locale === 'en'
          ? 'Generate custom courses on any AI topic in seconds. Our RAG-powered system creates comprehensive, textbook-quality content tailored to your level.'
          : 'Genera cursos personalizados sobre cualquier tema de IA en segundos. Nuestro sistema RAG crea contenido comprehensivo de calidad universitaria adaptado a tu nivel.',
      mediaType: 'lottie' as const,
      mediaSrc: '/animations/learning-path.json',
      icon: '🎓',
    },
    {
      id: 'knowledge-graph',
      title: locale === 'en' ? 'Interactive Knowledge Graph' : 'Grafo de Conocimiento Interactivo',
      copy:
        locale === 'en'
          ? 'Explore the interconnected world of AI through our visual knowledge graph. Discover relationships between concepts, companies, and technologies.'
          : 'Explora el mundo interconectado de la IA a través de nuestro grafo visual. Descubre relaciones entre conceptos, empresas y tecnologías.',
      mediaType: 'lottie' as const,
      mediaSrc: '/animations/knowledge-graph.json',
      icon: '🕸️',
    },
  ];
}

async function loadCourseGalaxyData(supabase: SupabaseClient | null, locale: Locale) {
  if (!supabase) {
    return { courses: [], totalCourses: 0, featuredCourseId: undefined };
  }

  try {
    const [{ data }, { count }] = await Promise.all([
      supabase
        .from('courses')
        .select(
          `id, title_en, title_es, description_en, description_es, difficulty, duration_minutes, topics, completion_rate`
        )
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(6),
      supabase.from('courses').select('*', { count: 'exact', head: true }),
    ]);

    const courseIds = (data || []).map((c) => c.id).filter(Boolean);
    const preferredCoversMap: Record<string, string> = {};
    const fallbackCoversMap: Record<string, string> = {};
    const fallbackLocale = locale === 'en' ? 'es' : 'en';

    if (courseIds.length) {
      const coversRes = await supabase
        .from('course_covers')
        .select('course_id, image_url, locale')
        .in('course_id', courseIds)
        .in('locale', [locale, fallbackLocale]);

      if (!coversRes.error && Array.isArray(coversRes.data)) {
        coversRes.data.forEach((row) => {
          const courseId = typeof row.course_id === 'string' ? row.course_id : null;
          const imageUrl = typeof row.image_url === 'string' ? row.image_url : null;
          const rowLocale = typeof row.locale === 'string' ? row.locale : null;
          if (!courseId || !imageUrl || !rowLocale) return;
          if (rowLocale === locale) preferredCoversMap[courseId] = imageUrl;
          if (rowLocale === fallbackLocale) fallbackCoversMap[courseId] = imageUrl;
        });
      }
    }

    const courses = (data || []).map((course) => ({
      id: course.id,
      title: locale === 'en' ? course.title_en : course.title_es,
      level: (course.difficulty as 'beginner' | 'intermediate' | 'advanced') || 'beginner',
      duration: formatCourseDuration(course.duration_minutes),
      progress:
        typeof course.completion_rate === 'number'
          ? Math.round(Number(course.completion_rate))
          : undefined,
      description: locale === 'en' ? course.description_en : course.description_es,
      moduleCount: Array.isArray(course.topics) ? course.topics.length : undefined,
      heroImage:
        preferredCoversMap[course.id] ??
        fallbackCoversMap[course.id] ??
        generateCourseFallbackImage({ category: 'default' }),
    }));

    const featuredCourseId = courses.find((c) => c.heroImage)?.id ?? courses[0]?.id;

    return { courses, totalCourses: count ?? 0, featuredCourseId };
  } catch (error) {
    console.error('[home] Failed to load courses:', error);
    return { courses: [], totalCourses: 0, featuredCourseId: undefined };
  }
}

function formatCourseDuration(minutes?: number | null) {
  if (!minutes || Number.isNaN(minutes)) return '—';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  return `${hours}h`;
}

async function loadLeaderboardData(supabase: SupabaseClient | null, locale: Locale) {
  if (!supabase) {
    return {
      leaders: [],
      summary: { totalUsers: 0, weeklyXpAwarded: 0 },
    };
  }

  try {
    const xpCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [{ data: leaderboard }, xpTransactions, userCount] = await Promise.all([
      supabase
        .from('leaderboard_weekly')
        .select('id, display_name, avatar_url, total_xp, rank')
        .order('rank', { ascending: true })
        .limit(5),
      supabase
        .from('xp_transactions')
        .select('user_id, xp_amount')
        .gte('created_at', xpCutoff),
      supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
    ]);

    const xpMap = new Map<string, number>();
    let weeklyXpAwarded = 0;
    (xpTransactions.data || []).forEach((row: { user_id: string; xp_amount: number | null }) => {
      const amount = row.xp_amount ?? 0;
      weeklyXpAwarded += amount;
      xpMap.set(row.user_id, (xpMap.get(row.user_id) || 0) + amount);
    });

    const leaders = (leaderboard || []).map((entry, index) => ({
      id: entry.id,
      name: entry.display_name || (locale === 'en' ? 'Explorer' : 'Explorador'),
      avatarUrl: entry.avatar_url ?? undefined,
      xp: entry.total_xp ?? 0,
      weeklyDelta: xpMap.get(entry.id) ?? 0,
      rank: entry.rank ?? index + 1,
    }));

    return {
      leaders,
      summary: {
        totalUsers: userCount.count ?? 0,
        weeklyXpAwarded,
      },
    };
  } catch (error) {
    console.error('[home] Failed to load leaderboard:', error);
    return {
      leaders: [],
      summary: { totalUsers: 0, weeklyXpAwarded: 0 },
    };
  }
}

async function loadAgentTelemetry(supabase: SupabaseClient | null, locale: Locale) {
  const blueprints = getAgentBlueprints(locale);

  if (!supabase) {
    return blueprints.map((agent) => ({
      ...agent,
      metrics: { processed: 0 },
    }));
  }

  try {
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    const { data } = await supabase
      .from('ai_system_logs')
      .select('agent_type, action_type, status, success, created_at, timestamp')
      .gte('timestamp', cutoff)
      .order('timestamp', { ascending: false })
      .limit(600);

    const logs = data || [];

    return blueprints.map((agent) => {
      const relevant = logs.filter((log) =>
        (agent.agentType && log.agent_type === agent.agentType) ||
        (agent.actionType && log.action_type === agent.actionType)
      );

      const processed = relevant.length;
      const successCount = relevant.filter(
        (log) => log.success === true || log.status === 'success'
      ).length;
      const lastRunIso = relevant[0]?.created_at || relevant[0]?.timestamp;
      const derivedStatus = relevant.length > 0 ? deriveAgentStatus(relevant[0]) : agent.status;

      return {
        ...agent,
        status: derivedStatus,
        metrics: {
          processed,
          accuracy: processed ? Math.round((successCount / processed) * 100) : undefined,
          lastRun: lastRunIso ? formatRelativeTimeFromNow(lastRunIso, locale) : undefined,
        },
      };
    });
  } catch (error) {
    console.error('[home] Failed to load agent telemetry:', error);
    return blueprints.map((agent) => ({
      ...agent,
      metrics: { processed: 0 },
    }));
  }
}

function getAgentBlueprints(locale: Locale) {
  return [
    {
      id: 'trend-detector',
      name: locale === 'en' ? 'Trend Detector' : 'Detector de Tendencias',
      cadence: locale === 'en' ? 'Every 6 hours' : 'Cada 6 horas',
      stack: ['Embeddings', 'NLP', 'LLM'],
      status: 'active' as const,
      agentType: 'trend_detector',
    },
    {
      id: 'fact-checker',
      name: locale === 'en' ? 'Fact Checker' : 'Verificador',
      cadence: locale === 'en' ? 'Per article' : 'Por artículo',
      stack: ['Search', 'LLM'],
      status: 'active' as const,
      agentType: 'fact_checker',
    },
    {
      id: 'multi-perspective',
      name: locale === 'en' ? 'Multi-Perspective' : 'Perspectivas Múltiples',
      cadence: locale === 'en' ? 'On-demand' : 'Bajo demanda',
      stack: ['Summaries', 'LLM'],
      status: 'learning' as const,
      agentType: 'multi_perspective',
    },
    {
      id: 'bias-auditor',
      name: locale === 'en' ? 'Bias Auditor' : 'Auditor de Sesgos',
      cadence: locale === 'en' ? 'Daily' : 'Diario',
      stack: ['Sentiment', 'Analytics'],
      status: 'idle' as const,
      agentType: 'bias_auditor',
    },
    {
      id: 'course-generator',
      name: locale === 'en' ? 'Course Generator' : 'Generador de Cursos',
      cadence: locale === 'en' ? 'On-demand' : 'Bajo demanda',
      stack: ['RAG', 'LLM', 'Vision'],
      status: 'idle' as const,
      actionType: 'course_generation',
    },
    {
      id: 'learning-agent',
      name: locale === 'en' ? 'Learning Agent' : 'Agente Aprendiz',
      cadence: locale === 'en' ? 'Daily' : 'Diario',
      stack: ['Feedback', 'RL'],
      status: 'learning' as const,
      actionType: 'learning_cycle',
    },
  ];
}

type AgentStatus = 'active' | 'idle' | 'learning';

function deriveAgentStatus(log?: { status?: string | null; success?: boolean | null }): AgentStatus {
  if (!log) return 'idle';
  if (log.status === 'running') return 'active';
  if (log.status === 'success' || log.success) return 'active';
  if (log.status === 'error' || log.success === false) return 'learning';
  return 'idle';
}

async function loadTrendingTopicRecords(hasSupabase: boolean) {
  if (!hasSupabase) return [] as TrendingTopic[];
  try {
    const { topics } = await getTrendingTopicsFromCache();
    return topics ?? [];
  } catch (error) {
    console.error('[home] Failed to load trending topics:', error);
    return [];
  }
}

function buildTrendingTopics(records: TrendingTopic[], articles: INewsArticle[]) {
  if (!records.length) {
    return buildFallbackTrendingTopics(articles);
  }

  return records.slice(0, 12).map((topic) => ({
    slug: slugifyTopic(topic.topic),
    label: formatTopicLabel(topic.topic),
    deltaArticles: Math.max(1, Math.round(topic.momentum ?? topic.count ?? 1)),
  }));
}

function buildFallbackTrendingTopics(articles: INewsArticle[]) {
  const topicStats = extractArticleTopicStats(articles);
  if (!topicStats.length) {
    return ['GPT-5', 'Claude 4.5', 'Gemini 3', 'Open Source', 'Agents', 'RAG'].map((label) => ({
      slug: slugifyTopic(label),
      label,
      deltaArticles: 1,
    }));
  }

  return topicStats.slice(0, 8).map(({ label, count }) => ({
    slug: slugifyTopic(label),
    label,
    deltaArticles: count,
  }));
}

function _deriveTopicsFromArticles(articles: INewsArticle[]) {
  const stats = extractArticleTopicStats(articles);
  if (!stats.length) {
    return ['GPT-5', 'Claude 4.5', 'Gemini 3', 'Open Source', 'Agents', 'RAG'];
  }

  return stats.slice(0, 8).map(({ label }) => label);
}

function slugifyTopic(topic: string) {
  return topic
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'topic';
}

function formatTopicLabel(topic: string) {
  return topic
    .replace(/[-_]/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

async function getArticleCount(supabase: SupabaseClient | null) {
  if (!supabase) return 0;
  try {
    const { count } = await supabase
      .from('news_articles')
      .select('*', { count: 'exact', head: true });
    return count ?? 0;
  } catch (error) {
    console.error('[home] Failed to count articles:', error);
    return 0;
  }
}

function extractArticleTopicStats(articles: INewsArticle[]) {
  const counts = new Map<string, number>();
  articles.forEach((article) => {
    article.tags?.forEach((tag) => {
      const normalized = formatTopicLabel(tag);
      counts.set(normalized, (counts.get(normalized) || 0) + 1);
    });
  });

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count }));
}
