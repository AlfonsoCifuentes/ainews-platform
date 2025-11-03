/**
 * BiasAuditor Agent
 * Detects bias and sentiment across articles with labeling
 */

import { createClient } from '@/lib/db/supabase-server';
import { LLMClient } from '@/lib/ai/llm-client';

export interface BiasAnalysis {
  articleId: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  sentimentScore: number; // -1 to 1
  biasType: 'political' | 'commercial' | 'sensational' | 'none';
  biasLevel: 'none' | 'low' | 'moderate' | 'high';
  indicators: string[];
  recommendations: string[];
  tonality: {
    objective: number; // 0-100
    emotional: number; // 0-100
    factual: number; // 0-100
  };
}

export class BiasAuditor {
  private llm: LLMClient;

  constructor() {
    this.llm = new LLMClient(
      process.env.GROQ_API_KEY || process.env.OPENROUTER_API_KEY || '',
      process.env.GROQ_API_KEY ? 'https://api.groq.com/openai/v1' : 'https://openrouter.ai/api/v1',
      process.env.GROQ_API_KEY ? 'llama-3.3-70b-versatile' : 'meta-llama/llama-3.1-8b-instruct:free'
    );
  }

  /**
   * Analyze bias and sentiment in an article
   */
  async analyzeArticle(articleId: string): Promise<BiasAnalysis> {
    const supabase = await createClient();

    // Get article
    const { data: article } = await supabase
      .from('news_articles')
      .select('title_en, content_en, category')
      .eq('id', articleId)
      .single();

    if (!article) {
      throw new Error('Article not found');
    }

    const fullText = `${article.title_en}\n\n${article.content_en}`;

    // Analyze with LLM
    const analysis = await this.performBiasAnalysis(fullText);

    // Store results
    await this.storeAnalysis(articleId, analysis);

    return {
      articleId,
      ...analysis,
    };
  }

  /**
   * Perform bias analysis using LLM
   */
  private async performBiasAnalysis(text: string): Promise<Omit<BiasAnalysis, 'articleId'>> {
    const prompt = `Analyze this AI news article for bias and sentiment:

${text.slice(0, 2500)}

Evaluate:
1. Sentiment (positive/neutral/negative) and score (-1 to 1)
2. Bias type (political/commercial/sensational/none)
3. Bias level (none/low/moderate/high)
4. Specific bias indicators found
5. Tonality scores (objective 0-100, emotional 0-100, factual 0-100)

Return JSON:
{
  "sentiment": "...",
  "sentimentScore": -1 to 1,
  "biasType": "...",
  "biasLevel": "...",
  "indicators": ["...", "..."],
  "recommendations": ["...", "..."],
  "tonality": {
    "objective": 0-100,
    "emotional": 0-100,
    "factual": 0-100
  }
}

Bias indicators to check:
- Loaded language or emotional words
- Unattributed claims
- Omission of alternative viewpoints
- Promotional language for companies/products
- Sensational or clickbait phrasing
- Political framing`;

    try {
      const response = await this.llm.generate(prompt, {
        temperature: 0.2,
        maxTokens: 1200,
      });

      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Bias analysis failed:', error);
    }

    // Fallback
    return {
      sentiment: 'neutral',
      sentimentScore: 0,
      biasType: 'none',
      biasLevel: 'none',
      indicators: [],
      recommendations: [],
      tonality: {
        objective: 50,
        emotional: 50,
        factual: 50,
      },
    };
  }

  /**
   * Store bias analysis in database
   */
  private async storeAnalysis(
    articleId: string,
    analysis: Omit<BiasAnalysis, 'articleId'>
  ): Promise<void> {
    const supabase = await createClient();

    await supabase.from('bias_analyses').insert({
      article_id: articleId,
      sentiment: analysis.sentiment,
      sentiment_score: analysis.sentimentScore,
      bias_type: analysis.biasType,
      bias_level: analysis.biasLevel,
      indicators: analysis.indicators,
      recommendations: analysis.recommendations,
      tonality: analysis.tonality,
      created_at: new Date().toISOString(),
    });

    // Log operation
    await supabase.from('ai_system_logs').insert({
      agent_type: 'bias_auditor',
      operation: 'analyze_bias',
      status: 'success',
      metadata: {
        article_id: articleId,
        bias_level: analysis.biasLevel,
        sentiment: analysis.sentiment,
        timestamp: new Date().toISOString(),
      },
      created_at: new Date().toISOString(),
    });
  }

  /**
   * Batch analyze multiple articles
   */
  async analyzeCategory(category: string, limit: number = 50): Promise<BiasAnalysis[]> {
    const supabase = await createClient();

    // Get recent articles in category
    const { data: articles } = await supabase
      .from('news_articles')
      .select('id')
      .eq('category', category)
      .order('published_at', { ascending: false })
      .limit(limit);

    if (!articles) return [];

    const results: BiasAnalysis[] = [];

    for (const article of articles) {
      try {
        const analysis = await this.analyzeArticle(article.id);
        results.push(analysis);
      } catch (error) {
        console.error(`Failed to analyze ${article.id}:`, error);
      }
    }

    return results;
  }

  /**
   * Get bias statistics for a category
   */
  async getCategoryStats(category: string): Promise<{
    totalArticles: number;
    averageSentiment: number;
    biasDistribution: Record<string, number>;
    averageObjectivity: number;
  }> {
    const supabase = await createClient();

    const { data: analyses } = await supabase
      .from('bias_analyses')
      .select(`
        sentiment_score,
        bias_level,
        tonality,
        article:news_articles!inner(category)
      `)
      .eq('article.category', category);

    if (!analyses || analyses.length === 0) {
      return {
        totalArticles: 0,
        averageSentiment: 0,
        biasDistribution: {},
        averageObjectivity: 0,
      };
    }

    const totalArticles = analyses.length;
    const averageSentiment = analyses.reduce((sum, a) => sum + a.sentiment_score, 0) / totalArticles;
    const averageObjectivity = analyses.reduce((sum, a) => sum + a.tonality.objective, 0) / totalArticles;

    const biasDistribution: Record<string, number> = {};
    analyses.forEach(a => {
      biasDistribution[a.bias_level] = (biasDistribution[a.bias_level] || 0) + 1;
    });

    return {
      totalArticles,
      averageSentiment,
      biasDistribution,
      averageObjectivity,
    };
  }
}
