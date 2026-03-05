import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/db/supabase';
import { LearningPathGenerator } from '@/lib/ai/learning-path-generator';
import { createLLMClientWithFallback } from '@/lib/ai/llm-client';
import { z } from 'zod';
import { getServerAuthUser } from '@/lib/auth/auth-config';
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from '@/lib/api/rate-limiter';

const CreatePathSchema = z.object({
  userId: z.string(),
  targetRole: z.string(),
  currentSkills: z.array(z.string()),
  targetSkills: z.array(z.string()),
  experienceLevel: z.enum(['beginner', 'intermediate', 'advanced']),
  learningPace: z.enum(['slow', 'moderate', 'fast']),
  availableHoursPerWeek: z.number().min(1).max(100),
  preferredLearningStyles: z.array(z.enum(['reading', 'video', 'practice', 'interactive']))
});

const UpdateProgressSchema = z.object({
  userId: z.string(),
  pathId: z.string(),
  moduleId: z.string(),
  progress: z.number().min(0).max(100)
});

// GET /api/learning-paths
export async function GET(_req: NextRequest) {
  try {
    // Require authentication
    const authUser = await getServerAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use authenticated user's ID (ignore userId from query params to prevent enumeration)
    const userId = authUser.id;

    const supabase = getSupabaseServerClient();
    const llmClient = await createLLMClientWithFallback();

    const generator = new LearningPathGenerator(llmClient, supabase);
    const paths = await generator.getUserLearningPaths(userId);

    return NextResponse.json({ data: paths });
  } catch (error) {
    console.error('Learning paths GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch learning paths' }, { status: 500 });
  }
}

// POST /api/learning-paths
export async function POST(req: NextRequest) {
  try {
    // Require authentication
    const authUser = await getServerAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit LLM generation
    const rateLimitKey = getRateLimitKey('learning-path', authUser.id);
    const rateCheck = checkRateLimit(rateLimitKey, RATE_LIMITS.LLM_GENERATION.limit, RATE_LIMITS.LLM_GENERATION.windowMs);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many requests, please try again later' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { action } = body;

    if (action === 'create') {
      const data = CreatePathSchema.parse(body);

      const supabase = getSupabaseServerClient();
      const llmClient = await createLLMClientWithFallback();

      const generator = new LearningPathGenerator(llmClient, supabase);

      const learningPath = await generator.generateLearningPath(authUser.id, data.targetRole, {
        current_skills: data.currentSkills,
        target_skills: data.targetSkills,
        experience_level: data.experienceLevel,
        learning_pace: data.learningPace,
        available_hours_per_week: data.availableHoursPerWeek,
        preferred_learning_styles: data.preferredLearningStyles
      });

      return NextResponse.json({ data: learningPath });
    } else if (action === 'update_progress') {
      const data = UpdateProgressSchema.parse(body);

      const supabase = getSupabaseServerClient();
      const llmClient = await createLLMClientWithFallback();

      const generator = new LearningPathGenerator(llmClient, supabase);

      await generator.updateModuleProgress(authUser.id, data.pathId, data.moduleId, data.progress);

      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }

    console.error('Learning paths POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
