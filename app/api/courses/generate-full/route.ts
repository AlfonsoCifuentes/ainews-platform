/**
 * Complete Course Generation Endpoint
 * Generates full, followable courses with modules, quizzes, and content
 * 
 * POST /api/courses/generate-full
 * Body: { topic, difficulty, duration, locale }
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
  const contentWordCount = duration === 'short' ? 1200 : duration === 'medium' ? 1500 : 2000;
  
  return `Generate a comprehensive, complete, and SUBSTANTIVE course on "${topic}" for ${difficulty} level learners.
This course will be self-taught and needs to be fully autonomous - NO additional instruction needed.
CRITICAL: This is the ONLY resource students will have. Content must be detailed and comprehensive, NOT abbreviated or stubbed.

Requirements:
- Create exactly ${moduleCount} modules that progressively build knowledge
- Each module must have:
  * Clear, descriptive title
  * Module description (what students will learn)
  * DETAILED content (${contentWordCount}+ words, use markdown formatting with headers, examples, code)
  * 4-6 key takeaways (concrete and actionable)
  * Estimated time: ${duration === 'short' ? '25-30' : duration === 'medium' ? '35-45' : '50-60'} minutes
  * 3-4 quiz questions (multiple choice, 4 options each, with complete explanations)
  * Practical resources (5-7 links, tools, code samples)

Content Guidelines:
- Be CONCRETE and PRACTICAL with real examples
- Include code snippets, diagrams, case studies
- Explain WHY and WHERE to use each concept
- Use clear language, maintain technical accuracy
- Add actionable next steps in each module
- DO NOT generate short, placeholder or stub content
- Ensure each module is self-contained and educational

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
      "content": "DETAILED CONTENT (${contentWordCount}+ words) with explanations, practical examples, code if relevant. Use markdown with headers and lists. Include real-world scenarios and best practices.",
      "keyTakeaways": [
        "Key point 1 - actionable",
        "Key point 2 - specific",
        "Key point 3 - applicable",
        "Key point 4 - practical"
      ],
      "estimatedMinutes": ${duration === 'short' ? 25 : duration === 'medium' ? 35 : 50},
      "quiz": [
        {
          "question": "Clear, specific quiz question?",
          "options": ["Wrong option", "Wrong option", "Correct option", "Wrong option"],
          "correctAnswer": 2,
          "explanation": "Complete explanation - why this is correct and what learners should understand"
        }
      ],
      "resources": [
        "Resource 1 with URL or tool name",
        "Resource 2 with practical application",
        "Resource 3 relevant to module topic"
      ]
    }
  ]
}

CRITICAL: 
- JSON must be valid and complete
- No markdown backticks or wrappers
- All modules MUST be substantive (NOT placeholders)
- Quiz questions must have exactly 4 options
- Content MUST be suitable for self-paced, autonomous learning
- NEVER generate abbreviated or stub content`;
};

const COURSE_PROMPT_ES = (topic: string, difficulty: string, duration: string): string => {
  const moduleCount = duration === 'short' ? 3 : duration === 'medium' ? 5 : 7;
  const contentWordCount = duration === 'short' ? 1200 : duration === 'medium' ? 1500 : 2000;
  
  return `Genera un curso COMPLETO, COMPRENSIVO y SUSTANCIAL sobre "${topic}" para estudiantes de nivel ${difficulty}.
Este curso será AUTÓNOMO - NO se requiere instrucción adicional.
CRÍTICO: Este es el ÚNICO recurso que tendrán los estudiantes. El contenido debe ser detallado y completo, NO abreviado o stub.

Requisitos:
- Crea exactamente ${moduleCount} módulos que construyan conocimiento progresivamente
- Cada módulo debe tener:
  * Título claro y descriptivo
  * Descripción del módulo (qué aprenderán los estudiantes)
  * Contenido DETALLADO (${contentWordCount}+ palabras, formato markdown con headers, ejemplos, código)
  * 4-6 puntos clave (concretos y accionables)
  * Tiempo estimado: ${duration === 'short' ? '25-30' : duration === 'medium' ? '35-45' : '50-60'} minutos
  * 3-4 preguntas de quiz (opción múltiple con 4 opciones, explicaciones completas)
  * Recursos prácticos (5-7 enlaces, herramientas, ejemplos de código)

Directrices de Contenido:
- Sé CONCRETO y PRÁCTICO con ejemplos reales
- Incluye fragmentos de código, diagramas, casos de estudio
- Explica POR QUÉ y DÓNDE usar cada concepto
- Usa lenguaje claro, mantén precisión técnica
- Agrega pasos accionables en cada módulo
- NO generes contenido corto, de relleno o stub
- Asegúrate que cada módulo sea autónomo y educativo

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
      "content": "CONTENIDO DETALLADO (${contentWordCount}+ palabras) con explicaciones, ejemplos prácticos, código si es relevante. Usa markdown con headers y listas. Incluye escenarios reales y mejores prácticas.",
      "keyTakeaways": [
        "Punto clave 1 - accionable",
        "Punto clave 2 - específico",
        "Punto clave 3 - aplicable",
        "Punto clave 4 - práctico"
      ],
      "estimatedMinutes": ${duration === 'short' ? 25 : duration === 'medium' ? 35 : 50},
      "quiz": [
        {
          "question": "¿Pregunta clara y específica del quiz?",
          "options": ["Opción incorrecta", "Opción incorrecta", "Opción correcta", "Opción incorrecta"],
          "correctAnswer": 2,
          "explanation": "Explicación completa - por qué es correcta y qué deben entender los estudiantes"
        }
      ],
      "resources": [
        "Recurso 1 con URL o nombre de herramienta",
        "Recurso 2 con aplicación práctica",
        "Recurso 3 relevante para el módulo"
      ]
    }
  ]
}

CRÍTICO:
- JSON debe ser válido y completo
- Sin markdown o envoltorios
- TODOS los módulos DEBEN ser sustanciales (NO placeholders)
- Preguntas de quiz con exactamente 4 opciones
- El contenido DEBE ser apropiado para aprendizaje autónomo
- NUNCA generes contenido abreviado o stub`;
};

// ============================================================================
// OPENAI GENERATION
// ============================================================================

async function generateWithOpenAI(prompt: string): Promise<CourseData> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  console.log('[OpenAI] Calling GPT-4o for course generation...');

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
      max_tokens: 4000
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
        title_en: params.locale === 'en' ? courseData.title : courseData.title, // Will translate later
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
      // Course was saved successfully, modules failed - still OK to return success
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
    console.log('[API] POST /api/courses/generate-full');
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
    const courseData = await generateWithOpenAI(prompt);

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
