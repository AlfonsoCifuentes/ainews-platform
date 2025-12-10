import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/db/supabase-server';

const UpdateSchema = z.object({
  interval: z.number().min(0).optional(),
  intervalDays: z.number().min(0).optional(),
  repetitions: z.number().min(0),
  easeFactor: z.number().min(1.3).max(2.6),
  dueAt: z.string().datetime(),
  lastReviewedAt: z.string().datetime(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const validated = UpdateSchema.parse(body);
    const intervalDays = Math.max(0, validated.interval ?? validated.intervalDays ?? 0);
    const easeFactor = Math.min(2.5, validated.easeFactor);

    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('flashcards')
      .update({
        interval_days: intervalDays,
        repetitions: validated.repetitions,
        ease_factor: easeFactor,
        due_at: validated.dueAt,
        last_reviewed_at: validated.lastReviewedAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to update flashcard' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
