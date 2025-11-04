import { getSupabaseServerClient } from '@/lib/db/supabase';
import { generateWithRetry } from './retry-orchestration';

interface FactCheckResult {
  claim: string;
  verdict: 'true' | 'false' | 'misleading' | 'unverified' | 'needs-context';
  confidence: number;
  evidence: Array<{
    citationId?: string;
    source: string;
    quote: string;
    supportsClaim: boolean;
  }>;
  reasoning: string;
}

/**
 * Fact-checking agent for verifying claims in Knowledge Graph
 * Now uses retry orchestration for improved reliability
 */
export class FactChecker {
  private db = getSupabaseServerClient();

  constructor() {
    // Now uses generateWithRetry instead of direct LLM client
  }

  /**
   * Verify a claim about an entity
   */
  async checkEntityClaim(entityId: string, claim: string): Promise<FactCheckResult> {
    // Get entity and related citations
    const { data: entity } = await this.db
      .from('entities')
      .select('*')
      .eq('id', entityId)
      .single();

    if (!entity) {
      throw new Error('Entity not found');
    }

    const { data: citations } = await this.db
      .from('citations')
      .select('*')
      .eq('entity_id', entityId)
      .order('confidence_score', { ascending: false })
      .limit(10);

    // Use LLM with retry orchestration to analyze claim against citations
    const systemPrompt = 'You are a fact-checking AI. Verify claims against available evidence and respond in JSON format.';
    
    const userPrompt = `Verify the following claim about "${entity.name}":

Claim: ${claim}

Available evidence:
${(citations || []).map((c, i) => `${i + 1}. Source: ${c.source_url}
   Quote: "${c.quote}"
   Confidence: ${c.confidence_score}
`).join('\n')}

Analyze the claim and provide:
1. Verdict: true, false, misleading, unverified, or needs-context
2. Confidence: 0.0-1.0
3. Reasoning: Brief explanation

Respond in JSON format:
{
  "verdict": "true|false|misleading|unverified|needs-context",
  "confidence": 0.0-1.0,
  "reasoning": "...",
  "supportingCitations": [citation indices that support the verdict]
}`;

    const response = await generateWithRetry({
      systemPrompt,
      userPrompt,
      enableCache: true, // Cache system prompt across fact-checks
    });
    
    try {
      const result = JSON.parse(response.content);
      
      const evidence = (result.supportingCitations || []).map((idx: number) => {
        const citation = citations?.[idx - 1];
        return citation ? {
          citationId: citation.id,
          source: citation.source_url,
          quote: citation.quote,
          supportsClaim: true,
        } : null;
      }).filter(Boolean);

      return {
        claim,
        verdict: result.verdict,
        confidence: result.confidence,
        evidence,
        reasoning: result.reasoning,
      };
    } catch {
      // Fallback if LLM doesn't return valid JSON
      return {
        claim,
        verdict: 'unverified',
        confidence: 0,
        evidence: [],
        reasoning: 'Failed to parse fact-check result',
      };
    }
  }

  /**
   * Verify a relation between two entities
   */
  async checkRelation(relationId: string): Promise<FactCheckResult> {
    const { data: relation } = await this.db
      .from('entity_relations')
      .select('*')
      .eq('id', relationId)
      .single();

    if (!relation) {
      throw new Error('Relation not found');
    }

    // Get source and target entities
    const [sourceRes, targetRes] = await Promise.all([
      this.db.from('entities').select('name').eq('id', relation.source_id).single(),
      this.db.from('entities').select('name').eq('id', relation.target_id).single(),
    ]);

    const sourceName = sourceRes.data?.name || relation.source_id;
    const targetName = targetRes.data?.name || relation.target_id;

    const claim = `${sourceName} ${relation.rel_type} ${targetName}`;

    // Get citations for this relation
    const { data: citations } = await this.db
      .from('citations')
      .select('*')
      .eq('relation_id', relationId);

    // Use LLM with retry orchestration to verify
    const systemPrompt = 'You are a fact-checking AI. Verify claims against evidence and respond in JSON format.';
    
    const userPrompt = `Verify the following claim:

${claim}

Evidence:
${(citations || []).map((c, i) => `${i + 1}. ${c.quote} (${c.source_url})`).join('\n')}

Provide verdict (true/false/misleading/unverified/needs-context), confidence (0-1), and reasoning.
Format: JSON
{
  "verdict": "...",
  "confidence": 0.0-1.0,
  "reasoning": "..."
}`;

    const response = await generateWithRetry({
      systemPrompt,
      userPrompt,
      enableCache: true,
    });
    
    try {
      const result = JSON.parse(response.content);
      return {
        claim,
        verdict: result.verdict,
        confidence: result.confidence,
        evidence: (citations || []).map((c) => ({
          citationId: c.id,
          source: c.source_url,
          quote: c.quote,
          supportsClaim: true,
        })),
        reasoning: result.reasoning,
      };
    } catch {
      return {
        claim,
        verdict: 'unverified',
        confidence: 0,
        evidence: [],
        reasoning: 'Failed to verify',
      };
    }
  }

  /**
   * Store fact-check result
   */
  async storeFactCheckResult(
    result: FactCheckResult,
    entityId?: string,
    relationId?: string
  ) {
    const { error } = await this.db.from('fact_checks').insert({
      entity_id: entityId || null,
      relation_id: relationId || null,
      claim: result.claim,
      verdict: result.verdict,
      confidence: result.confidence,
      evidence: {
        citations: result.evidence.map((e) => e.citationId).filter(Boolean),
        reasoning: result.reasoning,
      },
      checked_by: 'ai-fact-checker',
    });

    if (error) throw error;
  }

  /**
   * Batch fact-check all entities without verification
   */
  async batchCheckEntities(limit = 50) {
    const { data: entities } = await this.db
      .from('entities')
      .select('id, name, description')
      .limit(limit);

    if (!entities) return;

    for (const entity of entities) {
      if (!entity.description) continue;
      
      try {
        const result = await this.checkEntityClaim(entity.id, entity.description);
        await this.storeFactCheckResult(result, entity.id);
      } catch (error) {
        console.error(`Failed to check entity ${entity.id}:`, error);
      }
    }
  }
}
