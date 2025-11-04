/**
 * Cross-Lingual Embeddings Normalization
 * Phase 5.1 - Category E: LLM/Agents
 * 
 * Features:
 * - Normalize EN/ES embeddings to same vector space
 * - Translation-invariant similarity search
 * - Bilingual content retrieval
 */

import { createClient } from '@/lib/db/supabase-server';

// ============================================================================
// TYPES
// ============================================================================

export interface BilingualEmbedding {
  id: string;
  content_en: string;
  content_es: string;
  embedding_en: number[];
  embedding_es: number[];
  normalized_embedding?: number[];
}

export interface SimilarityResult {
  id: string;
  content_en: string;
  content_es: string;
  similarity: number;
  locale: 'en' | 'es';
}

// ============================================================================
// NORMALIZATION FUNCTIONS
// ============================================================================

/**
 * Normalize a vector to unit length (L2 normalization)
 */
function normalizeVector(vector: number[]): number[] {
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  if (magnitude === 0) return vector;
  return vector.map(val => val / magnitude);
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have same length');
  }

  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));

  if (magnitudeA === 0 || magnitudeB === 0) return 0;
  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Average two embeddings to create a cross-lingual representation
 * This assumes embeddings are from a multilingual model (e.g., multilingual-e5, paraphrase-multilingual)
 */
function crossLingualAverage(
  embeddingEn: number[],
  embeddingEs: number[]
): number[] {
  if (embeddingEn.length !== embeddingEs.length) {
    throw new Error('Embeddings must have same dimensionality');
  }

  // Average the two embeddings
  const averaged = embeddingEn.map((val, i) => (val + embeddingEs[i]) / 2);
  
  // Normalize to unit length
  return normalizeVector(averaged);
}

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

/**
 * Store bilingual content with cross-lingual normalized embedding
 */
export async function storeBilingualEmbedding(
  content: {
    id: string;
    content_en: string;
    content_es: string;
    embedding_en: number[];
    embedding_es: number[];
  }
): Promise<void> {
  const supabase = await createClient();

  // Create cross-lingual normalized embedding
  const normalizedEmbedding = crossLingualAverage(
    content.embedding_en,
    content.embedding_es
  );

  // Store in database
  // Note: This assumes you have a column for normalized_embedding
  await supabase
    .from('bilingual_embeddings')
    .upsert({
      id: content.id,
      content_en: content.content_en,
      content_es: content.content_es,
      embedding_en: content.embedding_en,
      embedding_es: content.embedding_es,
      normalized_embedding: normalizedEmbedding,
      updated_at: new Date().toISOString(),
    });
}

/**
 * Search for similar content across both languages
 */
export async function searchCrossLingual(
  queryEmbedding: number[],
  options: {
    limit?: number;
    threshold?: number;
    preferredLocale?: 'en' | 'es';
  } = {}
): Promise<SimilarityResult[]> {
  const { limit = 10, threshold = 0.7, preferredLocale } = options;
  const supabase = await createClient();

  // Normalize query embedding
  const normalizedQuery = normalizeVector(queryEmbedding);

  // Use Supabase pgvector's cosine similarity
  const { data, error } = await supabase.rpc('match_bilingual_content', {
    query_embedding: normalizedQuery,
    match_threshold: threshold,
    match_count: limit,
  });

  if (error) {
    console.error('Cross-lingual search error:', error);
    return [];
  }

  // Map results with preferred locale
  return (data || []).map((item: { id: string; content_en: string; content_es: string; similarity: number }) => ({
    id: item.id,
    content_en: item.content_en,
    content_es: item.content_es,
    similarity: item.similarity,
    locale: preferredLocale || 'en',
  }));
}

/**
 * Batch normalize existing embeddings
 * Run this as a migration to add normalized_embedding to existing records
 */
export async function batchNormalizeEmbeddings(
  tableName: string = 'news_articles',
  batchSize: number = 100
): Promise<{ processed: number; errors: number }> {
  const supabase = await createClient();
  let processed = 0;
  let errors = 0;
  let offset = 0;

  while (true) {
    // Fetch batch
    const { data: articles, error } = await supabase
      .from(tableName)
      .select('id, embedding_en, embedding_es')
      .not('embedding_en', 'is', null)
      .not('embedding_es', 'is', null)
      .range(offset, offset + batchSize - 1);

    if (error || !articles || articles.length === 0) {
      break;
    }

    // Process batch
    for (const article of articles) {
      try {
        if (article.embedding_en && article.embedding_es) {
          const normalized = crossLingualAverage(
            article.embedding_en,
            article.embedding_es
          );

          await supabase
            .from(tableName)
            .update({ normalized_embedding: normalized })
            .eq('id', article.id);

          processed++;
        }
      } catch (err) {
        console.error(`Error normalizing ${article.id}:`, err);
        errors++;
      }
    }

    offset += batchSize;

    // Prevent infinite loop
    if (articles.length < batchSize) break;
  }

  return { processed, errors };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Compare similarity between EN and ES versions of same content
 * Useful for debugging translation quality
 */
export async function compareTranslationEmbeddings(
  contentId: string
): Promise<{
  enEsDistance: number;
  normalizedQuality: number;
}> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('news_articles')
    .select('embedding_en, embedding_es')
    .eq('id', contentId)
    .single();

  if (!data || !data.embedding_en || !data.embedding_es) {
    throw new Error('Embeddings not found');
  }

  const similarity = cosineSimilarity(data.embedding_en, data.embedding_es);
  
  return {
    enEsDistance: 1 - similarity,
    normalizedQuality: similarity, // Higher = better translation alignment
  };
}

/**
 * Find content that exists in one language but not the other
 */
export async function findMissingTranslations(
  tableName: string = 'news_articles'
): Promise<{
  missingEs: string[];
  missingEn: string[];
}> {
  const supabase = await createClient();

  const { data: missingEs } = await supabase
    .from(tableName)
    .select('id')
    .not('embedding_en', 'is', null)
    .is('embedding_es', null)
    .limit(100);

  const { data: missingEn } = await supabase
    .from(tableName)
    .select('id')
    .not('embedding_es', 'is', null)
    .is('embedding_en', null)
    .limit(100);

  return {
    missingEs: (missingEs || []).map(item => item.id),
    missingEn: (missingEn || []).map(item => item.id),
  };
}

// ============================================================================
// MIGRATION SQL FUNCTION (for Supabase)
// ============================================================================

/**
 * SQL function to create in Supabase for cross-lingual matching
 * 
 * CREATE OR REPLACE FUNCTION match_bilingual_content(
 *   query_embedding vector(1536),
 *   match_threshold float,
 *   match_count int
 * )
 * RETURNS TABLE (
 *   id uuid,
 *   content_en text,
 *   content_es text,
 *   similarity float
 * )
 * LANGUAGE sql STABLE
 * AS $$
 *   SELECT
 *     id,
 *     content_en,
 *     content_es,
 *     1 - (normalized_embedding <=> query_embedding) as similarity
 *   FROM bilingual_embeddings
 *   WHERE 1 - (normalized_embedding <=> query_embedding) > match_threshold
 *   ORDER BY normalized_embedding <=> query_embedding
 *   LIMIT match_count;
 * $$;
 */
