import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/db/supabase';
import { z } from 'zod';

// ============================================
// VALIDATION SCHEMA
// ============================================

const FeedbackSchema = z.object({
  content_type: z.enum(['article', 'course', 'module']),
  content_id: z.string().uuid(),
  rating: z.number().min(1).max(5).optional(),
  feedback_text: z.string().max(1000).optional(),
});

// ============================================
// POST: Submit Feedback
// ============================================

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = FeedbackSchema.parse(body);

    // Validar que al menos rating o feedback_text estén presentes
    if (!data.rating && !data.feedback_text) {
      return NextResponse.json(
        { error: 'Must provide either rating or feedback_text' },
        { status: 400 }
      );
    }

    const db = getSupabaseServerClient();

    // Insertar feedback
    const { error } = await db.from('ai_feedback').insert({
      content_type: data.content_type,
      content_id: data.content_id,
      rating: data.rating || null,
      feedback_text: data.feedback_text || null,
      processed: false,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Database error inserting feedback:', error);
      return NextResponse.json(
        { error: 'Failed to save feedback' },
        { status: 500 }
      );
    }

    // Log para analytics
    console.log(`✅ Feedback received: ${data.content_type} ${data.content_id} - Rating: ${data.rating || 'N/A'}`);

    return NextResponse.json({
      success: true,
      message: 'Feedback submitted successfully',
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Unexpected error in feedback API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================
// GET: Retrieve Feedback (Admin only)
// ============================================

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const contentType = searchParams.get('content_type');
    const contentId = searchParams.get('content_id');
    const processed = searchParams.get('processed');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const db = getSupabaseServerClient();

    let query = db
      .from('ai_feedback')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (contentType) {
      query = query.eq('content_type', contentType);
    }

    if (contentId) {
      query = query.eq('content_id', contentId);
    }

    if (processed !== null) {
      query = query.eq('processed', processed === 'true');
    }

    const { data, error } = await query;

    if (error) {
      console.error('Database error fetching feedback:', error);
      return NextResponse.json(
        { error: 'Failed to fetch feedback' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data,
      count: data?.length || 0,
    });

  } catch (error) {
    console.error('Unexpected error fetching feedback:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
