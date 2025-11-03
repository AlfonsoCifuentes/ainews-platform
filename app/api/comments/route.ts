import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthUser } from '@/lib/auth/auth-config';
import { getSupabaseServerClient } from '@/lib/db/supabase';
import { z } from 'zod';

const CreateCommentSchema = z.object({
  articleId: z.string().uuid().optional(),
  courseId: z.string().uuid().optional(),
  parentCommentId: z.string().uuid().optional(),
  content: z.string().min(1).max(5000),
});

const UpdateCommentSchema = z.object({
  content: z.string().min(1).max(5000),
});

/**
 * POST /api/comments
 * Creates a new comment
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getServerAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { articleId, courseId, parentCommentId, content } = CreateCommentSchema.parse(body);

    // Must have either articleId or courseId
    if (!articleId && !courseId) {
      return NextResponse.json(
        { error: 'Either articleId or courseId is required' },
        { status: 400 }
      );
    }

    const db = getSupabaseServerClient();

    const { data, error } = await db
      .from('comments')
      .insert({
        user_id: user.id,
        article_id: articleId || null,
        course_id: courseId || null,
        parent_comment_id: parentCommentId || null,
        content: content.trim(),
      })
      .select(`
        *,
        user_profiles (
          id,
          display_name,
          avatar_url
        )
      `)
      .single();

    if (error) {
      console.error('Create comment error:', error);
      return NextResponse.json(
        { error: 'Failed to create comment' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      comment: data,
      message: 'Comment created successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Comments API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/comments?articleId=xxx or ?courseId=xxx
 * Gets comments for an article or course
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const articleId = searchParams.get('articleId');
    const courseId = searchParams.get('courseId');

    if (!articleId && !courseId) {
      return NextResponse.json(
        { error: 'Either articleId or courseId is required' },
        { status: 400 }
      );
    }

    const db = getSupabaseServerClient();

    let query = db
      .from('comments')
      .select(`
        *,
        user_profiles (
          id,
          display_name,
          avatar_url
        ),
        comment_reactions (
          id,
          reaction_type,
          user_id
        )
      `)
      .is('parent_comment_id', null)
      .order('created_at', { ascending: false });

    if (articleId) {
      query = query.eq('article_id', articleId);
    } else {
      query = query.eq('course_id', courseId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Get comments error:', error);
      return NextResponse.json(
        { error: 'Failed to get comments' },
        { status: 500 }
      );
    }

    // Fetch replies for each top-level comment
    const commentsWithReplies = await Promise.all(
      (data || []).map(async (comment) => {
        const { data: replies } = await db
          .from('comments')
          .select(`
            *,
            user_profiles (
              id,
              display_name,
              avatar_url
            ),
            comment_reactions (
              id,
              reaction_type,
              user_id
            )
          `)
          .eq('parent_comment_id', comment.id)
          .order('created_at', { ascending: true });

        return {
          ...comment,
          replies: replies || [],
        };
      })
    );

    return NextResponse.json({ comments: commentsWithReplies });
  } catch (error) {
    console.error('Get comments API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/comments/:id
 * Updates a comment
 */
export async function PATCH(req: NextRequest) {
  try {
    const user = await getServerAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const commentId = searchParams.get('id');

    if (!commentId) {
      return NextResponse.json(
        { error: 'Comment ID is required' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { content } = UpdateCommentSchema.parse(body);

    const db = getSupabaseServerClient();

    const { data, error } = await db
      .from('comments')
      .update({
        content: content.trim(),
        is_edited: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', commentId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Update comment error:', error);
      return NextResponse.json(
        { error: 'Failed to update comment' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      comment: data,
      message: 'Comment updated successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Update comment API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/comments?id=xxx
 * Deletes a comment
 */
export async function DELETE(req: NextRequest) {
  try {
    const user = await getServerAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const commentId = searchParams.get('id');

    if (!commentId) {
      return NextResponse.json(
        { error: 'Comment ID is required' },
        { status: 400 }
      );
    }

    const db = getSupabaseServerClient();

    const { error } = await db
      .from('comments')
      .delete()
      .eq('id', commentId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Delete comment error:', error);
      return NextResponse.json(
        { error: 'Failed to delete comment' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Comment deleted successfully',
    });
  } catch (error) {
    console.error('Delete comment API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
