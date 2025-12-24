/**
 * TrendDetector Agent
 * Detects bursty topics from recent RSS feeds + embeddings clusters
 */

import { getSupabaseServerClient } from '@/lib/db/supabase';
import { LLMClient } from '@/lib/ai/llm-client';

interface Article {
  id: string;
  title_en: string;
  title_es: string;
  tags?: string[];
  published_at: string;
  category?: string;
}

export interface TrendingTopic {
  topic: string;
  frequency: number;
  growth: number; // Percentage growth vs previous period
  relatedKeywords: string[];
  articles: Array<{
    id: string;
    title: string;
    publishedAt: string;
  }>;
}

export class TrendDetector {
  private llm: LLMClient;

  constructor() {
    this.llm = new LLMClient(
      process.env.GROQ_API_KEY || process.env.OPENROUTER_API_KEY || '',
      process.env.GROQ_API_KEY ? 'https://api.groq.com/openai/v1' : 'https://openrouter.ai/api/v1',
      process.env.GROQ_API_KEY ? 'llama-3.3-70b-versatile' : 'meta-llama/llama-3.1-8b-instruct:free'
    );
  }

  /**
   * Detect trending topics from recent articles
   */
  async detectTrends(timeWindowHours: number = 24): Promise<TrendingTopic[]> {
    const supabase = getSupabaseServerClient();

    // Get articles from last N hours
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - timeWindowHours);

    const { data: recentArticles } = await supabase
      .from('news_articles')
      .select('id, title_en, title_es, tags, category, published_at')
      .gte('published_at', cutoffDate.toISOString())
      .order('published_at', { ascending: false })
      .limit(200);

    if (!recentArticles || recentArticles.length === 0) {
      return [];
    }

    // Get articles from previous period for comparison
    const prevCutoffDate = new Date(cutoffDate);
    prevCutoffDate.setHours(prevCutoffDate.getHours() - timeWindowHours);

    const { data: previousArticles } = await supabase
      .from('news_articles')
      .select('id, tags')
      .gte('published_at', prevCutoffDate.toISOString())
      .lt('published_at', cutoffDate.toISOString())
      .limit(200);

    // Extract keywords and tags
    const recentKeywords = this.extractKeywords(recentArticles);
    const previousKeywords = this.extractKeywords(previousArticles || []);

    // Calculate frequency and growth
    const trends: TrendingTopic[] = [];

    for (const [topic, frequency] of Object.entries(recentKeywords)) {
      const prevFreq = previousKeywords[topic] || 0;
      const growth = prevFreq > 0 ? ((frequency - prevFreq) / prevFreq) * 100 : 100;

      // Only include topics with significant growth or high frequency
      if (growth > 50 || frequency > 5) {
        const relatedArticles = recentArticles.filter(
          a => a.tags?.includes(topic) || a.title_en.toLowerCase().includes(topic.toLowerCase())
        ).slice(0, 5);

        trends.push({
          topic,
          frequency,
          growth,
          relatedKeywords: this.getRelatedKeywords(topic, recentArticles),
          articles: relatedArticles.map(a => ({
            id: a.id,
            title: a.title_en,
            publishedAt: a.published_at,
          })),
        });
      }
    }

    // Sort by growth rate
    trends.sort((a, b) => b.growth - a.growth);

    // Use LLM to refine and categorize trends
    const refinedTrends = await this.refineTrendsWithLLM(trends.slice(0, 10));

    // Log to database
    await this.logTrends(refinedTrends);

    return refinedTrends;
  }

  /**
   * Extract keywords from articles
   */
  private extractKeywords(articles: Partial<Article>[]): Record<string, number> {
    const keywords: Record<string, number> = {};

    articles.forEach(article => {
      // Extract from tags
      article.tags?.forEach((tag: string) => {
        keywords[tag] = (keywords[tag] || 0) + 1;
      });

      // Extract from titles (simple keyword extraction)
      const words = article.title_en?.toLowerCase().split(/\s+/) || [];
      words.forEach((word: string) => {
        if (word.length > 4 && !this.isStopWord(word)) {
          keywords[word] = (keywords[word] || 0) + 1;
        }
      });
    });

    return keywords;
  }

  /**
   * Get related keywords for a topic
   */
  private getRelatedKeywords(topic: string, articles: Partial<Article>[]): string[] {
    const related = new Set<string>();

    articles
      .filter(a => 
        a.tags?.includes(topic) || 
        a.title_en?.toLowerCase().includes(topic.toLowerCase())
      )
      .forEach(a => {
        a.tags?.forEach((tag: string) => {
          if (tag !== topic) related.add(tag);
        });
      });

    return Array.from(related).slice(0, 5);
  }

  /**
   * Refine trends using LLM for better categorization
   */
  private async refineTrendsWithLLM(trends: TrendingTopic[]): Promise<TrendingTopic[]> {
    if (trends.length === 0) return [];

    const prompt = `Analyze these trending AI topics and categorize them into broader themes:

${trends.map((t, i) => `${i + 1}. ${t.topic} (${t.frequency} mentions, ${Math.round(t.growth)}% growth)`).join('\n')}

Return JSON array with refined topics:
[{"topic": "...", "category": "...", "relevance": 1-10}]`;

    try {
      const response = await this.llm.generate(prompt, {
        temperature: 0.3,
        maxTokens: 1000,
      });

      const jsonMatch = response.content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const refined = JSON.parse(jsonMatch[0]);
        
        // Merge LLM insights with original data
        return trends.map((trend, i) => ({
          ...trend,
          topic: refined[i]?.topic || trend.topic,
        }));
      }
    } catch (error) {
      console.error('LLM refinement failed:', error);
    }

    return trends;
  }

  /**
   * Check if word is a stop word
   */
  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'and', 'for', 'with', 'this', 'that', 'from', 'about',
      'into', 'through', 'during', 'before', 'after', 'above', 'below',
    ]);
    return stopWords.has(word);
  }

  /**
   * Log detected trends to database
   */
  private async logTrends(trends: TrendingTopic[]): Promise<void> {
    const supabase = getSupabaseServerClient();

    await supabase.from('ai_system_logs').insert({
      agent_type: 'trend_detector',
      operation: 'detect_trends',
      status: 'success',
      metadata: {
        trends_count: trends.length,
        top_topic: trends[0]?.topic,
        timestamp: new Date().toISOString(),
      },
      created_at: new Date().toISOString(),
    });
  }
}
