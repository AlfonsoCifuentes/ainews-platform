/**
 * AI Personalization Engine
 * Provides personalized content recommendations using embeddings and user behavior
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface UserInterest {
  user_id: string;
  content_type: 'article' | 'course';
  content_id: string;
  interaction_type: 'view' | 'like' | 'bookmark' | 'complete' | 'search';
  interaction_strength: number;
  created_at: string;
}

interface RecommendationOptions {
  user_id: string;
  content_type: 'article' | 'course';
  limit?: number;
  exclude_seen?: boolean;
  diversity_factor?: number;
}

interface Recommendation {
  content_id: string;
  score: number;
  reasoning: string[];
  content: Record<string, unknown>;
}

export class PersonalizationEngine {
  /**
   * Track user interaction with content
   */
  async trackInteraction(
    userId: string,
    contentType: 'article' | 'course',
    contentId: string,
    interactionType: UserInterest['interaction_type']
  ) {
    const strengthMap = {
      view: 1,
      like: 3,
      bookmark: 4,
      complete: 5,
      search: 2
    };

    try {
      await supabase.from('user_interests').insert({
        user_id: userId,
        content_type: contentType,
        content_id: contentId,
        interaction_type: interactionType,
        interaction_strength: strengthMap[interactionType],
        created_at: new Date().toISOString()
      });

      console.log(`[Personalization] Tracked ${interactionType} for user ${userId}`);
    } catch (error) {
      console.error('[Personalization] Error tracking interaction:', error);
    }
  }

  /**
   * Get user's interest profile (aggregated)
   */
  async getUserProfile(userId: string) {
    try {
      const { data: interests, error } = await supabase
        .from('user_interests')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Calculate category preferences
      const categoryScores: Record<string, number> = {};
      const topicScores: Record<string, number> = {};

      for (const interest of interests || []) {
        // Get content metadata
        const table = interest.content_type === 'article' ? 'news_articles' : 'courses';
        const { data: content } = await supabase
          .from(table)
          .select('category, tags')
          .eq('id', interest.content_id)
          .single();

        if (content) {
          // Weight by interaction strength and recency
          const ageInDays = (Date.now() - new Date(interest.created_at).getTime()) / (1000 * 60 * 60 * 24);
          const recencyWeight = Math.exp(-ageInDays / 30); // Exponential decay
          const score = interest.interaction_strength * recencyWeight;

          categoryScores[content.category] = (categoryScores[content.category] || 0) + score;

          if (content.tags) {
            for (const tag of content.tags) {
              topicScores[tag] = (topicScores[tag] || 0) + score;
            }
          }
        }
      }

      return {
        userId,
        interactionCount: interests?.length || 0,
        topCategories: Object.entries(categoryScores)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([category, score]) => ({ category, score })),
        topTopics: Object.entries(topicScores)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .map(([topic, score]) => ({ topic, score }))
      };
    } catch (error) {
      console.error('[Personalization] Error getting user profile:', error);
      return null;
    }
  }

  /**
   * Generate personalized recommendations
   */
  async getRecommendations(options: RecommendationOptions): Promise<Recommendation[]> {
    const { user_id, content_type, limit = 10, exclude_seen = true, diversity_factor = 0.3 } = options;

    try {
      // Get user profile
      const profile = await this.getUserProfile(user_id);
      if (!profile || profile.interactionCount === 0) {
        // Cold start: return trending content
        return this.getTrendingContent(content_type, limit);
      }

      // Strategy 1: Content-based filtering (60% weight)
      const contentBased = await this.getContentBasedRecommendations(user_id, content_type, profile);

      // Strategy 2: Collaborative filtering (30% weight)
      const collaborative = await this.getCollaborativeRecommendations(user_id, content_type);

      // Strategy 3: Trending/New content (10% weight for diversity)
      const trending = await this.getTrendingContent(content_type, Math.ceil(limit * diversity_factor));

      // Merge strategies
      const allRecs = [
        ...contentBased.map((r) => ({ ...r, weight: 0.6 })),
        ...collaborative.map((r) => ({ ...r, weight: 0.3 })),
        ...trending.map((r) => ({ ...r, weight: 0.1 }))
      ];

      // Aggregate scores
      const scoreMap = new Map<string, { score: number; reasoning: string[]; content: Record<string, unknown> }>();

      for (const rec of allRecs) {
        const existing = scoreMap.get(rec.content_id);
        if (existing) {
          existing.score += rec.score * rec.weight;
          existing.reasoning.push(...rec.reasoning);
        } else {
          scoreMap.set(rec.content_id, {
            score: rec.score * rec.weight,
            reasoning: rec.reasoning,
            content: rec.content
          });
        }
      }

      // Exclude seen content if requested
      if (exclude_seen) {
        const { data: seen } = await supabase
          .from('user_interests')
          .select('content_id')
          .eq('user_id', user_id)
          .eq('content_type', content_type);

        const seenIds = new Set(seen?.map((s) => s.content_id) || []);
        for (const id of seenIds) {
          scoreMap.delete(id);
        }
      }

      // Sort and return top N
      const sorted = Array.from(scoreMap.entries())
        .sort(([, a], [, b]) => b.score - a.score)
        .slice(0, limit)
        .map(([content_id, data]) => ({
          content_id,
          score: data.score,
          reasoning: [...new Set(data.reasoning)], // Remove duplicates
          content: data.content
        }));

      return sorted;
    } catch (error) {
      console.error('[Personalization] Error generating recommendations:', error);
      return [];
    }
  }

  /**
   * Content-based filtering using embeddings
   */
  private async getContentBasedRecommendations(
    _userId: string,
    contentType: 'article' | 'course',
    profile: Awaited<ReturnType<typeof this.getUserProfile>>
  ): Promise<Recommendation[]> {
    if (!profile) return [];

    const table = contentType === 'article' ? 'news_articles' : 'courses';
    const recommendations: Recommendation[] = [];

    // Get user's top interests
    const topCategories = profile.topCategories.slice(0, 3).map((c) => c.category);

    // Find similar content in those categories
    const { data: content } = await supabase
      .from(table)
      .select('*')
      .in('category', topCategories)
      .order('published_at', { ascending: false })
      .limit(20);

    for (const item of content || []) {
      const reasoning = [];
      let score = 0;

      // Category match
      const categoryMatch = profile.topCategories.find((c) => c.category === item.category);
      if (categoryMatch) {
        score += categoryMatch.score;
        reasoning.push(`Matches your interest in ${item.category}`);
      }

      // Topic/tag match
      if (item.tags) {
        for (const tag of item.tags) {
          const topicMatch = profile.topTopics.find((t) => t.topic === tag);
          if (topicMatch) {
            score += topicMatch.score * 0.5;
            reasoning.push(`Related to ${tag}`);
          }
        }
      }

      if (score > 0) {
        recommendations.push({
          content_id: item.id,
          score,
          reasoning,
          content: item
        });
      }
    }

    return recommendations;
  }

  /**
   * Collaborative filtering (users like you also liked...)
   */
  private async getCollaborativeRecommendations(
    userId: string,
    contentType: 'article' | 'course'
  ): Promise<Recommendation[]> {
    try {
      // Find users with similar interests
      const { data: userInterests } = await supabase
        .from('user_interests')
        .select('content_id')
        .eq('user_id', userId)
        .eq('content_type', contentType)
        .limit(20);

      const userContentIds = userInterests?.map((i) => i.content_id) || [];

      // Find other users who interacted with same content
      const { data: similarUsers } = await supabase
        .from('user_interests')
        .select('user_id')
        .in('content_id', userContentIds)
        .neq('user_id', userId)
        .limit(50);

      const similarUserIds = [...new Set(similarUsers?.map((u) => u.user_id) || [])];

      if (similarUserIds.length === 0) return [];

      // Get what those users liked
      const { data: recommendations } = await supabase
        .from('user_interests')
        .select('content_id, interaction_strength')
        .in('user_id', similarUserIds)
        .eq('content_type', contentType)
        .gte('interaction_strength', 3); // Only likes, bookmarks, completions

      // Aggregate scores
      const scoreMap = new Map<string, number>();
      for (const rec of recommendations || []) {
        scoreMap.set(rec.content_id, (scoreMap.get(rec.content_id) || 0) + rec.interaction_strength);
      }

      // Get content details
      const table = contentType === 'article' ? 'news_articles' : 'courses';
      const topIds = Array.from(scoreMap.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([id]) => id);

      const { data: content } = await supabase.from(table).select('*').in('id', topIds);

      return (
        content?.map((item) => ({
          content_id: item.id,
          score: scoreMap.get(item.id) || 0,
          reasoning: ['Popular with users like you'],
          content: item
        })) || []
      );
    } catch (error) {
      console.error('[Personalization] Collaborative filtering error:', error);
      return [];
    }
  }

  /**
   * Get trending content (fallback for cold start)
   */
  private async getTrendingContent(
    contentType: 'article' | 'course',
    limit: number
  ): Promise<Recommendation[]> {
    const table = contentType === 'article' ? 'news_articles' : 'courses';

    const { data: content } = await supabase
      .from(table)
      .select('*')
      .order('views', { ascending: false })
      .order('published_at', { ascending: false })
      .limit(limit);

    return (
      content?.map((item) => ({
        content_id: item.id,
        score: item.views || 0,
        reasoning: ['Trending now'],
        content: item
      })) || []
    );
  }

  /**
   * Explain why content was recommended
   */
  explainRecommendation(recommendation: Recommendation): string {
    const reasons = recommendation.reasoning;
    if (reasons.length === 0) return 'Recommended for you';

    if (reasons.length === 1) return reasons[0];

    if (reasons.length === 2) return `${reasons[0]} and ${reasons[1]}`;

    return `${reasons.slice(0, -1).join(', ')}, and ${reasons[reasons.length - 1]}`;
  }
}

export const personalizationEngine = new PersonalizationEngine();
