import { getSupabaseServerClient } from '@/lib/db/supabase';

export interface EmbeddingResult {
  id: string;
  similarity: number;
  entity: {
    id: string;
    name: string;
    type: string;
    description?: string;
  };
}

/**
 * Generate embedding using a free/open API or local model
 * For now, returns a mock embedding. In production, use:
 * - HuggingFace Inference API (free tier)
 * - OpenRouter with embedding models
 * - Local ONNX models
 */
export async function generateEmbedding(_text: string): Promise<number[]> {
  // Mock embedding for development
  // TODO: Replace with actual embedding generation
  const dim = 1536;
  const embedding = Array.from({ length: dim }, () => Math.random() * 2 - 1);
  
  // Normalize
  const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  return embedding.map((val) => val / norm);
}

/**
 * Semantic search using pgvector cosine similarity
 */
export async function semanticSearch(
  query: string,
  options: {
    limit?: number;
    threshold?: number;
    type?: string;
  } = {}
): Promise<EmbeddingResult[]> {
  const { limit = 10, threshold = 0.7, type } = options;
  
  try {
    const queryEmbedding = await generateEmbedding(query);
    const db = getSupabaseServerClient();
    
    // Use pgvector's <-> operator for cosine distance
    // Note: 1 - (embedding <-> query) gives similarity
    const rpcQuery = db.rpc('match_entities', {
      query_embedding: queryEmbedding,
      match_threshold: threshold,
      match_count: limit,
    });
    
    const { data, error } = await rpcQuery;
    
    if (error) {
      console.error('Semantic search error:', error);
      return [];
    }
    
    let results = (data || []) as EmbeddingResult[];
    
    // Filter by type if specified
    if (type) {
      results = results.filter((r) => r.entity.type === type);
    }
    
    return results;
  } catch (error) {
    console.error('Embedding generation error:', error);
    return [];
  }
}

/**
 * Hybrid search: combines semantic + keyword
 */
export async function hybridSearch(
  query: string,
  options: {
    limit?: number;
    threshold?: number;
    type?: string;
  } = {}
): Promise<EmbeddingResult[]> {
  const { limit = 10, type } = options;
  
  // Get semantic results
  const semanticResults = await semanticSearch(query, { ...options, limit: limit * 2 });
  
  // Get keyword results
  const db = getSupabaseServerClient();
  let keywordQuery = db
    .from('entities')
    .select('*')
    .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
    .limit(limit);
    
  if (type) {
    keywordQuery = keywordQuery.eq('type', type);
  }
  
  const { data: keywordData } = await keywordQuery;
  
  // Merge and deduplicate
  const seen = new Set<string>();
  const combined: EmbeddingResult[] = [];
  
  for (const item of semanticResults) {
    if (!seen.has(item.entity.id)) {
      seen.add(item.entity.id);
      combined.push(item);
    }
  }
  
  for (const entity of keywordData || []) {
    if (!seen.has(entity.id)) {
      seen.add(entity.id);
      combined.push({
        id: entity.id,
        similarity: 0.5, // Lower score for keyword match
        entity,
      });
    }
  }
  
  // Sort by similarity and limit
  return combined
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}
