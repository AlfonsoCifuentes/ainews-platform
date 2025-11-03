import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthUser } from '@/lib/auth/auth-config';
import { getSupabaseServerClient } from '@/lib/db/supabase';

/**
 * POST /api/comments/react
 * Toggles a reaction on a comment
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getServerAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const commentId = searchParams.get('commentId');

    if (!commentId) {
      return NextResponse.json(
        { error: 'Comment ID is required' },
        { status: 400 }
      );
    }

    const db = getSupabaseServerClient();

    // Check if already reacted
    const { data: existing } = await db
      .from('comment_reactions')
      .select('id')
      .eq('comment_id', commentId)
      .eq('user_id', user.id)
      .single();

    if (existing) {
      // Remove reaction
      const { error } = await db
        .from('comment_reactions')
        .delete()
        .eq('id', existing.id);

      if (error) {
        console.error('Remove reaction error:', error);
        return NextResponse.json(
          { error: 'Failed to remove reaction' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        action: 'removed',
        message: 'Reaction removed',
      });
    } else {
      // Add reaction
      const { error } = await db.from('comment_reactions').insert({
        comment_id: commentId,
        user_id: user.id,
        reaction_type: 'like',
      });

      if (error) {
        console.error('Add reaction error:', error);
        return NextResponse.json(
          { error: 'Failed to add reaction' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        action: 'added',
        message: 'Reaction added',
      });
    }
  } catch (error) {
    console.error('React API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
