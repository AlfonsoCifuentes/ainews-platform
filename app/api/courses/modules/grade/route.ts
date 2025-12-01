import { NextRequest, NextResponse } from 'next/server';
import { createApiClient } from '@/lib/db/supabase-api';

/**
 * POST /api/courses/modules/grade
 * Request: { moduleId: string, answers: Record<string, string> }
 * Response: { success: true, score: number, feedback: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { moduleId, answers } = body;

    if (!moduleId || !answers) {
      return NextResponse.json({ error: 'Missing moduleId or answers' }, { status: 400 });
    }

    const api = createApiClient(req);
    const { data: { user }, error: authErr } = await api.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch module to get expected answers (if any)
    const { data: moduleData } = await api
      .from('course_modules')
      .select('content_en, content_es, course_id')
      .eq('id', moduleId)
      .maybeSingle();

    const text = moduleData?.content_en || moduleData?.content_es || '';

    // Very simple grader: count keyword matches as a proxy for quality
    let total = 0;
    let correct = 0;
    for (const q in answers) {
      total++;
      const ans = String(answers[q] || '');
      if (text.includes(ans) || ans.length > 10) {
        correct++;
      }
    }

    const score = Math.round((correct / Math.max(1, total)) * 100);

    // Basic feedback
    const feedback = score >= 70 ? 'Good job! You passed the exercise.' : `You scored ${score}. Review the module and try again.`;

    // Return score and advice
    return NextResponse.json({ success: true, score, feedback });
  } catch (e) {
    console.error('Grade API error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
