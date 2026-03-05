import { NextResponse } from 'next/server';
import { z } from 'zod';
import { personalizationEngine } from '@/lib/ai/personalization-engine';

const GetSchema = z.object({
  userId: z.string().min(1),
  contentType: z.enum(['article', 'course']),
  limit: z.coerce.number().min(1).max(50).default(10),
});

const PostSchema = z.object({
  userId: z.string().min(1),
  contentType: z.enum(['article', 'course']),
  contentId: z.string().min(1),
  interactionType: z.enum(['view', 'like', 'bookmark', 'complete', 'search']),
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const params = GetSchema.parse({
      userId: searchParams.get('userId'),
      contentType: searchParams.get('contentType'),
      limit: searchParams.get('limit') || '10',
    });

    const recommendations = await personalizationEngine.getRecommendations({
      user_id: params.userId,
      content_type: params.contentType,
      limit: params.limit,
      exclude_seen: true,
      diversity_factor: 0.3
    });

    return NextResponse.json({ recommendations });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.errors },
        { status: 400 }
      );
    }
    console.error('[Recommendations API] Error:', error);
    return NextResponse.json({ error: 'Failed to get recommendations' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const params = PostSchema.parse(body);

    await personalizationEngine.trackInteraction(params.userId, params.contentType, params.contentId, params.interactionType);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.errors },
        { status: 400 }
      );
    }
    console.error('[Recommendations API] Error tracking:', error);
    return NextResponse.json({ error: 'Failed to track interaction' }, { status: 500 });
  }
}
