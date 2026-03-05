/**
 * AI News Insights Analyzer
 *
 * Analyzes recent news articles to generate insights:
 * - Hype vs Substance detection
 * - Domain distribution (CV, NLP, Robotics, Ethics, Tools)
 * - Trending topics
 * - Company activity
 * - Sentiment by category
 *
 * Runs every 2 hours via GitHub Actions
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const MAX_NETWORK_RETRIES = Number(process.env.SUPABASE_NETWORK_RETRIES ?? '4');
const BASE_RETRY_DELAY_MS = Number(process.env.SUPABASE_NETWORK_RETRY_DELAY_MS ?? '1500');

if (!supabaseUrl || !supabaseKey) {
  console.error(
    'Missing Supabase credentials. Required: SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.',
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

type NewsArticle = {
  id: string;
  title_en: string | null;
  title_es: string | null;
  summary_en: string | null;
  summary_es: string | null;
  category: string | null;
  published_at: string | null;
};

type AnalyticsRecord = {
  hype_score: number;
  substance_score: number;
  hype_keywords: string[];
  substance_keywords: string[];
  domain_distribution: Record<string, number>;
  trending_topics: Array<{ topic: string; count: number; trend: 'up' | 'stable'; emoji: string }>;
  sentiment_by_category: Record<string, never>;
  company_activity: Array<{ company: string; count: number; trend: 'stable' }>;
  analysis_period_start: string;
  analysis_period_end: string;
  articles_analyzed: number;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableNetworkFailure(error: unknown): boolean {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : JSON.stringify(error);
  const text = raw.toLowerCase();

  return (
    text.includes('fetch failed') ||
    text.includes('network') ||
    text.includes('enotfound') ||
    text.includes('econnreset') ||
    text.includes('etimedout') ||
    text.includes('socket') ||
    text.includes('temporarily unavailable') ||
    text.includes('502') ||
    text.includes('503') ||
    text.includes('504')
  );
}

async function withRetry<T>(label: string, task: () => Promise<T>): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_NETWORK_RETRIES; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      const retryable = isRetryableNetworkFailure(error);
      if (!retryable || attempt === MAX_NETWORK_RETRIES) {
        throw error;
      }

      const delay = Math.min(BASE_RETRY_DELAY_MS * 2 ** (attempt - 1), 12000);
      console.warn(
        `[Retry] ${label} failed (attempt ${attempt}/${MAX_NETWORK_RETRIES}): ${
          error instanceof Error ? error.message : String(error)
        }. Retrying in ${delay}ms`,
      );
      await sleep(delay);
    }
  }

  throw lastError ?? new Error(`${label} failed after retries`);
}

function toErrorPayload(error: unknown): { message: string; details?: string } {
  if (error instanceof Error) {
    return { message: error.message };
  }

  if (typeof error === 'object' && error !== null) {
    const value = error as Record<string, unknown>;
    const message =
      typeof value.message === 'string'
        ? value.message
        : typeof value.error === 'string'
          ? value.error
          : 'Unknown error';
    const details =
      typeof value.details === 'string'
        ? value.details
        : typeof value.hint === 'string'
          ? value.hint
          : undefined;
    return { message, details };
  }

  return { message: String(error) };
}

function isTransientFatalError(error: unknown): boolean {
  const payload = toErrorPayload(error);
  return isRetryableNetworkFailure(payload.message) || isRetryableNetworkFailure(payload.details ?? '');
}

async function fetchRecentArticles(): Promise<NewsArticle[]> {
  return await withRetry('fetch_recent_articles', async () => {
    const { data, error } = await supabase
      .from('news_articles')
      .select('id, title_en, title_es, summary_en, summary_es, category, published_at')
      .order('published_at', { ascending: false })
      .limit(100);

    if (error) {
      throw new Error(
        JSON.stringify({
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        }),
      );
    }

    return (data as NewsArticle[] | null) ?? [];
  });
}

async function insertAnalytics(record: AnalyticsRecord): Promise<void> {
  await withRetry('insert_news_analytics', async () => {
    const { error } = await supabase.from('news_analytics').insert([record]);
    if (error) {
      throw new Error(
        JSON.stringify({
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        }),
      );
    }
  });
}

// Keywords for hype detection
const HYPE_KEYWORDS = [
  'revolutionary', 'game-changer', 'breakthrough', 'unprecedented',
  'never before', 'world-first', 'game changer', 'revolutionary',
  'transformative', 'disrupting', 'next generation', 'cutting-edge',
  'paradigm shift', 'moonshot', 'holy grail'
];

const SUBSTANCE_KEYWORDS = [
  'benchmark', 'performance', 'accuracy', 'implementation',
  'dataset', 'methodology', 'results', 'evaluation',
  'architecture', 'algorithm', 'metrics', 'validation',
  'peer-reviewed', 'experiment', 'analysis', 'research',
  'open-source', 'code', 'paper', 'technical'
];

// Domain classification keywords
const DOMAIN_KEYWORDS = {
  cv: ['computer vision', 'image', 'video', 'visual', 'object detection', 'segmentation', 'recognition', 'opencv'],
  nlp: ['language model', 'llm', 'gpt', 'chatbot', 'text', 'translation', 'summarization', 'transformer'],
  robotics: ['robot', 'robotics', 'autonomous', 'drone', 'manipulation', 'navigation', 'sensor'],
  ethics: ['ethics', 'bias', 'fairness', 'policy', 'regulation', 'safety', 'alignment', 'governance'],
  tools: ['framework', 'library', 'api', 'sdk', 'tool', 'platform', 'infrastructure', 'deployment']
};

// Companies to track
const COMPANIES = [
  'OpenAI', 'Google', 'DeepMind', 'Anthropic', 'Meta', 'Microsoft',
  'Tesla', 'Apple', 'Amazon', 'NVIDIA', 'Hugging Face', 'Stability AI',
  'Cohere', 'Mistral', 'xAI', 'Character.AI'
];

/**
 * Calculate hype score based on keyword frequency
 */
function calculateHypeScore(text: string): { score: number; keywords: string[] } {
  const lowerText = text.toLowerCase();
  const foundKeywords: string[] = [];

  HYPE_KEYWORDS.forEach((keyword) => {
    if (lowerText.includes(keyword)) {
      foundKeywords.push(keyword);
    }
  });

  // Score = (found keywords / total hype keywords) * 100
  const score = Math.min(100, (foundKeywords.length / HYPE_KEYWORDS.length) * 300);

  return { score: Math.round(score), keywords: foundKeywords.slice(0, 5) };
}

/**
 * Calculate substance score based on technical keywords
 */
function calculateSubstanceScore(text: string): { score: number; keywords: string[] } {
  const lowerText = text.toLowerCase();
  const foundKeywords: string[] = [];

  SUBSTANCE_KEYWORDS.forEach((keyword) => {
    if (lowerText.includes(keyword)) {
      foundKeywords.push(keyword);
    }
  });

  const score = Math.min(100, (foundKeywords.length / SUBSTANCE_KEYWORDS.length) * 300);

  return { score: Math.round(score), keywords: foundKeywords.slice(0, 5) };
}

/**
 * Classify article into AI domains
 */
function classifyDomain(text: string): keyof typeof DOMAIN_KEYWORDS | null {
  const lowerText = text.toLowerCase();
  const scores: Record<string, number> = {};

  Object.entries(DOMAIN_KEYWORDS).forEach(([domain, keywords]) => {
    scores[domain] = keywords.filter((kw) => lowerText.includes(kw)).length;
  });

  const maxScore = Math.max(...Object.values(scores));
  if (maxScore === 0) return null;

  return Object.keys(scores).find(k => scores[k] === maxScore) as keyof typeof DOMAIN_KEYWORDS;
}

/**
 * Extract companies mentioned in text
 */
function extractCompanies(text: string): string[] {
  const found: string[] = [];
  const lowerText = text.toLowerCase();

  COMPANIES.forEach((company) => {
    if (lowerText.includes(company.toLowerCase())) {
      found.push(company);
    }
  });

  return found;
}

/**
 * Main analysis function
 */
async function analyzeNewsInsights() {
  console.log('🚀 Starting news insights analysis...');

  try {
    const articles = await fetchRecentArticles();
    if (!articles || articles.length === 0) {
      console.log('No articles found');
      return;
    }

    console.log(`📊 Analyzing ${articles.length} articles...`);

    // Initialize accumulators
    let totalHypeScore = 0;
    let totalSubstanceScore = 0;
    const allHypeKeywords: string[] = [];
    const allSubstanceKeywords: string[] = [];
    const domainCounts: Record<string, number> = {
      cv: 0,
      nlp: 0,
      robotics: 0,
      ethics: 0,
      tools: 0
    };
    const companyCounts: Record<string, number> = {};

    // Analyze each article
    articles.forEach((article) => {
      const baseTitle = article.title_en || article.title_es || '';
      const baseSummary = article.summary_en || article.summary_es || '';
      const text = `${baseTitle} ${baseSummary}`;

      // Hype & Substance
      const hype = calculateHypeScore(text);
      const substance = calculateSubstanceScore(text);

      totalHypeScore += hype.score;
      totalSubstanceScore += substance.score;
      allHypeKeywords.push(...hype.keywords);
      allSubstanceKeywords.push(...substance.keywords);

      // Domain classification
      const domain = classifyDomain(text);
      if (domain) {
        domainCounts[domain]++;
      }

      // Company extraction
      const companies = extractCompanies(text);
      companies.forEach((company) => {
        companyCounts[company] = (companyCounts[company] || 0) + 1;
      });
    });

    // Calculate averages and percentages
    const avgHypeScore = Math.round(totalHypeScore / articles.length);
    const avgSubstanceScore = Math.round(totalSubstanceScore / articles.length);

    // Get top keywords (most frequent)
    const topHypeKeywords = [...new Set(allHypeKeywords)].slice(0, 5);
    const topSubstanceKeywords = [...new Set(allSubstanceKeywords)].slice(0, 5);

    // Calculate domain distribution percentages
    const totalDomainArticles = Object.values(domainCounts).reduce((a, b) => a + b, 0);
    const domainDistribution: Record<string, number> = {};

    Object.entries(domainCounts).forEach(([domain, count]) => {
      domainDistribution[domain] = totalDomainArticles > 0
        ? Math.round((count / totalDomainArticles) * 100)
        : 0;
    });

    // Trending topics (simplified - just extract common terms)
    const trending_topics = [
      { topic: 'LLMs', count: domainCounts.nlp, trend: 'up' as const, emoji: '🧠' },
      { topic: 'Computer Vision', count: domainCounts.cv, trend: 'stable' as const, emoji: '👁️' },
      { topic: 'AI Safety', count: domainCounts.ethics, trend: 'up' as const, emoji: '🛡️' },
    ].sort((a, b) => b.count - a.count);

    // Top companies by mentions
    const company_activity = Object.entries(companyCounts)
      .map(([company, count]) => ({
        company,
        count,
        trend: 'stable' as const // TODO: Compare with previous period
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Prepare analytics record
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 86400000);

    const analyticsRecord: AnalyticsRecord = {
      hype_score: avgHypeScore,
      substance_score: avgSubstanceScore,
      hype_keywords: topHypeKeywords,
      substance_keywords: topSubstanceKeywords,
      domain_distribution: domainDistribution,
      trending_topics,
      sentiment_by_category: {}, // TODO: Implement sentiment analysis
      company_activity,
      analysis_period_start: oneDayAgo.toISOString(),
      analysis_period_end: now.toISOString(),
      articles_analyzed: articles.length,
    };

    console.log('📈 Analysis Results:');
    console.log(`  Hype Score: ${avgHypeScore}%`);
    console.log(`  Substance Score: ${avgSubstanceScore}%`);
    console.log('  Domain Distribution:', domainDistribution);

    // Save to database (with retry for transient network failures)
    await insertAnalytics(analyticsRecord);

    console.log('✅ Analysis saved successfully!');
  } catch (error) {
    console.error('❌ Error analyzing news insights:', toErrorPayload(error));
    throw error;
  }
}

// Run the analysis
analyzeNewsInsights()
  .then(() => {
    console.log('🎉 Analysis complete!');
    process.exit(0);
  })
  .catch((error) => {
    if (isTransientFatalError(error)) {
      const payload = toErrorPayload(error);
      console.warn('⚠️ Transient network failure while analyzing insights. Will retry on next schedule.', payload);
      process.exit(0);
    }
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
