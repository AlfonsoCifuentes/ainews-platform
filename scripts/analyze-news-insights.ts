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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const openrouterKey = process.env.OPENROUTER_API_KEY;
const groqKey = process.env.GROQ_API_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

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
  nlp: ['language model', 'llm', 'gpt', 'nlp', 'text', 'chatbot', 'translation', 'summarization', 'transformer'],
  robotics: ['robot', 'robotics', 'autonomous', 'drone', 'manipulation', 'navigation', 'sensor'],
  ethics: ['ethics', 'bias', 'fairness', 'policy', 'regulation', 'safety', 'alignment', 'governance'],
  tools: ['framework', 'library', 'api', 'sdk', 'tool', 'platform', 'infrastructure', 'deployment']
};

/**
 * Calculate hype score based on keyword frequency
 */
function calculateHypeScore(text: string): { score: number; keywords: string[] } {
  const lowerText = text.toLowerCase();
  const foundKeywords: string[] = [];
  
  HYPE_KEYWORDS.forEach(keyword => {
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
  
  SUBSTANCE_KEYWORDS.forEach(keyword => {
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
    scores[domain] = keywords.filter(kw => lowerText.includes(kw)).length;
  });
  
  const maxScore = Math.max(...Object.values(scores));
  if (maxScore === 0) return null;
  
  return Object.keys(scores).find(k => scores[k] === maxScore) as keyof typeof DOMAIN_KEYWORDS;
}

/**
 * Main analysis function
 */
async function analyzeNewsInsights() {
  console.log('🚀 Starting news insights analysis...');
  
  try {
    // Fetch last 100 articles
    const { data: articles, error } = await supabase
      .from('news_articles')
      .select('id, title_en, title_es, summary_en, summary_es, category, published_at')
      .order('published_at', { ascending: false })
      .limit(100);
    
    if (error) throw error;
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
    
    // Analyze each article
    articles.forEach(article => {
      const text = `${article.title_en} ${article.summary_en || ''}`;
      
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
    
    // Prepare analytics record
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 86400000);
    
    const analyticsRecord = {
      hype_score: avgHypeScore,
      substance_score: avgSubstanceScore,
      hype_keywords: topHypeKeywords,
      substance_keywords: topSubstanceKeywords,
      domain_distribution: domainDistribution,
      trending_topics,
      sentiment_by_category: {}, // TODO: Implement sentiment analysis
      company_activity: [], // TODO: Implement company extraction
      analysis_period_start: oneDayAgo.toISOString(),
      analysis_period_end: now.toISOString(),
      articles_analyzed: articles.length,
    };
    
    console.log('📈 Analysis Results:');
    console.log(`  Hype Score: ${avgHypeScore}%`);
    console.log(`  Substance Score: ${avgSubstanceScore}%`);
    console.log(`  Domain Distribution:`, domainDistribution);
    
    // Save to database
    const { error: insertError } = await supabase
      .from('news_analytics')
      .insert([analyticsRecord]);
    
    if (insertError) throw insertError;
    
    console.log('✅ Analysis saved successfully!');
    
  } catch (error) {
    console.error('❌ Error analyzing news insights:', error);
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
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
