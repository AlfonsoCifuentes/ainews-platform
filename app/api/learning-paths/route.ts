import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/db/supabase';
import { LearningPathGenerator } from '@/lib/ai/learning-path-generator';
import { LLMClient } from '@/lib/ai/llm-client';
import { z } from 'zod';

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

// GET /api/learning-paths?userId=xxx
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const llmClient = new LLMClient(
      process.env.OPENROUTER_API_KEY || process.env.GROQ_API_KEY || '',
      process.env.OPENROUTER_API_KEY ? 'https://openrouter.ai/api/v1' : 'https://api.groq.com/openai/v1',
      process.env.OPENROUTER_API_KEY
        ? 'meta-llama/llama-3.1-8b-instruct:free'
        : 'llama3-8b-8192'
    );

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
    const body = await req.json();
    const { action } = body;

    if (action === 'create') {
      const data = CreatePathSchema.parse(body);

      const supabase = getSupabaseServerClient();
      const llmClient = new LLMClient(
        process.env.OPENROUTER_API_KEY || process.env.GROQ_API_KEY || '',
        process.env.OPENROUTER_API_KEY ? 'https://openrouter.ai/api/v1' : 'https://api.groq.com/openai/v1',
        process.env.OPENROUTER_API_KEY
          ? 'meta-llama/llama-3.1-8b-instruct:free'
          : 'llama3-8b-8192'
      );

      const generator = new LearningPathGenerator(llmClient, supabase);

      const learningPath = await generator.generateLearningPath(data.userId, data.targetRole, {
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
      const llmClient = new LLMClient(
        process.env.OPENROUTER_API_KEY || process.env.GROQ_API_KEY || '',
        process.env.OPENROUTER_API_KEY ? 'https://openrouter.ai/api/v1' : 'https://api.groq.com/openai/v1',
        process.env.OPENROUTER_API_KEY
          ? 'meta-llama/llama-3.1-8b-instruct:free'
          : 'llama3-8b-8192'
      );

      const generator = new LearningPathGenerator(llmClient, supabase);

      await generator.updateModuleProgress(data.userId, data.pathId, data.moduleId, data.progress);

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
