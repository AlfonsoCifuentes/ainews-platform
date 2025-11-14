/**
 * Complete Course Generation Endpoint
 * Generates full, followable courses with modules, quizzes, and content
 * 
 * POST /api/generate-course-simple
 * Body: { topic, difficulty, duration, locale }
 * 
 * This endpoint is the PRIMARY course generation endpoint
 * It generates courses with substantive content suitable for self-paced learning
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import { getSupabaseServerClient } from '@/lib/db/supabase';

export const maxDuration = 120;
export const dynamic = 'force-dynamic';

const schema = z.object({
  topic: z.string().min(1).max(200),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
  duration: z.enum(['short', 'medium', 'long']).default('medium'),
  locale: z.enum(['en', 'es']).default('en')
});

// ============================================================================
// TYPES
// ============================================================================

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

// ============================================================================
// PROMPTS
// ============================================================================

const COURSE_PROMPT_EN = (topic: string, difficulty: string, duration: string): string => {
  const moduleCount = duration === 'short' ? 3 : duration === 'medium' ? 5 : 7;
  const contentWordCount = duration === 'short' ? 400 : duration === 'medium' ? 600 : 800;
  
  return `Generate a comprehensive, complete course on "${topic}" for ${difficulty} level learners.
This course will be self-taught and needs to be fully autonomous - NO additional instruction needed.

Requirements:
- Create exactly ${moduleCount} modules that progressively build knowledge
- Each module must have:
  * Clear, descriptive title
  * Module description (what students will learn)
  * Detailed content (${contentWordCount}+ words, use markdown formatting)
  * 3-5 key takeaways (bullet points)
  * Estimated time: ${duration === 'short' ? '15-20' : duration === 'medium' ? '20-30' : '30-45'} minutes
  * 2-3 quiz questions (multiple choice with 4 options each)
  * Practical resources (links, tools, code examples relevant to the topic)

Content Guidelines:
- Be CONCRETE and PRACTICAL, not theoretical
- Include code examples, real-world scenarios, case studies
- Explain WHY concepts matter, not just WHAT they are
- Use simple language but maintain technical accuracy
- Add actionable next steps in each module

Return ONLY valid, complete JSON (no markdown wrapper, no explanation):
{
  "title": "Complete Course Title",
  "description": "Comprehensive course description (2-3 sentences)",
  "objectives": [
    "Clear learning objective 1",
    "Clear learning objective 2",
    "Clear learning objective 3"
  ],
  "modules": [
    {
      "title": "Module Title",
      "description": "What you'll learn in this module (1-2 sentences)",
      "content": "DETAILED CONTENT with explanations, examples, code if relevant. Use markdown formatting. Must be ${contentWordCount}+ words. Include practical examples and scenarios.",
      "keyTakeaways": [
        "Key point 1",
        "Key point 2",
        "Key point 3"
      ],
      "estimatedMinutes": 20,
      "quiz": [
        {
          "question": "Clear, specific quiz question?",
          "options": ["Wrong option", "Wrong option", "Correct option", "Wrong option"],
          "correctAnswer": 2,
          "explanation": "Why this is correct and what learners should have understood"
        }
      ],
      "resources": [
        "Resource 1 with URL or tool name",
        "Resource 2 with practical application"
      ]
    }
  ]
}

CRITICAL: 
- JSON must be valid and complete
- No markdown backticks or wrappers
- All modules must be substantive (not placeholder text)
- Quiz questions must have exactly 4 options
- Content must be suitable for self-paced, autonomous learning`;
};

const COURSE_PROMPT_ES = (topic: string, difficulty: string, duration: string): string => {
  const moduleCount = duration === 'short' ? 3 : duration === 'medium' ? 5 : 7;
  const contentWordCount = duration === 'short' ? 400 : duration === 'medium' ? 600 : 800;
  
  return `Genera un curso completo y comprensivo sobre "${topic}" para estudiantes de nivel ${difficulty}.
Este curso será autónomo - NO se requiere instrucción adicional.

Requisitos:
- Crea exactamente ${moduleCount} módulos que construyan conocimiento progresivamente
- Cada módulo debe tener:
  * Título claro y descriptivo
  * Descripción del módulo (qué aprenderán los estudiantes)
  * Contenido detallado (${contentWordCount}+ palabras, usa formato markdown)
  * 3-5 puntos clave (en viñetas)
  * Tiempo estimado: ${duration === 'short' ? '15-20' : duration === 'medium' ? '20-30' : '30-45'} minutos
  * 2-3 preguntas de quiz (opción múltiple con 4 opciones cada una)
  * Recursos prácticos (enlaces, herramientas, ejemplos de código relevantes)

Directrices de Contenido:
- Sé CONCRETO y PRÁCTICO, no solo teórico
- Incluye ejemplos de código, escenarios reales, casos de estudio
- Explica POR QUÉ importan los conceptos, no solo QUÉ son
- Usa lenguaje simple pero mantén precisión técnica
- Agrega pasos accionables en cada módulo

Retorna SOLO JSON válido y completo (sin markdown, sin explicación):
{
  "title": "Título del Curso Completo",
  "description": "Descripción comprensiva del curso (2-3 oraciones)",
  "objectives": [
    "Objetivo de aprendizaje claro 1",
    "Objetivo de aprendizaje claro 2",
    "Objetivo de aprendizaje claro 3"
  ],
  "modules": [
    {
      "title": "Título del Módulo",
      "description": "Qué aprenderás en este módulo (1-2 oraciones)",
      "content": "CONTENIDO DETALLADO con explicaciones, ejemplos, código si es relevante. Usa formato markdown. Debe tener ${contentWordCount}+ palabras. Incluye ejemplos prácticos y escenarios.",
      "keyTakeaways": [
        "Punto clave 1",
        "Punto clave 2",
        "Punto clave 3"
      ],
      "estimatedMinutes": 20,
      "quiz": [
        {
          "question": "¿Pregunta clara y específica del quiz?",
          "options": ["Opción incorrecta", "Opción incorrecta", "Opción correcta", "Opción incorrecta"],
          "correctAnswer": 2,
          "explanation": "Por qué esto es correcto y qué deberían haber entendido los estudiantes"
        }
      ],
      "resources": [
        "Recurso 1 con URL o nombre de herramienta",
        "Recurso 2 con aplicación práctica"
      ]
    }
  ]
}

CRÍTICO:
- El JSON debe ser válido y completo
- Sin backticks de markdown o envoltorios
- Todos los módulos deben ser sustanciales (no texto placeholder)
- Las preguntas de quiz deben tener exactamente 4 opciones
- El contenido debe ser adecuado para aprendizaje autónomo`;
};

// ============================================================================
// OPENAI GENERATION
// ============================================================================

async function generateWithOpenAI(prompt: string, duration: string = 'medium'): Promise<CourseData> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  console.log('[OpenAI] Calling GPT-4o for course generation...');

  // Dynamically set token limit based on course complexity
  const maxTokensForCourse: { [key: string]: number } = {
    'short': 3500,
    'medium': 4500,
    'long': 6000
  };

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [{ 
        role: 'user', 
        content: prompt 
      }],
      temperature: 0.7,
      max_tokens: maxTokensForCourse[duration] ?? 4500
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    const errorMsg = (errorData as { error?: { message: string } }).error?.message || 'Unknown error';
    throw new Error(`OpenAI API error (${response.status}): ${errorMsg}`);
  }

  const data = await response.json() as { choices: Array<{ message?: { content: string } }> };
  const content = data.choices[0]?.message?.content;
  
  if (!content) {
    throw new Error('No content returned from OpenAI');
  }

  // Parse JSON response
  const cleaned = content.replace(/```json\n?|\n?```/g, '').trim();
  
  try {
    const parsed = JSON.parse(cleaned) as CourseData;
    console.log('[OpenAI] ✅ Successfully parsed course structure');
    console.log(`[OpenAI] Course title: "${parsed.title}"`);
    console.log(`[OpenAI] Modules: ${parsed.modules?.length || 0}`);
    return parsed;
  } catch (error) {
    console.error('[OpenAI] Failed to parse response:', cleaned.substring(0, 200));
    throw new Error(`Failed to parse course JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

async function saveCourseToDatabase(
  courseData: CourseData,
  params: z.infer<typeof schema>,
  courseId: string
): Promise<{ success: boolean; courseId: string; error?: string }> {
  const supabase = getSupabaseServerClient();

  try {
    console.log(`[Database] Saving course "${courseData.title}" to database...`);

    // 1. Insert course record
    const { error: courseError } = await supabase
      .from('courses')
      .insert({
        id: courseId,
        title_en: params.locale === 'en' ? courseData.title : courseData.title,
        title_es: params.locale === 'es' ? courseData.title : courseData.title,
        description_en: params.locale === 'en' ? courseData.description : courseData.description,
        description_es: params.locale === 'es' ? courseData.description : courseData.description,
        difficulty: params.difficulty,
        duration_minutes: params.duration === 'short' ? 45 : params.duration === 'medium' ? 120 : 240,
        topics: [params.topic],
        ai_generated: true,
        status: 'published',
        enrollment_count: 0,
        rating_avg: 0,
        completion_rate: 0,
        view_count: 0,
        category: params.topic
      });

    if (courseError) {
      console.error('[Database] ❌ Course insert error:', courseError);
      return {
        success: false,
        courseId,
        error: `Failed to save course: ${courseError.message}`
      };
    }

    console.log(`[Database] ✅ Course saved with ID: ${courseId}`);

    // 2. Insert modules
    if (!courseData.modules || courseData.modules.length === 0) {
      return {
        success: true,
        courseId,
        error: 'No modules to insert'
      };
    }

    const modulesToInsert = courseData.modules.map((module, index) => ({
      course_id: courseId,
      order_index: index,
      title_en: params.locale === 'en' ? module.title : module.title,
      title_es: params.locale === 'es' ? module.title : module.title,
      content_en: params.locale === 'en' ? module.content : module.content,
      content_es: params.locale === 'es' ? module.content : module.content,
      type: 'text' as const,
      estimated_time: module.estimatedMinutes,
      resources: {
        takeaways: module.keyTakeaways,
        quiz: module.quiz,
        links: module.resources
      }
    }));

    console.log(`[Database] Inserting ${modulesToInsert.length} modules...`);

    const { error: modulesError } = await supabase
      .from('course_modules')
      .insert(modulesToInsert);

    if (modulesError) {
      console.error('[Database] ⚠️ Modules insert error (course still saved):', modulesError);
      return {
        success: true,
        courseId,
        error: `Modules insert partial: ${modulesError.message}`
      };
    }

    console.log(`[Database] ✅ All ${modulesToInsert.length} modules saved successfully`);

    return {
      success: true,
      courseId
    };

  } catch (error) {
    console.error('[Database] Unexpected error:', error);
    return {
      success: false,
      courseId,
      error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown'}`
    };
  }
}

// ============================================================================
// API HANDLER
// ============================================================================

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  
  try {
    console.log('\n' + '='.repeat(80));
    console.log('[API] POST /api/generate-course-simple');
    console.log('='.repeat(80));

    // 1. Parse & validate input
    const body = await req.json();
    const params = schema.parse(body);
    
    console.log(`[API] Parameters:`, {
      topic: params.topic,
      difficulty: params.difficulty,
      duration: params.duration,
      locale: params.locale
    });

    // 2. Generate prompt
    const prompt = params.locale === 'es'
      ? COURSE_PROMPT_ES(params.topic, params.difficulty, params.duration)
      : COURSE_PROMPT_EN(params.topic, params.difficulty, params.duration);

    // 3. Generate with OpenAI
    console.log('[API] 📝 Generating course with OpenAI...');
    const courseData = await generateWithOpenAI(prompt, params.duration);

    // 4. Create course ID
    const courseId = crypto.randomUUID();

    // 5. Save to database
    console.log('[API] 💾 Saving to database...');
    const dbResult = await saveCourseToDatabase(courseData, params, courseId);

    if (!dbResult.success) {
      console.error('[API] Database save failed:', dbResult.error);
      throw new Error(dbResult.error || 'Database save failed');
    }

    // 6. Return response
    const duration = Date.now() - startTime;
    console.log(`[API] ✅ Success! Generated in ${duration}ms`);

    return NextResponse.json({
      success: true,
      data: {
        course_id: courseId,
        title: courseData.title,
        description: courseData.description,
        objectives: courseData.objectives,
        modules_count: courseData.modules?.length || 0,
        estimated_total_minutes: courseData.modules
          ? courseData.modules.reduce((sum, m) => sum + m.estimatedMinutes, 0)
          : 0,
        content: courseData
      }
    }, { status: 200 });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[API] ❌ Error (${duration}ms):`, error);

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
        error: 'Failed to parse course JSON from AI',
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
