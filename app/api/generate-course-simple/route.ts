/**
 * Course Generation Endpoint - VERCEL OPTIMIZED
 * Simple, fast, and reliable course generation
 * 
 * POST /api/generate-course-simple
 * Body: { topic, difficulty, duration, locale }
 * 
 * This endpoint generates courses directly without complex logic
 * that could cause timeouts on Vercel serverless.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import { getSupabaseServerClient } from '@/lib/db/supabase';

// Vercel serverless has strict timeout limits (60s max)
export const maxDuration = 50;
export const dynamic = 'force-dynamic';

const schema = z.object({
  topic: z.string().min(1).max(200),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
  duration: z.enum(['short', 'medium', 'long']).default('medium'),
  locale: z.enum(['en', 'es']).default('en')
});

// Types
interface Quiz {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

interface Module {
  title: string;
  description: string;
  content: string;
  keyTakeaways: string[];
  estimatedMinutes: number;
  quiz: Quiz[];
  resources: string[];
}

interface CourseData {
  title: string;
  description: string;
  objectives: string[];
  modules: Module[];
}

// Generate simplified prompt based on locale
const generatePrompt = (topic: string, difficulty: string, duration: string, locale: 'en' | 'es'): string => {
  const moduleCount = duration === 'short' ? 3 : duration === 'medium' ? 5 : 7;
  const wordCount = duration === 'short' ? 300 : duration === 'medium' ? 500 : 700;
  
  if (locale === 'es') {
    return `Genera un curso BREVE y COMPLETO sobre "${topic}" para nivel ${difficulty}.

Estructura JSON EXACTA (válida, sin markdown):
{
  "title": "Título del curso",
  "description": "Descripción breve (máximo 50 palabras)",
  "objectives": ["Objetivo 1", "Objetivo 2"],
  "modules": [
    {
      "title": "Módulo 1",
      "description": "Descripción breve",
      "content": "Contenido sustancial de ${wordCount}+ palabras. Sé práctico y concreto.",
      "keyTakeaways": ["Punto 1", "Punto 2"],
      "estimatedMinutes": 20,
      "quiz": [{"question": "Pregunta?", "options": ["A", "B", "C correcta", "D"], "correctAnswer": 2, "explanation": "Explicación breve"}],
      "resources": ["Recurso 1", "Recurso 2"]
    }
  ]
}

Genera EXACTAMENTE ${moduleCount} módulos. Solo JSON válido, sin explicación.`;
  }
  
  return `Generate a SHORT and COMPLETE course on "${topic}" for ${difficulty} level.

Return EXACT JSON structure (valid, no markdown):
{
  "title": "Course title",
  "description": "Brief description (max 50 words)",
  "objectives": ["Objective 1", "Objective 2"],
  "modules": [
    {
      "title": "Module 1",
      "description": "Brief description",
      "content": "Substantive content of ${wordCount}+ words. Be practical and concrete.",
      "keyTakeaways": ["Point 1", "Point 2"],
      "estimatedMinutes": 20,
      "quiz": [{"question": "Question?", "options": ["A", "B", "C correct", "D"], "correctAnswer": 2, "explanation": "Brief explanation"}],
      "resources": ["Resource 1", "Resource 2"]
    }
  ]
}

Generate EXACTLY ${moduleCount} modules. Only valid JSON, no explanation.`;
};

// Call OpenAI with timeout handling
async function callOpenAI(prompt: string): Promise<CourseData> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not set');
  }

  console.log('[OpenAI] Requesting course generation...');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 second timeout

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Faster model for quick responses
        messages: [{ 
          role: 'user', 
          content: prompt 
        }],
        temperature: 0.5,
        max_tokens: 4000
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.json() as { error?: { message?: string } };
      const msg = error.error?.message || `HTTP ${response.status}`;
      throw new Error(`OpenAI error: ${msg}`);
    }

    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content from OpenAI');
    }

    // Parse JSON - handle markdown wrappers
    const jsonStr = content.includes('```json')
      ? content.split('```json')[1].split('```')[0].trim()
      : content.includes('```')
      ? content.split('```')[1].split('```')[0].trim()
      : content.trim();

    const parsed = JSON.parse(jsonStr) as CourseData;
    console.log('[OpenAI] ✅ Course generated:', parsed.title);
    return parsed;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof TypeError && error.message.includes('aborted')) {
      throw new Error('Course generation timeout - OpenAI took too long');
    }
    throw error;
  }
}

// Save to database
async function saveCourseToDB(
  course: CourseData,
  params: z.infer<typeof schema>,
  courseId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseServerClient();

  try {
    console.log('[DB] Saving course to database...');

    // Insert course
    const { error: courseErr } = await supabase.from('courses').insert({
      id: courseId,
      title_en: course.title,
      title_es: course.title,
      description_en: course.description,
      description_es: course.description,
      difficulty: params.difficulty,
      duration_minutes: params.duration === 'short' ? 45 : params.duration === 'medium' ? 120 : 210,
      topics: [params.topic],
      ai_generated: true,
      status: 'published',
      enrollment_count: 0,
      rating_avg: 0,
      completion_rate: 0,
      view_count: 0,
      category: params.topic
    });

    if (courseErr) throw courseErr;
    console.log('[DB] Course saved');

    // Insert modules
    if (!course.modules?.length) {
      return { success: true };
    }

    const modules = course.modules.map((m, i) => ({
      course_id: courseId,
      order_index: i,
      title_en: m.title,
      title_es: m.title,
      content_en: m.content,
      content_es: m.content,
      type: 'text' as const,
      estimated_time: m.estimatedMinutes,
      resources: {
        takeaways: m.keyTakeaways,
        quiz: m.quiz,
        links: m.resources
      }
    }));

    const { error: modulesErr } = await supabase.from('course_modules').insert(modules);
    if (modulesErr) throw modulesErr;

    console.log('[DB] ✅ All saved');
    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[DB] Error:', msg);
    return { success: false, error: msg };
  }
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await req.json();
    const params = schema.parse(body);

    console.log(`[API] Generating course: ${params.topic} (${params.difficulty}, ${params.duration})`);

    // Generate prompt and call OpenAI
    const prompt = generatePrompt(params.topic, params.difficulty, params.duration, params.locale);
    const courseData = await callOpenAI(prompt);

    // Save to database
    const courseId = crypto.randomUUID();
    const dbResult = await saveCourseToDB(courseData, params, courseId);

    if (!dbResult.success) {
      return NextResponse.json({
        success: false,
        error: `Database error: ${dbResult.error}`
      }, { status: 500 });
    }

    const elapsed = Date.now() - startTime;
    console.log(`[API] ✅ Complete in ${elapsed}ms`);

    return NextResponse.json({
      success: true,
      data: {
        course_id: courseId,
        title: courseData.title,
        description: courseData.description,
        modules_count: courseData.modules?.length || 0,
        content: courseData
      }
    });
  } catch (error) {
    const elapsed = Date.now() - startTime;
    const msg = error instanceof Error ? error.message : String(error);

    console.error(`[API] Error (${elapsed}ms):`, msg);

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid parameters'
      }, { status: 400 });
    }

    // Distinguish timeout vs other errors
    if (msg.includes('timeout') || msg.includes('aborted')) {
      return NextResponse.json({
        success: false,
        error: 'Generation took too long - please try again'
      }, { status: 504 });
    }

    return NextResponse.json({
      success: false,
      error: msg
    }, { status: 500 });
  }
}
