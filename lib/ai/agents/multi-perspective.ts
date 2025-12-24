/**
 * MultiPerspective Summarizer
 * Generate comparative summaries from multiple sources/perspectives
 */

import { getSupabaseServerClient } from '@/lib/db/supabase';
import { LLMClient } from '@/lib/ai/llm-client';

export interface PerspectiveSummary {
  topic: string;
  perspectives: Array<{
    source: string;
    region: string;
    company: string;
    viewpoint: string;
    keyPoints: string[];
  }>;
  consensus: string[];
  disagreements: string[];
  synthesizedSummary: string;
  createdAt: string;
}

export class MultiPerspectiveSummarizer {
  private llm: LLMClient;

  constructor() {
    this.llm = new LLMClient(
      process.env.GROQ_API_KEY || process.env.OPENROUTER_API_KEY || '',
      process.env.GROQ_API_KEY ? 'https://api.groq.com/openai/v1' : 'https://openrouter.ai/api/v1',
      process.env.GROQ_API_KEY ? 'llama-3.3-70b-versatile' : 'meta-llama/llama-3.1-8b-instruct:free'
    );
  }

  /**
   * Generate multi-perspective summary for a topic
   */
  async generateSummary(topic: string): Promise<PerspectiveSummary> {
    const supabase = getSupabaseServerClient();

    // Find articles related to topic
    const { data: articles } = await supabase
      .from('news_articles')
      .select('id, title_en, content_en, source_url, tags, category')
      .or(`title_en.ilike.%${topic}%,content_en.ilike.%${topic}%`)
      .order('published_at', { ascending: false })
      .limit(20);

    if (!articles || articles.length < 3) {
      throw new Error('Insufficient articles for multi-perspective analysis');
    }

    // Group by source/region/company
    const perspectives = await this.extractPerspectives(topic, articles);

    // Find consensus and disagreements
    const analysis = await this.analyzeConsensus(perspectives);

    // Generate synthesized summary
    const synthesized = await this.synthesizeSummary(topic, perspectives, analysis);

    const result: PerspectiveSummary = {
      topic,
      perspectives,
      consensus: analysis.consensus,
      disagreements: analysis.disagreements,
      synthesizedSummary: synthesized,
      createdAt: new Date().toISOString(),
    };

    // Store summary
    await this.storeSummary(result);

    return result;
  }

  /**
   * Extract different perspectives from articles
   */
  private async extractPerspectives(
    topic: string,
    articles: Array<{
      id: string;
      title_en: string;
      content_en: string;
      source_url: string;
    }>
  ): Promise<PerspectiveSummary['perspectives']> {
    const perspectives: PerspectiveSummary['perspectives'] = [];

    for (const article of articles.slice(0, 8)) {
      const prompt = `Extract the perspective on "${topic}" from this article:

${article.content_en.slice(0, 1500)}

Return JSON:
{
  "source": "Source name (e.g., TechCrunch, The Verge)",
  "region": "Geographic region (e.g., US, EU, Asia)",
  "company": "Company focus if applicable (e.g., OpenAI, Google, Microsoft)",
  "viewpoint": "One sentence summary of their stance",
  "keyPoints": ["point 1", "point 2", "point 3"]
}`;

      try {
        const response = await this.llm.generate(prompt, {
          temperature: 0.3,
          maxTokens: 600,
        });

        const jsonMatch = response.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const perspective = JSON.parse(jsonMatch[0]);
          perspectives.push(perspective);
        }
      } catch (error) {
        console.error('Perspective extraction failed:', error);
      }
    }

    return perspectives;
  }

  /**
   * Analyze consensus and disagreements across perspectives
   */
  private async analyzeConsensus(
    perspectives: PerspectiveSummary['perspectives']
  ): Promise<{
    consensus: string[];
    disagreements: string[];
  }> {
    const prompt = `Analyze these perspectives and identify consensus points and disagreements:

${perspectives.map((p, i) => `
Perspective ${i + 1} (${p.source}):
Viewpoint: ${p.viewpoint}
Key Points:
${p.keyPoints.map(kp => `- ${kp}`).join('\n')}
`).join('\n')}

Return JSON:
{
  "consensus": ["point all/most agree on", ...],
  "disagreements": ["area of disagreement", ...]
}`;

    try {
      const response = await this.llm.generate(prompt, {
        temperature: 0.2,
        maxTokens: 800,
      });

      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Consensus analysis failed:', error);
    }

    return {
      consensus: [],
      disagreements: [],
    };
  }

  /**
   * Synthesize a balanced summary from all perspectives
   */
  private async synthesizeSummary(
    topic: string,
    perspectives: PerspectiveSummary['perspectives'],
    analysis: { consensus: string[]; disagreements: string[] }
  ): Promise<string> {
    const prompt = `Create a balanced, synthesized summary about "${topic}" incorporating all perspectives:

Perspectives: ${perspectives.length}
Consensus Points:
${analysis.consensus.map(c => `- ${c}`).join('\n')}

Disagreements:
${analysis.disagreements.map(d => `- ${d}`).join('\n')}

Generate a 150-200 word summary that:
1. Starts with consensus points
2. Acknowledges different viewpoints fairly
3. Highlights key areas of debate
4. Maintains objectivity
5. Provides balanced context`;

    try {
      const response = await this.llm.generate(prompt, {
        temperature: 0.4,
        maxTokens: 500,
      });

      return response.content.trim();
    } catch (error) {
      console.error('Summary synthesis failed:', error);
      return 'Failed to generate synthesized summary';
    }
  }

  /**
   * Store multi-perspective summary
   */
  private async storeSummary(summary: PerspectiveSummary): Promise<void> {
    const supabase = getSupabaseServerClient();

    await supabase.from('perspective_summaries').insert({
      topic: summary.topic,
      perspectives: summary.perspectives,
      consensus: summary.consensus,
      disagreements: summary.disagreements,
      synthesized_summary: summary.synthesizedSummary,
      created_at: summary.createdAt,
    });

    // Log operation
    await supabase.from('ai_system_logs').insert({
      agent_type: 'multi_perspective',
      operation: 'generate_summary',
      status: 'success',
      metadata: {
        topic: summary.topic,
        perspectives_count: summary.perspectives.length,
        consensus_points: summary.consensus.length,
        timestamp: new Date().toISOString(),
      },
      created_at: new Date().toISOString(),
    });
  }

  /**
   * Compare perspectives by region
   */
  async compareByRegion(topic: string): Promise<Record<string, string[]>> {
    const summary = await this.generateSummary(topic);
    
    const byRegion: Record<string, string[]> = {};
    
    summary.perspectives.forEach(p => {
      if (!byRegion[p.region]) {
        byRegion[p.region] = [];
      }
      byRegion[p.region].push(p.viewpoint);
    });

    return byRegion;
  }

  /**
   * Compare perspectives by company
   */
  async compareByCompany(topic: string): Promise<Record<string, string[]>> {
    const summary = await this.generateSummary(topic);
    
    const byCompany: Record<string, string[]> = {};
    
    summary.perspectives.forEach(p => {
      if (p.company && p.company !== 'N/A') {
        if (!byCompany[p.company]) {
          byCompany[p.company] = [];
        }
        byCompany[p.company].push(p.viewpoint);
      }
    });

    return byCompany;
  }
}
