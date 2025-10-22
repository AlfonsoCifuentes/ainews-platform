import { getSupabaseServerClient } from '@/lib/db/supabase';

export interface TrendingTopic {
  topic: string;
  count: number;
  articles: string[];
  momentum: number;
}

/**
 * Simple trend detection from recent articles
 */
export async function detectTrendingTopics(lookbackHours = 24): Promise<TrendingTopic[]> {
  const db = getSupabaseServerClient();
  const cutoff = new Date(Date.now() - lookbackHours * 60 * 60 * 1000);
  
  const { data: articles } = await db
    .from('news_articles')
    .select('id, title_en, content_en, created_at')
    .gte('created_at', cutoff.toISOString())
    .order('created_at', { ascending: false })
    .limit(100);
  
  if (!articles || articles.length === 0) return [];
  
  // Extract keywords from articles
  const topicMap = new Map<string, { count: number; articles: Set<string>; firstSeen: Date; lastSeen: Date }>();
  
  for (const article of articles) {
    const text = `${article.title_en} ${article.content_en || ''}`.toLowerCase();
    const keywords = extractKeywords(text);
    
    for (const keyword of keywords) {
      if (!topicMap.has(keyword)) {
        topicMap.set(keyword, {
          count: 0,
          articles: new Set(),
          firstSeen: new Date(article.created_at),
          lastSeen: new Date(article.created_at),
        });
      }
      
      const topic = topicMap.get(keyword)!;
      topic.count++;
      topic.articles.add(article.id);
      if (new Date(article.created_at) > topic.lastSeen) {
        topic.lastSeen = new Date(article.created_at);
      }
    }
  }
  
  // Calculate momentum and filter
  const trending: TrendingTopic[] = [];
  
  for (const [topicName, data] of topicMap.entries()) {
    if (data.count < 3) continue;
    
    const timeSpan = data.lastSeen.getTime() - data.firstSeen.getTime();
    const hours = Math.max(timeSpan / (1000 * 60 * 60), 0.5);
    const momentum = data.count / hours;
    
    trending.push({
      topic: topicName,
      count: data.count,
      articles: Array.from(data.articles),
      momentum,
    });
  }
  
  return trending.sort((a, b) => b.momentum - a.momentum).slice(0, 20);
}

function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 
    'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those'
  ]);
  
  const words = text
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !stopWords.has(w));
  
  const freq = new Map<string, number>();
  for (const word of words) {
    freq.set(word, (freq.get(word) || 0) + 1);
  }
  
  return Array.from(freq.entries())
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
}
