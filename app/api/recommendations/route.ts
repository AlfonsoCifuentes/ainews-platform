import { NextResponse } from 'next/server';
import { personalizationEngine } from '@/lib/ai/personalization-engine';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const contentType = searchParams.get('contentType') as 'article' | 'course';
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    if (!['article', 'course'].includes(contentType)) {
      return NextResponse.json({ error: 'Invalid content type' }, { status: 400 });
    }

    const recommendations = await personalizationEngine.getRecommendations({
      user_id: userId,
      content_type: contentType,
      limit,
      exclude_seen: true,
      diversity_factor: 0.3
    });

    return NextResponse.json({ recommendations });
  } catch (error) {
    console.error('[Recommendations API] Error:', error);
    return NextResponse.json({ error: 'Failed to get recommendations' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, contentType, contentId, interactionType } = body;

    if (!userId || !contentType || !contentId || !interactionType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await personalizationEngine.trackInteraction(userId, contentType, contentId, interactionType);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Recommendations API] Error tracking:', error);
    return NextResponse.json({ error: 'Failed to track interaction' }, { status: 500 });
  }
}
