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

export interface ArticleEmbeddingResult {
  id: string;
  title_en: string;
  title_es: string;
  content_en: string;
  content_es: string;
  summary_en?: string;
  summary_es?: string;
  category: string;
  image_url?: string;
  published_at: string;
  similarity: number;
}

/**
 * Generate embedding using OpenRouter API
 * Uses OpenAI's text-embedding-ada-002 model via OpenRouter
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  
  if (!apiKey) {
    console.warn('[Embeddings] OPENROUTER_API_KEY not configured, skipping embedding generation');
    return null;
  }
  
  if (!text || text.trim().length === 0) {
    console.warn('[Embeddings] Empty text provided');
    return null;
  }
  
  try {
    const response = await fetch('https://openrouter.ai/api/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'https://ainews.app',
        'X-Title': 'AINews Platform'
      },
      body: JSON.stringify({
        model: 'openai/text-embedding-ada-002',
        input: text.slice(0, 8000) // Limit to 8k chars to avoid token limits
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Embeddings] API request failed:', response.status, errorText);
      return null;
    }
    
    const data = await response.json();
    const embedding = data?.data?.[0]?.embedding;
    
    if (!Array.isArray(embedding) || embedding.length !== 1536) {
      console.error('[Embeddings] Invalid embedding response format');
      return null;
    }
    
    return embedding as number[];
  } catch (error) {
    console.error('[Embeddings] Failed to generate embedding:', error);
    return null;
  }
}

/**
 * Semantic search for articles using pgvector cosine similarity
 */
export async function searchArticles(
  query: string,
  options: {
    limit?: number;
    threshold?: number;
    category?: string;
  } = {}
): Promise<ArticleEmbeddingResult[]> {
  const { limit = 10, threshold = 0.75, category } = options;
  
  try {
    const queryEmbedding = await generateEmbedding(query);
    
    if (!queryEmbedding) {
      return [];
    }
    
    const db = getSupabaseServerClient();
    
    const { data, error } = await db.rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_threshold: threshold,
      match_count: limit
    });
    
    if (error) {
      console.error('[Embeddings] Semantic search error:', error);
      return [];
    }
    
    let results = (data || []) as ArticleEmbeddingResult[];
    
    // Filter by category if specified
    if (category && category !== 'all') {
      results = results.filter((r) => r.category === category);
    }
    
    return results;
  } catch (error) {
    console.error('[Embeddings] Search failed:', error);
    return [];
  }
}

/**
 * Find related articles using similarity
 */
export async function findRelatedArticles(
  articleId: string,
  limit: number = 5
): Promise<ArticleEmbeddingResult[]> {
  try {
    const db = getSupabaseServerClient();
    
    const { data, error } = await db.rpc('find_related_articles', {
      article_id: articleId,
      match_count: limit
    });
    
    if (error) {
      console.error('[Embeddings] Related articles error:', error);
      return [];
    }
    
    return (data || []) as ArticleEmbeddingResult[];
  } catch (error) {
    console.error('[Embeddings] Find related failed:', error);
    return [];
  }
}

/**
 * Semantic search for entities (Knowledge Graph)
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
    
    if (!queryEmbedding) {
      return [];
    }
    
    const db = getSupabaseServerClient();
    
    const { data, error } = await db.rpc('match_entities', {
      query_embedding: queryEmbedding,
      match_threshold: threshold,
      match_count: limit,
    });
    
    if (error) {
      console.error('[Embeddings] Entity search error:', error);
      return [];
    }
    
    let results = (data || []) as EmbeddingResult[];
    
    // Filter by type if specified
    if (type) {
      results = results.filter((r) => r.entity.type === type);
    }
    
    return results;
  } catch (error) {
    console.error('[Embeddings] Entity search failed:', error);
    return [];
  }
}

/**
 * Store embedding for content
 */
export async function storeEmbedding(
  contentId: string,
  contentType: 'article' | 'course' | 'entity',
  text: string,
  metadata: Record<string, unknown> = {}
): Promise<boolean> {
  try {
    const embedding = await generateEmbedding(text);
    
    if (!embedding) {
      console.warn('[Embeddings] Failed to generate embedding for', contentId);
      return false;
    }
    
    const db = getSupabaseServerClient();
    
    const { error } = await db
      .from('content_embeddings')
      .upsert({
        content_id: contentId,
        content_type: contentType,
        embedding,
        metadata
      }, {
        onConflict: 'content_id,content_type'
      });
    
    if (error) {
      console.error('[Embeddings] Store error:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('[Embeddings] Store failed:', error);
    return false;
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
