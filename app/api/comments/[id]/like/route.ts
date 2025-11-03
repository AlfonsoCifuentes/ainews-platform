import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/db/supabase-server';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if already liked
    const { data: existing } = await supabase
      .from('comment_likes')
      .select('id')
      .eq('comment_id', id)
      .eq('user_id', user.id)
      .single();

    if (existing) {
      // Unlike
      await supabase
        .from('comment_likes')
        .delete()
        .eq('comment_id', id)
        .eq('user_id', user.id);

      // Decrement likes_count
      await supabase.rpc('decrement_comment_likes', { comment_id: id });

      return NextResponse.json({ liked: false });
    } else {
      // Like
      await supabase
        .from('comment_likes')
        .insert({
          comment_id: id,
          user_id: user.id,
          created_at: new Date().toISOString(),
        });

      // Increment likes_count
      await supabase.rpc('increment_comment_likes', { comment_id: id });

      return NextResponse.json({ liked: true });
    }
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
