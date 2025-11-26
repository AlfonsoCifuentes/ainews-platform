// Type definitions for News Analytics insights

export interface HypeMetrics {
  hype_score: number; // 0-100
  substance_score: number; // 0-100
  hype_keywords: string[];
  substance_keywords: string[];
}

export interface DomainDistribution {
  cv: number; // Computer Vision percentage
  nlp: number; // Natural Language Processing percentage
  robotics: number; // Robotics percentage
  ethics: number; // Ethics/Policy percentage
  tools: number; // Tools/Infrastructure percentage
}

export interface TrendingTopic {
  topic: string;
  count: number;
  trend: 'up' | 'down' | 'stable';
  emoji?: string;
}

export interface CompanyActivity {
  company: string;
  count: number;
  trend: 'up' | 'down' | 'stable';
  logo?: string;
}

export interface SentimentByCategory {
  [category: string]: {
    positive: number;
    neutral: number;
    negative: number;
  };
}

export interface NewsAnalytics {
  id: string;
  hype_score: number;
  substance_score: number;
  hype_keywords: string[];
  substance_keywords: string[];
  domain_distribution: DomainDistribution;
  trending_topics: TrendingTopic[];
  sentiment_by_category: SentimentByCategory;
  company_activity: CompanyActivity[];
  analysis_period_start: string;
  analysis_period_end: string;
  articles_analyzed: number;
  created_at: string;
  updated_at: string;
}

export interface NewsInsightsResponse {
  success: boolean;
  data?: NewsAnalytics;
  error?: string;
  cached?: boolean;
  next_update?: string;
}
