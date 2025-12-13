/**
 * 🕸️ ENTITY EXTRACTOR AGENT
 * 
 * Extrae entidades y relaciones de artículos de noticias
 * Construye el Knowledge Graph automáticamente
 */

import { getSupabaseServerClient } from '@/lib/db/supabase';
import { createLLMClientWithFallback, LLMClient } from '@/lib/ai/llm-client';
import { z } from 'zod';

// ============================================
// TYPES
// ============================================

export interface ExtractedEntity {
  name: string;
  type: 'person' | 'organization' | 'model' | 'company' | 'paper' | 'concept';
  description?: string;
  aliases?: string[];
}

export interface ExtractedRelation {
  source: string; // Entity name
  target: string; // Entity name
  type: 'launched' | 'acquired' | 'funded' | 'published' | 'collaborated' | 'competed';
  evidence: string; // Quote from article
}

export interface ExtractionResult {
  entities: ExtractedEntity[];
  relations: ExtractedRelation[];
}

// ============================================
// ENTITY EXTRACTOR CLASS
// ============================================

export class EntityExtractor {
  private db = getSupabaseServerClient();
  private llm: LLMClient | null = null;

  constructor() {
    // LLM client will be initialized lazily in extractFromArticle()
  }

  /**
   * Extrae entidades y relaciones de un artículo
   */
  async extractFromArticle(articleId: string): Promise<ExtractionResult> {
    // Initialize LLM client with multi-provider cloud fallback
    if (!this.llm) {
      this.llm = await createLLMClientWithFallback();
    }

    // Obtener artículo
    const { data: article } = await this.db
      .from('news_articles')
      .select('*')
      .eq('id', articleId)
      .single();

    if (!article) {
      throw new Error(`Article ${articleId} not found`);
    }

    const text = `${article.title_en}\n\n${article.content_en || article.summary_en}`;

    // Extraer con LLM
    const prompt = `Extract AI-related entities and relationships from this news article.

Article:
${text}

Extract:
1. **Entities**: People, companies, AI models, research papers, concepts
2. **Relationships**: How entities are connected (launched, acquired, funded, published, collaborated, competed)

Respond with JSON:
{
  "entities": [
    {
      "name": "Entity name",
      "type": "person" | "organization" | "model" | "company" | "paper" | "concept",
      "description": "Brief description (optional)",
      "aliases": ["alternative names"] (optional)
    }
  ],
  "relations": [
    {
      "source": "Entity A name",
      "target": "Entity B name",
      "type": "launched" | "acquired" | "funded" | "published" | "collaborated" | "competed",
      "evidence": "Quote from article that supports this relationship"
    }
  ]
}

Only extract entities and relations that are clearly mentioned. Be precise.`;

    try {
      const schema = z.object({
        entities: z.array(
          z.object({
            name: z.string(),
            type: z.enum(['person', 'organization', 'model', 'company', 'paper', 'concept']),
            description: z.string().optional(),
            aliases: z.array(z.string()).optional(),
          })
        ),
        relations: z.array(
          z.object({
            source: z.string(),
            target: z.string(),
            type: z.enum(['launched', 'acquired', 'funded', 'published', 'collaborated', 'competed']),
            evidence: z.string(),
          })
        ),
      });

      const result = await this.llm!.classify(prompt, schema);

      return {
        entities: result.entities || [],
        relations: result.relations || [],
      };

    } catch (error) {
      console.error('Failed to extract entities:', error);
      return { entities: [], relations: [] };
    }
  }

  /**
   * Guarda entidades y relaciones en el knowledge graph
   */
  async saveToKnowledgeGraph(
    extraction: ExtractionResult,
    articleId: string
  ): Promise<{ entitiesCreated: number; relationsCreated: number }> {
    let entitiesCreated = 0;
    let relationsCreated = 0;

    const entityIds = new Map<string, string>(); // name -> uuid

    // 1. Guardar entidades
    for (const entity of extraction.entities) {
      // Buscar si ya existe (por nombre o alias)
      const { data: existing } = await this.db
        .from('entities')
        .select('id')
        .eq('name', entity.name)
        .single();

      if (existing) {
        entityIds.set(entity.name, existing.id);
      } else {
        // Crear nueva entidad
        const { data: created, error } = await this.db
          .from('entities')
          .insert({
            name: entity.name,
            type: entity.type,
            description: entity.description || null,
            aliases: entity.aliases || [],
            metadata: { source_article: articleId },
          })
          .select('id')
          .single();

        if (created && !error) {
          entityIds.set(entity.name, created.id);
          entitiesCreated++;
        }
      }
    }

    // 2. Guardar relaciones
    for (const relation of extraction.relations) {
      const sourceId = entityIds.get(relation.source);
      const targetId = entityIds.get(relation.target);

      if (!sourceId || !targetId) {
        console.warn(`Skipping relation: entity not found (${relation.source} -> ${relation.target})`);
        continue;
      }

      // Verificar si la relación ya existe
      const { data: existing } = await this.db
        .from('entity_relations')
        .select('id, weight')
        .eq('source_id', sourceId)
        .eq('target_id', targetId)
        .eq('relation_type', relation.type)
        .single();

      if (existing) {
        // Actualizar peso (incrementar confianza)
        await this.db
          .from('entity_relations')
          .update({
            weight: Math.min(1.0, (existing.weight || 0) + 0.1),
            last_seen: new Date().toISOString(),
          })
          .eq('id', existing.id);
      } else {
        // Crear nueva relación
        const { error } = await this.db
          .from('entity_relations')
          .insert({
            source_id: sourceId,
            target_id: targetId,
            relation_type: relation.type,
            weight: 0.7, // Peso inicial
            evidence: { articles: [articleId], quotes: [relation.evidence] },
          });

        if (!error) {
          relationsCreated++;
        }
      }

      // Guardar citation
      await this.db
        .from('citations')
        .insert({
          article_id: articleId,
          quote: relation.evidence,
          source_url: `article:${articleId}`,
          published_at: new Date().toISOString(),
        });
    }

    return { entitiesCreated, relationsCreated };
  }

  /**
   * Procesa artículos recientes en batch
   */
  async processRecentArticles(limit = 10): Promise<void> {
    console.log(`🕸️ Processing ${limit} recent articles...`);

    const { data: articles } = await this.db
      .from('news_articles')
      .select('id')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!articles || articles.length === 0) {
      console.log('No articles to process');
      return;
    }

    let totalEntities = 0;
    let totalRelations = 0;

    for (const article of articles) {
      try {
        const extraction = await this.extractFromArticle(article.id);
        const { entitiesCreated, relationsCreated } = await this.saveToKnowledgeGraph(
          extraction,
          article.id
        );

        totalEntities += entitiesCreated;
        totalRelations += relationsCreated;

        console.log(`  ✓ ${article.id}: ${entitiesCreated} entities, ${relationsCreated} relations`);

      } catch (error) {
        console.error(`  ✗ ${article.id}: Failed`, error);
      }
    }

    console.log(`✅ Total: ${totalEntities} entities, ${totalRelations} relations created`);
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Ejecuta el entity extractor (llamado desde GitHub Actions o CLI)
 */
export async function runEntityExtractor(limit = 50): Promise<void> {
  const extractor = new EntityExtractor();
  await extractor.processRecentArticles(limit);
}
