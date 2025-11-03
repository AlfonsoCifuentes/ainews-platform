import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/db/supabase';
import { getServerAuthUser } from '@/lib/auth/auth-config';
import { z } from 'zod';

const InterestSchema = z.object({
  tagIds: z.array(z.string().uuid()),
});

/**
 * GET /api/users/interests
 * Gets user's interests
 */
export async function GET() {
  try {
    const user = await getServerAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getSupabaseServerClient();

    const { data, error } = await db
      .from('user_interests')
      .select('tag_id, tags(*)')
      .eq('user_id', user.id);

    if (error) {
      console.error('Get interests error:', error);
      return NextResponse.json(
        { error: 'Failed to get interests' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      interests: data?.map((item) => item.tags) || [],
    });
  } catch (error) {
    console.error('Get interests API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/users/interests
 * Sets user's interests (replaces all)
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getServerAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { tagIds } = InterestSchema.parse(body);

    const db = getSupabaseServerClient();

    // Delete existing interests
    await db.from('user_interests').delete().eq('user_id', user.id);

    // Insert new interests
    if (tagIds.length > 0) {
      const { error } = await db.from('user_interests').insert(
        tagIds.map((tagId) => ({
          user_id: user.id,
          tag_id: tagId,
        }))
      );

      if (error) {
        console.error('Set interests error:', error);
        return NextResponse.json(
          { error: 'Failed to set interests' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Interests updated successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Set interests API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
