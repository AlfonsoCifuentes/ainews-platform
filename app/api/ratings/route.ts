import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerAuthUser } from '@/lib/auth/auth-config';
import { getSupabaseServerClient } from '@/lib/db/supabase';

const RatingSchema = z.object({
  articleId: z.string(),
  rating: z.number().min(1).max(5),
});

/**
 * POST /api/ratings
 * Rates an article (1-5 stars)
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getServerAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { articleId, rating } = RatingSchema.parse(body);

    const db = getSupabaseServerClient();

    // Check if already rated
    const { data: existing } = await db
      .from('user_article_ratings')
      .select('id, rating')
      .eq('user_id', user.id)
      .eq('article_id', articleId)
      .single();

    let data;
    let error;

    if (existing) {
      // Update existing rating
      ({ data, error } = await db
        .from('user_article_ratings')
        .update({
          rating,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single());
    } else {
      // Create new rating
      ({ data, error } = await db
        .from('user_article_ratings')
        .insert({
          user_id: user.id,
          article_id: articleId,
          rating,
        })
        .select()
        .single());
    }

    if (error) {
      console.error('Rating error:', error);
      return NextResponse.json(
        { error: 'Failed to rate article' },
        { status: 500 }
      );
    }

    // Get updated average rating
    const { data: avgData } = await db
      .from('user_article_ratings')
      .select('rating')
      .eq('article_id', articleId);

    const avgRating = avgData?.length
      ? avgData.reduce((sum, r) => sum + r.rating, 0) / avgData.length
      : 0;

    return NextResponse.json({
      success: true,
      rating: data,
      averageRating: Math.round(avgRating * 10) / 10,
      totalRatings: avgData?.length || 0,
      message: existing ? 'Rating updated' : 'Article rated successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Rating API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ratings?articleId=xxx
 * Gets rating info for an article
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getServerAuthUser();
    const { searchParams } = new URL(req.url);
    const articleId = searchParams.get('articleId');

    if (!articleId) {
      return NextResponse.json(
        { error: 'articleId is required' },
        { status: 400 }
      );
    }

    const db = getSupabaseServerClient();

    // Get all ratings for article
    const { data: ratings } = await db
      .from('user_article_ratings')
      .select('rating')
      .eq('article_id', articleId);

    const avgRating = ratings?.length
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
      : 0;

    // Get user's rating if authenticated
    let userRating = null;
    if (user) {
      const { data } = await db
        .from('user_article_ratings')
        .select('rating')
        .eq('user_id', user.id)
        .eq('article_id', articleId)
        .single();

      userRating = data?.rating || null;
    }

    return NextResponse.json({
      averageRating: Math.round(avgRating * 10) / 10,
      totalRatings: ratings?.length || 0,
      userRating,
    });
  } catch (error) {
    console.error('Get rating API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
