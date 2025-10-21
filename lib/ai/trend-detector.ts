import { AIAgent } from './agent-framework';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { AgentMetrics } from './agent-framework';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface Article {
  id: string;
  title_en: string;
  title_es: string;
  content_en: string;
  content_es: string;
  created_at: string;
}

interface TrendingTopic {
  topic: string;
  count: number;
  articles: string[];
  entities: string[];
  firstSeen: Date;
  lastSeen: Date;
  momentum: number;
}

/**
 * TrendDetector Agent
 * Analyzes recent articles to identify trending topics using:
 * 1. Keyword frequency analysis
 * 2. Entity co-occurrence patterns
 * 3. Temporal clustering (burst detection)
 */
export class TrendDetectorAgent extends AIAgent {
  private readonly LOOKBACK_HOURS = 24;
  private readonly MIN_MENTIONS = 3;
  
  async execute(): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Fetch recent articles
      const articles = await this.fetchRecentArticles();
      
      if (articles.length === 0) {
        await this.logPerformance({
          agent: 'TrendDetector',
          actionType: 'trend_detection',
          modelUsed: 'none',
          inputTokens: 0,
          outputTokens: 0,
          success: true,
          executionTime: Date.now() - startTime,
          cost: 0,
        });
        return;
      }
      
      // Extract and analyze topics
      const topics = await this.extractTopics(articles);
      const trending = this.detectTrending(topics);
      
      // Store trending topics
      await this.storeTrendingTopics(trending);
      
      // Optionally create entities for new topics
      await this.createTopicEntities(trending);
      
      await this.logPerformance({
        agent: 'TrendDetector',
        actionType: 'trend_detection',
        modelUsed: 'none',
        inputTokens: 0,
        outputTokens: 0,
        success: true,
        executionTime: Date.now() - startTime,
        cost: 0,
        topics_found: topics.size,
        articles_stored: trending.length,
      });
    } catch (error) {
      await this.logPerformance({
        agent: 'TrendDetector',
        actionType: 'trend_detection',
        modelUsed: 'none',
        inputTokens: 0,
        outputTokens: 0,
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        executionTime: Date.now() - startTime,
        cost: 0,
      });
      throw error;
    }
  }
  
  private async fetchRecentArticles() {
    const cutoff = new Date(Date.now() - this.LOOKBACK_HOURS * 60 * 60 * 1000);
    
    const { data } = await this.db
      .from('news_articles')
      .select('id, title_en, title_es, content_en, content_es, created_at')
      .gte('created_at', cutoff.toISOString())
      .order('created_at', { ascending: false })
      .limit(100);
    
    return data || [];
  }
  
  private async extractTopics(articles: Article[]): Promise<Map<string, TrendingTopic>> {
    const topics = new Map<string, TrendingTopic>();
    
    for (const article of articles) {
      const text = `${article.title_en} ${article.content_en}`.toLowerCase();
      
      // Extract keywords (simple approach; in production use NLP)
      const keywords = this.extractKeywords(text);
      
      for (const keyword of keywords) {
        if (!topics.has(keyword)) {
          topics.set(keyword, {
            topic: keyword,
            count: 0,
            articles: [],
            entities: [],
            firstSeen: new Date(article.created_at),
            lastSeen: new Date(article.created_at),
            momentum: 0,
          });
        }
        
        const topic = topics.get(keyword)!;
        topic.count++;
        topic.articles.push(article.id);
        topic.lastSeen = new Date(article.created_at);
      }
    }
    
    return topics;
  }
  
  private extractKeywords(text: string): string[] {
    // Simple keyword extraction
    // In production: use TF-IDF, named entity recognition, or LLM
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those']);
    
    const words = text
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3 && !stopWords.has(w));
    
    // Count frequency
    const freq = new Map<string, number>();
    for (const word of words) {
      freq.set(word, (freq.get(word) || 0) + 1);
    }
    
    // Return top keywords
    return Array.from(freq.entries())
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }
  
  private detectTrending(topics: Map<string, TrendingTopic>): TrendingTopic[] {
    const trending: TrendingTopic[] = [];
    
    for (const topic of topics.values()) {
      if (topic.count < this.MIN_MENTIONS) continue;
      
      // Calculate momentum (velocity of mentions)
      const timeSpan = topic.lastSeen.getTime() - topic.firstSeen.getTime();
      const hours = timeSpan / (1000 * 60 * 60) || 1;
      topic.momentum = topic.count / hours;
      
      trending.push(topic);
    }
    
    return trending.sort((a, b) => b.momentum - a.momentum).slice(0, 20);
  }
  
  private async storeTrendingTopics(trending: TrendingTopic[]) {
    // Store in a trending_topics table (to be created in migration)
    // For now, log to system logs
    for (const topic of trending) {
      await this.db.from('ai_system_logs').insert({
        agent: 'TrendDetector',
        operation: 'trending_topic',
        status: 'success',
        metadata: {
          topic: topic.topic,
          count: topic.count,
          momentum: topic.momentum,
          articles: topic.articles.slice(0, 5),
        },
      });
    }
  }
  
  private async createTopicEntities(trending: TrendingTopic[]) {
    // Create entities for high-momentum topics that don't exist yet
    for (const topic of trending.slice(0, 5)) {
      if (topic.momentum < 2) continue; // Only create for very trending topics
      
      const { data: existing } = await this.db
        .from('entities')
        .select('id')
        .eq('type', 'concept')
        .ilike('name', topic.topic)
        .limit(1);
      
      if (!existing || existing.length === 0) {
        await this.db.from('entities').insert({
          type: 'concept',
          name: topic.topic,
          description: `Trending topic detected with ${topic.count} mentions`,
          metadata: {
            trend_detected: new Date().toISOString(),
            momentum: topic.momentum,
            article_count: topic.count,
          },
        });
      }
    }
  }
}
