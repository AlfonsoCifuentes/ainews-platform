import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/db/supabase';
import { getServerAuthUser } from '@/lib/auth/auth-config';
import { createLLMClientWithFallback } from '@/lib/ai/llm-client';
import { loggers } from '@/lib/utils/logger';

interface GenerateModuleContentRequest {
  moduleId: string;
  courseId: string;
  locale: 'en' | 'es';
}

/**
 * Generates missing module content (articles, videos, or quiz content)
 * POST /api/courses/modules/generate-content
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getServerAuthUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: GenerateModuleContentRequest = await req.json();
    const { moduleId, courseId, locale } = body;

    loggers.course('Generate module content requested', {
      moduleId,
      courseId,
      locale,
      userId: user.id
    });

    const db = getSupabaseServerClient();

    // Fetch the module to see what content it needs
    const { data: module, error: moduleError } = await db
      .from('course_modules')
      .select('*')
      .eq('id', moduleId)
      .eq('course_id', courseId)
      .single();

    if (moduleError || !module) {
      loggers.error('Generate module content', 'Module not found', {
        moduleId,
        courseId,
        error: moduleError?.message
      });
      return NextResponse.json(
        { error: 'Module not found' },
        { status: 404 }
      );
    }

    // Fetch course context for better content generation
    const { data: course } = await db
      .from('courses')
      .select('title_en, title_es, description_en, description_es')
      .eq('id', courseId)
      .single();

    const courseTitle = locale === 'en' ? course?.title_en : course?.title_es;
    const courseDesc = locale === 'en' ? course?.description_en : course?.description_es;
    const moduleTitle = locale === 'en' ? module.title_en : module.title_es;
    const contentType = module.content_type || 'article';

    // Generate content based on type
    let generatedContent = '';
    
    if (contentType === 'article') {
      generatedContent = await generateArticleContent(
        courseTitle,
        courseDesc,
        moduleTitle,
        module.description_en || module.description_es || moduleTitle,
        locale
      );
    } else if (contentType === 'video') {
      // For videos, we generate a placeholder transcript or description
      generatedContent = await generateVideoTranscript(
        courseTitle,
        moduleTitle,
        locale
      );
    } else if (contentType === 'quiz') {
      generatedContent = await generateQuizContent(
        courseTitle,
        moduleTitle,
        locale
      );
    }

    if (!generatedContent) {
      throw new Error('Failed to generate content');
    }

    // Update the module with generated content
    const contentField = locale === 'en' ? 'content_en' : 'content_es';
    const { error: updateError } = await db
      .from('course_modules')
      .update({
        [contentField]: generatedContent,
        updated_at: new Date().toISOString()
      })
      .eq('id', moduleId);

    if (updateError) {
      loggers.error('Generate module content', 'Update failed', {
        error: updateError.message,
        moduleId,
        contentField
      });
      throw updateError;
    }

    loggers.success('Generate module content', 'Content generated and saved', {
      moduleId,
      contentType,
      locale,
      contentLength: generatedContent.length
    });

    return NextResponse.json({
      success: true,
      data: {
        moduleId,
        content: generatedContent,
        contentLength: generatedContent.length,
        locale
      }
    });

  } catch (error) {
    loggers.error('Generate module content', 'Unexpected error', {
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack
      } : String(error)
    });

    return NextResponse.json(
      {
        error: 'Failed to generate content',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Generate article content using LLM
 */
async function generateArticleContent(
  courseTitle: string | undefined,
  courseDesc: string | undefined,
  moduleTitle: string,
  moduleDesc: string,
  locale: 'en' | 'es'
): Promise<string> {
  const llm = await createLLMClientWithFallback();
  
  const prompt = locale === 'en'
    ? `You are an expert AI educator. Generate comprehensive, well-structured article content for an online course module.

Course: ${courseTitle}
Course Description: ${courseDesc}
Module: ${moduleTitle}
Module Description: ${moduleDesc}

Write a detailed, engaging article (800-1500 words) that:
1. Introduces the topic clearly
2. Breaks down concepts into digestible sections
3. Includes practical examples
4. Uses markdown formatting (headers, lists, code blocks where appropriate)
5. Ends with key takeaways

Format the response as clean markdown suitable for direct HTML rendering.`
    : `Eres un experto educador de IA. Genera contenido de artículo completo y bien estructurado para un módulo de curso en línea.

Curso: ${courseTitle}
Descripción del Curso: ${courseDesc}
Módulo: ${moduleTitle}
Descripción del Módulo: ${moduleDesc}

Escribe un artículo detallado y atractivo (800-1500 palabras) que:
1. Introduce el tema de manera clara
2. Divide los conceptos en secciones digeribles
3. Incluye ejemplos prácticos
4. Usa formato markdown (encabezados, listas, bloques de código cuando sea apropiado)
5. Termina con puntos clave

Formatea la respuesta como markdown limpio apto para renderización HTML directa.`;

  try {
    const response = await llm.generate(prompt, {
      temperature: 0.7,
      maxTokens: 3000
    });
    return response.content;
  } catch (error) {
    loggers.error('Generate article content', 'LLM call failed', {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

/**
 * Generate video transcript/description using LLM
 */
async function generateVideoTranscript(
  courseTitle: string | undefined,
  moduleTitle: string,
  locale: 'en' | 'es'
): Promise<string> {
  const llm = await createLLMClientWithFallback();
  
  const prompt = locale === 'en'
    ? `You are a professional video scriptwriter. Generate a transcript/summary for a course video.

Course: ${courseTitle}
Video Title: ${moduleTitle}

Create a detailed video transcript (800-1200 words) that:
1. Opens with a hook
2. Clearly states learning objectives
3. Explains concepts step-by-step
4. Includes visual cues (e.g., "On screen: diagram showing...")
5. Ends with a summary and call-to-action

Format with markdown sections and include [Transcript] and [Visual Notes] sections.`
    : `Eres un profesional escritor de guiones de video. Genera una transcripción/resumen para un video de curso.

Curso: ${courseTitle}
Título del Video: ${moduleTitle}

Crea una transcripción detallada de video (800-1200 palabras) que:
1. Comienza con un gancho
2. Establece claramente los objetivos de aprendizaje
3. Explica conceptos paso a paso
4. Incluye señales visuales (p. ej., "En pantalla: diagrama mostrando...")
5. Termina con un resumen y llamada a la acción

Formatea con secciones markdown e incluye secciones [Transcripción] y [Notas Visuales].`;

  try {
    const response = await llm.generate(prompt, {
      temperature: 0.7,
      maxTokens: 2500
    });
    return response.content;
  } catch (error) {
    loggers.error('Generate video transcript', 'LLM call failed', {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

/**
 * Generate quiz content (questions and answers) using LLM
 */
async function generateQuizContent(
  courseTitle: string | undefined,
  moduleTitle: string,
  locale: 'en' | 'es'
): Promise<string> {
  const llm = await createLLMClientWithFallback();
  
  const prompt = locale === 'en'
    ? `You are an expert assessment designer. Generate quiz questions for a course module.

Course: ${courseTitle}
Module: ${moduleTitle}

Create 5-8 multiple-choice questions that:
1. Test understanding of key concepts
2. Include 4 options each (A, B, C, D)
3. Are clear and unambiguous
4. Range from basic to advanced difficulty

Format as JSON array with this structure:
[
  {
    "question": "Question text?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_answer": 0
  }
]

Return ONLY valid JSON, no markdown formatting.`
    : `Eres un experto diseñador de evaluaciones. Genera preguntas de cuestionario para un módulo de curso.

Curso: ${courseTitle}
Módulo: ${moduleTitle}

Crea 5-8 preguntas de opción múltiple que:
1. Evalúen la comprensión de conceptos clave
2. Incluyan 4 opciones cada una (A, B, C, D)
3. Sean claras e inequívocas
4. Varíen en dificultad de básica a avanzada

Formatea como matriz JSON con esta estructura:
[
  {
    "question": "¿Texto de la pregunta?",
    "options": ["Opción A", "Opción B", "Opción C", "Opción D"],
    "correct_answer": 0
  }
]

Devuelve SOLO JSON válido, sin formato markdown.`;

  try {
    const response = await llm.generate(prompt, {
      temperature: 0.7,
      maxTokens: 2000
    });
    return response.content;
  } catch (error) {
    loggers.error('Generate quiz content', 'LLM call failed', {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}
