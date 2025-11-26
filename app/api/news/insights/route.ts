import { NextResponse } from 'next/server';
import { createClient } from '@/lib/db/supabase-server';
import type { NewsAnalytics, NewsInsightsResponse } from '@/lib/types/news-analytics';

// Revalidate every 2 hours (7200 seconds)
export const revalidate = 7200;

/**
 * GET /api/news/insights
 * 
 * Returns AI-analyzed insights about current news:
 * - Hype vs Substance scores
 * - Domain distribution (CV, NLP, Robotics, etc.)
 * - Trending topics
 * - Company activity
 * - Sentiment by category
 * 
 * Data is cached and updated every 2 hours by automated agent.
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // Fetch the most recent analytics record
    const { data, error } = await supabase
      .from('news_analytics')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error('Error fetching news analytics:', error);
      
      // Return fallback data if no records exist yet
      return NextResponse.json<NewsInsightsResponse>({
        success: true,
        data: getFallbackAnalytics(),
        cached: false,
        next_update: new Date(Date.now() + 7200000).toISOString(),
      });
    }

    if (!data) {
      return NextResponse.json<NewsInsightsResponse>({
        success: true,
        data: getFallbackAnalytics(),
        cached: false,
      });
    }

    // Calculate next update time (2 hours from last update)
    const lastUpdate = new Date(data.updated_at);
    const nextUpdate = new Date(lastUpdate.getTime() + 7200000);

    return NextResponse.json<NewsInsightsResponse>({
      success: true,
      data: data as NewsAnalytics,
      cached: true,
      next_update: nextUpdate.toISOString(),
    });

  } catch (error) {
    console.error('Error in /api/news/insights:', error);
    return NextResponse.json<NewsInsightsResponse>(
      {
        success: false,
        error: 'Failed to fetch news insights',
        data: getFallbackAnalytics(),
      },
      { status: 500 }
    );
  }
}

/**
 * Fallback analytics data when no analysis has been run yet
 */
function getFallbackAnalytics(): NewsAnalytics {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 86400000);

  return {
    id: 'fallback',
    hype_score: 45,
    substance_score: 65,
    hype_keywords: ['revolutionary', 'game-changer', 'breakthrough'],
    substance_keywords: ['benchmark', 'implementation', 'performance'],
    domain_distribution: {
      cv: 20,
      nlp: 45,
      robotics: 12,
      ethics: 8,
      tools: 15,
    },
    trending_topics: [
      { topic: 'LLMs', count: 15, trend: 'up', emoji: '🧠' },
      { topic: 'Computer Vision', count: 10, trend: 'stable', emoji: '👁️' },
      { topic: 'AI Safety', count: 8, trend: 'up', emoji: '🛡️' },
    ],
    sentiment_by_category: {
      'machine-learning': { positive: 60, neutral: 30, negative: 10 },
      'computer-vision': { positive: 55, neutral: 40, negative: 5 },
      'nlp': { positive: 70, neutral: 25, negative: 5 },
    },
    company_activity: [
      { company: 'OpenAI', count: 12, trend: 'up' },
      { company: 'Google DeepMind', count: 10, trend: 'stable' },
      { company: 'Anthropic', count: 8, trend: 'up' },
    ],
    analysis_period_start: oneDayAgo.toISOString(),
    analysis_period_end: now.toISOString(),
    articles_analyzed: 50,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };
}
