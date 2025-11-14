/**
 * Simple course generation endpoint
 * Generates courses with OpenAI and saves to database
 * 
 * POST /api/generate-course-simple
 * Body: { topic, difficulty, duration, locale }
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import { getSupabaseServerClient } from '@/lib/db/supabase';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const schema = z.object({
  topic: z.string().min(1).max(200),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
  duration: z.enum(['short', 'medium', 'long']).default('medium'),
  locale: z.enum(['en', 'es']).default('en')
});

interface CourseModule {
  title: string;
  description: string;
  content: string;
}

interface CourseData {
  title: string;
  description: string;
  modules?: CourseModule[];
}

function generateId(): string {
  return crypto.randomUUID();
}

const coursePromptEN = (topic: string, difficulty: string) => `
Generate a comprehensive course outline for "${topic}" at ${difficulty} level in JSON format.

Return ONLY valid JSON (no markdown, no explanation):
{
  "title": "Course Title",
  "description": "Brief description",
  "modules": [
    {
      "title": "Module Title",
      "description": "What students will learn",
      "content": "Detailed module content with explanations"
    }
  ]
}

Create 3-4 modules. Each module should have substantial content (100+ words).
`;

const coursePromptES = (topic: string, difficulty: string) => `
Genera un esquema de curso completo para "${topic}" a nivel ${difficulty} en formato JSON.

Retorna SOLO JSON válido (sin markdown, sin explicación):
{
  "title": "Título del Curso",
  "description": "Descripción breve",
  "modules": [
    {
      "title": "Título del Módulo",
      "description": "Qué aprenderán los estudiantes",
      "content": "Contenido detallado del módulo con explicaciones"
    }
  ]
}

Crea 3-4 módulos. Cada módulo debe tener contenido sustancial (100+ palabras).
`;

async function generateWithOpenAI(prompt: string): Promise<CourseData> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 2000
    })
  });

  if (!response.ok) {
    const error = await response.json() as { error?: { message: string } };
    throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
  }

  const data = await response.json() as { choices: Array<{ message?: { content: string } }> };
  const content = data.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No content in OpenAI response');
  }

  // Parse JSON response
  const cleaned = content.replace(/```json\n?|\n?```/g, '').trim();
  const parsed = JSON.parse(cleaned) as CourseData;
  return parsed;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const params = schema.parse(body);

    const prompt = params.locale === 'es' 
      ? coursePromptES(params.topic, params.difficulty)
      : coursePromptEN(params.topic, params.difficulty);

    console.log(`[Course Generation] Generating course for topic: ${params.topic}`);
    
    const courseData = await generateWithOpenAI(prompt);
    const courseId = generateId();

    // Save to database
    const supabase = getSupabaseServerClient();
    
    // Create course record
    const { error: courseError } = await supabase
      .from('courses')
      .insert({
        id: courseId,
        title_en: courseData.title,
        title_es: courseData.title,
        description_en: courseData.description,
        description_es: courseData.description,
        category: params.topic,
        difficulty: params.difficulty,
        estimated_duration_minutes: params.duration === 'short' ? 30 : params.duration === 'medium' ? 60 : 120,
        is_ai_generated: true,
        source: 'openai'
      });

    if (courseError) {
      console.warn('[Course Generation] Failed to save course to database:', courseError);
      // Don't throw - still return the course data even if DB save fails
    } else {
      console.log('[Course Generation] Course saved to database:', courseId);
    }

    // Create module records
    if (courseData.modules && courseData.modules.length > 0) {
      const modulesToInsert = courseData.modules.map((module, index) => ({
        course_id: courseId,
        order_index: index,
        title_en: module.title,
        title_es: module.title,
        description_en: module.description,
        description_es: module.description,
        content_en: module.content,
        content_es: module.content,
        estimated_minutes: 15
      }));

      const { error: modulesError } = await supabase
        .from('course_modules')
        .insert(modulesToInsert);

      if (modulesError) {
        console.warn('[Course Generation] Failed to save modules to database:', modulesError);
        // Don't throw - course was created, modules are optional
      } else {
        console.log('[Course Generation] Modules saved to database:', modulesToInsert.length);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        course_id: courseId,
        title: courseData.title,
        description: courseData.description,
        modules_count: courseData.modules?.length || 0,
        estimated_duration_minutes: params.duration === 'short' ? 30 : params.duration === 'medium' ? 60 : 120,
        content: courseData
      }
    });

  } catch (error) {
    console.error('[Course Generation] Error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request parameters',
        details: error.errors
      }, { status: 400 });
    }

    if (error instanceof SyntaxError) {
      return NextResponse.json({
        success: false,
        error: 'Failed to parse course content',
        details: error.message
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: 'Course generation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
