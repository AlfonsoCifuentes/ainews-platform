/**
 * FactChecker Agent
 * Cross-source validation with confidence scoring and citations
 */

import { createClient } from '@/lib/db/supabase-server';
import { LLMClient } from '@/lib/ai/llm-client';

export interface FactCheckResult {
  claim: string;
  verdict: 'verified' | 'disputed' | 'unverified' | 'false';
  confidence: number; // 0-100
  sources: Array<{
    title: string;
    url: string;
    relevance: number;
    excerpt: string;
  }>;
  explanation: string;
}

export interface Citation {
  quote: string;
  sourceUrl: string;
  sourceTitle: string;
  publishedAt: string;
  relevance: number;
}

export class FactChecker {
  private llm: LLMClient;

  constructor() {
    this.llm = new LLMClient(
      process.env.GROQ_API_KEY || process.env.OPENROUTER_API_KEY || '',
      process.env.GROQ_API_KEY ? 'https://api.groq.com/openai/v1' : 'https://openrouter.ai/api/v1',
      process.env.GROQ_API_KEY ? 'llama-3.3-70b-versatile' : 'meta-llama/llama-3.1-8b-instruct:free'
    );
  }

  /**
   * Verify a claim against multiple sources
   */
  async checkFact(
    claim: string,
    articleId: string
  ): Promise<FactCheckResult> {
    const supabase = await createClient();

    // Find related articles on same topic
    const { data: originalArticle } = await supabase
      .from('news_articles')
      .select('category, tags, title_en')
      .eq('id', articleId)
      .single();

    if (!originalArticle) {
      throw new Error('Article not found');
    }

    // Get articles from same category
    const { data: relatedArticles } = await supabase
      .from('news_articles')
      .select('id, title_en, content_en, source_url, published_at')
      .eq('category', originalArticle.category)
      .neq('id', articleId)
      .limit(10);

    if (!relatedArticles || relatedArticles.length < 2) {
      return {
        claim,
        verdict: 'unverified',
        confidence: 0,
        sources: [],
        explanation: 'Insufficient sources for verification',
      };
    }

    // Extract relevant excerpts using LLM
    const citations = await this.extractCitations(claim, relatedArticles);

    // Verify claim with LLM
    const verification = await this.verifyWithLLM(claim, citations);

    // Store fact check result
    await this.storeFactCheckResult(articleId, claim, verification);

    return verification;
  }

  /**
   * Extract citations from related articles
   */
  private async extractCitations(
    claim: string,
    articles: Array<{
      id: string;
      title_en: string;
      content_en: string;
      source_url: string;
      published_at: string;
    }>
  ): Promise<Citation[]> {
    const citations: Citation[] = [];

    for (const article of articles) {
      const prompt = `Extract the most relevant quote from this article that relates to the claim: "${claim}"

Article:
${article.content_en.slice(0, 2000)}

Return JSON:
{"quote": "...", "relevance": 0-100}`;

      try {
        const response = await this.llm.generate(prompt, {
          temperature: 0.3,
          maxTokens: 500,
        });

        const jsonMatch = response.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0]);
          
          if (result.relevance > 50) {
            citations.push({
              quote: result.quote,
              sourceUrl: article.source_url,
              sourceTitle: article.title_en,
              publishedAt: article.published_at,
              relevance: result.relevance,
            });
          }
        }
      } catch (error) {
        console.error('Citation extraction failed:', error);
      }
    }

    return citations.sort((a, b) => b.relevance - a.relevance).slice(0, 5);
  }

  /**
   * Verify claim using LLM analysis
   */
  private async verifyWithLLM(
    claim: string,
    citations: Citation[]
  ): Promise<FactCheckResult> {
    const prompt = `Analyze this claim and the supporting/contradicting evidence:

Claim: "${claim}"

Evidence from multiple sources:
${citations.map((c, i) => `
Source ${i + 1} (${c.sourceTitle}):
"${c.quote}"
`).join('\n')}

Provide a fact-check verdict. Return JSON:
{
  "verdict": "verified|disputed|unverified|false",
  "confidence": 0-100,
  "explanation": "..."
}

Base confidence on:
- Number of corroborating sources (${citations.length})
- Consistency across sources
- Source credibility
- Specificity of evidence`;

    try {
      const response = await this.llm.generate(prompt, {
        temperature: 0.2,
        maxTokens: 1000,
      });

      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        
        return {
          claim,
          verdict: result.verdict,
          confidence: result.confidence,
          sources: citations.map(c => ({
            title: c.sourceTitle,
            url: c.sourceUrl,
            relevance: c.relevance,
            excerpt: c.quote,
          })),
          explanation: result.explanation,
        };
      }
    } catch (error) {
      console.error('LLM verification failed:', error);
    }

    return {
      claim,
      verdict: 'unverified',
      confidence: 0,
      sources: [],
      explanation: 'Verification failed due to processing error',
    };
  }

  /**
   * Store fact check result in database
   */
  private async storeFactCheckResult(
    articleId: string,
    claim: string,
    result: FactCheckResult
  ): Promise<void> {
    const supabase = await createClient();

    await supabase.from('fact_checks').insert({
      article_id: articleId,
      claim,
      verdict: result.verdict,
      confidence: result.confidence,
      explanation: result.explanation,
      sources: result.sources,
      created_at: new Date().toISOString(),
    });

    // Log operation
    await supabase.from('ai_system_logs').insert({
      agent_type: 'fact_checker',
      operation: 'check_fact',
      status: 'success',
      metadata: {
        verdict: result.verdict,
        confidence: result.confidence,
        sources_count: result.sources.length,
        timestamp: new Date().toISOString(),
      },
      created_at: new Date().toISOString(),
    });
  }

  /**
   * Batch fact-check all claims in an article
   */
  async checkArticle(articleId: string): Promise<FactCheckResult[]> {
    const supabase = await createClient();

    // Get article content
    const { data: article } = await supabase
      .from('news_articles')
      .select('content_en')
      .eq('id', articleId)
      .single();

    if (!article) {
      throw new Error('Article not found');
    }

    // Extract key claims using LLM
    const claims = await this.extractClaims(article.content_en);

    // Check each claim
    const results: FactCheckResult[] = [];
    for (const claim of claims) {
      const result = await this.checkFact(claim, articleId);
      results.push(result);
    }

    return results;
  }

  /**
   * Extract verifiable claims from article
   */
  private async extractClaims(content: string): Promise<string[]> {
    const prompt = `Extract 3-5 key factual claims from this article that can be verified:

${content.slice(0, 2000)}

Return JSON array:
["claim 1", "claim 2", ...]

Focus on:
- Specific statements about events, announcements, or releases
- Quantifiable metrics or statistics
- Attributed quotes from named individuals
- Concrete technical specifications

Exclude:
- Opinions or subjective statements
- Future predictions
- General background information`;

    try {
      const response = await this.llm.generate(prompt, {
        temperature: 0.3,
        maxTokens: 800,
      });

      const jsonMatch = response.content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Claim extraction failed:', error);
    }

    return [];
  }
}
