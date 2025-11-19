import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/db/supabase-server';
import { z } from 'zod';
import { getDueFlashcards, recordReview, createFlashcardsFromContent, getFlashcardStats } from '@/lib/ai/srs';

const GetDueSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
});

const ReviewSchema = z.object({
  flashcardId: z.string().uuid(),
  quality: z.number().min(0).max(5),
});

const CreateSchema = z.object({
  contentId: z.string().min(1),
  contentType: z.enum(['article', 'course', 'entity']),
});

// GET /api/flashcards - Get due flashcards
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const action = req.nextUrl.searchParams.get('action');

    if (action === 'stats') {
      const stats = await getFlashcardStats(user.id);
      return NextResponse.json({ data: stats });
    }

    const params = GetDueSchema.parse(
      Object.fromEntries(req.nextUrl.searchParams)
    );

    const flashcards = await getDueFlashcards(user.id, params.limit);
    return NextResponse.json({ data: flashcards });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.errors },
        { status: 400 }
      );
    }
    const message = error instanceof Error ? error.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/flashcards - Create flashcards or record review
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const action = req.nextUrl.searchParams.get('action');

    if (action === 'review') {
      const params = ReviewSchema.parse(body);
      const nextState = await recordReview(params, user.id);
      return NextResponse.json({ data: nextState });
    }

    if (action === 'create') {
      const params = CreateSchema.parse(body);
      const flashcards = await createFlashcardsFromContent(
        user.id,
        params.contentId,
        params.contentType
      );
      return NextResponse.json({ data: flashcards }, { status: 201 });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.errors },
        { status: 400 }
      );
    }
    const message = error instanceof Error ? error.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
