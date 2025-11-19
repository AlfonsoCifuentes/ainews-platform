/**
 * Course Generation Endpoint - VERCEL OPTIMIZED
 * Simple, fast, and reliable course generation
 * 
 * POST /api/generate-course-simple
 * Body: { topic, difficulty, duration, locale }
 * 
 * Uses LLM client with automatic fallback system
 * Groq → Gemini → OpenRouter → Together → etc.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import { getSupabaseServerClient } from '@/lib/db/supabase';
import { createLLMClientWithFallback } from '@/lib/ai/llm-client';

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
  const wordCount = duration === 'short' ? 2500 : duration === 'medium' ? 3000 : 3500;
  
  if (locale === 'es') {
    return `Genera un curso COMPLETO, PROFESIONAL y EDUCATIVO sobre "${topic}" para nivel ${difficulty}.

CONTEXTO CRÍTICO: Este es el ÚNICO recurso de aprendizaje disponible para los estudiantes.
Por lo tanto, CADA MÓDULO DEBE SER SUSTANCIAL, DETALLADO y ALTAMENTE EDUCATIVO.

Estructura JSON EXACTA (válida, sin markdown fences):
{
  "title": "Título del curso atractivo y claro",
  "description": "Descripción detallada del curso que explique qué aprenderán los estudiantes y el valor que obtendrán. Máximo 100 palabras pero informativa.",
  "objectives": ["Objetivo 1 concreto y medible", "Objetivo 2 concreto", "Objetivo 3 concreto", "Objetivo 4"],
  "modules": [
    {
      "title": "Módulo 1: Título descriptivo que resume el contenido",
      "description": "Descripción clara de qué aprenderá el estudiante en este módulo (2-3 oraciones)",
      "content": "CONTENIDO EDUCATIVO DE ${wordCount}+ PALABRAS. ESTE ES EL CORAZÓN DEL MÓDULO. DEBE INCLUIR OBLIGATORIAMENTE: 1) Introducción clara (2-3 párrafos) 2) Conceptos Clave (lista con definiciones detalladas) 3) Explicación Profunda (3-5 secciones subsecuentes con ejemplos prácticos) 4) Ejemplos del Mundo Real (mínimo 3 casos concretos) 5) Mejores Prácticas (cómo aplicar esto correctamente) 6) Errores Comunes (qué evitar y por qué) 7) Casos de Uso Avanzados (para motivar más aprendizaje) 8) Conclusiones y Resumen. GUÍA: Usa markdown con headers, listas y énfasis. Sé específico y profundo. Explica EL POR QUÉ, no solo EL QUÉ. PROHIBIDO: NO contenido corto, NO placeholders, NO repeticiónes, NO superficial, NO omisiones de secciones.",
      "keyTakeaways": ["Punto clave principal 1", "Punto clave principal 2", "Punto clave principal 3", "Punto clave principal 4"],
      "estimatedMinutes": 45,
      "quiz": [
        {"question": "Pregunta enfocada en concepto principal del módulo?", "options": ["Opción incorrecta A", "Opción incorrecta B", "Opción correcta C", "Opción incorrecta D"], "correctAnswer": 2, "explanation": "Explicación detallada de por qué esta es la respuesta correcta y por qué las otras son incorrectas"},
        {"question": "Pregunta sobre aplicación práctica?", "options": ["A", "B correcto", "C", "D"], "correctAnswer": 1, "explanation": "Explicación completa"},
        {"question": "Pregunta sobre concepto secundario?", "options": ["A", "B", "C correcto", "D"], "correctAnswer": 2, "explanation": "Explicación"}
      ],
      "resources": ["Referencia educativa 1 - URL o descripción", "Referencia educativa 2 - URL o descripción", "Referencia educativa 3 - URL o descripción", "Referencia educativa 4 opcional"]
    }
  ]
}

REQUISITOS CRÍTICOS Y NO NEGOCIABLES:
1. Genera EXACTAMENTE ${moduleCount} módulos (no más, no menos)
2. CADA módulo DEBE tener MÍNIMO ${wordCount} palabras en 'content'
3. El contenido DEBE ser educativo, profesional y sustancial (NO stubs o placeholders)
4. Usa formato markdown profesional con estructura clara
5. Cada pregunta de quiz DEBE tener una explicación detallada
6. Solo JSON válido, sin explicaciones adicionales antes/después`;
  }
  
  return `Generate a COMPLETE, PROFESSIONAL and HIGHLY EDUCATIONAL course on "${topic}" for ${difficulty} level.

CRITICAL CONTEXT: This is the ONLY learning resource available to students.
Therefore, EACH MODULE MUST BE SUBSTANTIAL, DETAILED, and HIGHLY EDUCATIONAL.

Return EXACT JSON structure (valid, no markdown fences):
{
  "title": "Attractive and clear course title",
  "description": "Detailed description explaining what students will learn and value gained. Maximum 100 words but informative.",
  "objectives": ["Objective 1 concrete and measurable", "Objective 2 concrete", "Objective 3 concrete", "Objective 4"],
  "modules": [
    {
      "title": "Module 1: Descriptive title summarizing the content",
      "description": "Clear description of what student will learn (2-3 sentences)",
      "content": "EDUCATIONAL CONTENT OF ${wordCount}+ WORDS. THIS IS THE HEART OF THE MODULE. MUST INCLUDE: 1) Clear Introduction (2-3 paragraphs) 2) Key Concepts (detailed definitions) 3) Deep Explanation (3-5 subsections with practical examples) 4) Real-World Examples (minimum 3 concrete cases) 5) Best Practices (how to apply correctly) 6) Common Mistakes (what to avoid and why) 7) Advanced Use Cases (motivate further learning) 8) Conclusions and Summary. GUIDE: Use markdown with headers, lists, emphasis. Be specific and deep. Explain WHY, not just WHAT. PROHIBITED: NO short content, NO placeholders, NO repetitions, NO superficial content, NO omitted sections.",
      "keyTakeaways": ["Main key takeaway 1", "Main key takeaway 2", "Main key takeaway 3", "Main key takeaway 4"],
      "estimatedMinutes": 45,
      "quiz": [
        {"question": "Question focused on module's main concept?", "options": ["Incorrect option A", "Incorrect option B", "Correct option C", "Incorrect option D"], "correctAnswer": 2, "explanation": "Detailed explanation of why this is correct and why others are incorrect"},
        {"question": "Question about practical application?", "options": ["A", "B correct", "C", "D"], "correctAnswer": 1, "explanation": "Complete explanation"},
        {"question": "Question about secondary concept?", "options": ["A", "B", "C correct", "D"], "correctAnswer": 2, "explanation": "Explanation"}
      ],
      "resources": ["Educational reference 1 - URL or description", "Educational reference 2 - URL or description", "Educational reference 3 - URL or description", "Educational reference 4 optional"]
    }
  ]
}

CRITICAL AND NON-NEGOTIABLE REQUIREMENTS:
1. Generate EXACTLY ${moduleCount} modules (no more, no less)
2. EACH module MUST have MINIMUM ${wordCount} words in 'content'
3. Content MUST be educational, professional and substantial (NO stubs or placeholders)
4. Use professional markdown format with clear structure
5. Each quiz question MUST have detailed explanation
6. Only valid JSON, no additional explanations before/after`;
};

// Call LLM with automatic provider fallback (Groq → Gemini → OpenRouter → etc)
async function callLLMWithFallback(prompt: string): Promise<CourseData> {
  console.log('[LLM] Requesting course generation with provider fallback...');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 second timeout

  try {
    // Get LLM client with automatic fallback to available providers
    const llmClient = await createLLMClientWithFallback();
    console.log('[LLM] Using fallback system to find available provider');

    // Call the LLM
    const response = await llmClient.generate(prompt, {
      temperature: 0.5,
      maxTokens: 4000
    });

    clearTimeout(timeoutId);
    console.log('[LLM] ✅ Course generated successfully');
    
    // Parse JSON response
    const jsonStr = response.content.includes('```json')
      ? response.content.split('```json')[1].split('```')[0].trim()
      : response.content.includes('```')
      ? response.content.split('```')[1].split('```')[0].trim()
      : response.content.trim();

    const parsed = JSON.parse(jsonStr) as CourseData;
    return parsed;
  } catch (error) {
    clearTimeout(timeoutId);
    const errorMsg = error instanceof Error ? error.message : String(error);
    
    if (errorMsg.includes('aborted')) {
      throw new Error('Course generation timeout - LLM took too long');
    }
    
    console.error('[LLM] Generation failed:', errorMsg);
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

    // Generate prompt and call LLM with automatic fallback
    const prompt = generatePrompt(params.topic, params.difficulty, params.duration, params.locale);
    const courseData = await callLLMWithFallback(prompt);

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
