import { getSupabaseServerClient } from '@/lib/db/supabase';

export interface SearchParams {
  q?: string;
  categories?: string;
  date?: 'today' | 'week' | 'month' | 'year' | 'all';
  sort?: 'relevance' | 'date' | 'quality' | 'trending';
  quality?: string;
}

export async function searchContent(params: SearchParams, locale: 'en' | 'es') {
  const db = getSupabaseServerClient();

  let query = db
    .from('news_articles')
    .select('*');

  // Text search
  if (params.q) {
    const searchTerm = `%${params.q}%`;
    query = query.or(
      `title_${locale}.ilike.${searchTerm},summary_${locale}.ilike.${searchTerm},content_${locale}.ilike.${searchTerm}`
    );
  }

  // Category filter
  if (params.categories) {
    const categoryList = params.categories.split(',').filter(Boolean);
    if (categoryList.length > 0) {
      query = query.in('category', categoryList);
    }
  }

  // Date range filter
  if (params.date && params.date !== 'all') {
    const now = new Date();
    let startDate: Date;

    switch (params.date) {
      case 'today':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case 'year':
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      default:
        startDate = new Date(0);
    }

    query = query.gte('published_at', startDate.toISOString());
  }

  // Quality filter
  if (params.quality) {
    const minQuality = Number(params.quality);
    if (!isNaN(minQuality) && minQuality > 0) {
      query = query.gte('quality_score', minQuality);
    }
  }

  // Sorting
  switch (params.sort) {
    case 'date':
      query = query.order('published_at', { ascending: false });
      break;
    case 'quality':
      query = query.order('quality_score', { ascending: false });
      break;
    case 'trending':
      // Trending = recent + high engagement (views, ratings)
      query = query
        .gte('published_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('quality_score', { ascending: false });
      break;
    case 'relevance':
    default:
      // Default to quality score for relevance
      query = query.order('quality_score', { ascending: false });
      break;
  }

  // Pagination (default limit)
  query = query.limit(50);

  const { data, error } = await query;

  if (error) {
    console.error('Search error:', error);
    return { articles: [], total: 0 };
  }

  return {
    articles: data || [],
    total: data?.length || 0,
  };
}

export async function getSavedSearches(userId: string) {
  const db = getSupabaseServerClient();

  const { data, error } = await db
    .from('saved_searches')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching saved searches:', error);
    return [];
  }

  return data || [];
}

export async function saveSearch(userId: string, filters: SearchParams, name: string) {
  const db = getSupabaseServerClient();

  const { error } = await db
    .from('saved_searches')
    .insert({
      user_id: userId,
      name,
      filters,
    });

  if (error) {
    console.error('Error saving search:', error);
    return false;
  }

  return true;
}
