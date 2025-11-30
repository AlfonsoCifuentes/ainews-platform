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
import { sanitizeAndFixJSON, parseJSON } from '@/lib/utils/json-fixer';

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
  const wordCount = duration === 'short' ? 3000 : duration === 'medium' ? 3500 : 4000;
  
  if (locale === 'es') {
    return `Eres un EXPERTO VETERANO del ámbito "${topic}" con 25+ años de experiencia profesional. Estás escribiendo un LIBRO DE TEXTO COMPLETO y profesional para estudiantes universitarios de postgrado.

Este es el ÚNICO recurso educativo que estos estudiantes tendrán sobre este tema.
Por lo tanto, tu responsabilidad es EXTRAORDINARIA: cada palabra debe contar, cada ejemplo debe iluminar, cada sección debe ser sustancial.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ESTÁNDARES DE CALIDAD PARA ESTE LIBRO DE TEXTO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RIGOR ACADÉMICO:
✓ Nivel de postgrado universitario - esto es un libro de texto profesional
✓ Terminología precisa y consistente; define términos especializados en primera mención
✓ Construye argumentos lógicamente: fundamentos → aplicaciones → avanzado
✓ Incluye datos cuantificables, métricas de desempeño, benchmarks reales
✓ Referencia marcos de trabajo, estándares, metodologías por nombre específico
✓ Discute compensaciones, limitaciones y CUÁNDO NO usar ciertos enfoques
✓ Aborda concepciones erróneas comunes y errores profesionales

PROFUNDIDAD Y SUSTANCIA:
✓ Cada módulo MÍNIMO ${wordCount} palabras (no 2500, no es suficiente)
✓ Distribuidas así:
  - Introducción y contexto: 300-400 palabras
  - Conceptos fundamentales: 500-700 palabras
  - Teoría y principios principales: 700-900 palabras
  - Inmersión profunda avanzada: 700-900 palabras
  - Aplicaciones reales y casos de estudio: 500-700 palabras
  - Guía de implementación práctica: 400-500 palabras
  - Casos límite, limitaciones, consideraciones avanzadas: 300-400 palabras
  - Síntesis y conclusiones: 300-400 palabras

CONTENIDO VARIADO Y RICO:
✓ Explicaciones conceptuales (el "por qué")
✓ Procedimientos técnicos paso a paso (el "cómo")
✓ 5-7 casos de estudio reales y específicos (no genéricos):
  - Incluye nombres de empresas, métricas específicas, resultados reales
  - Explica qué funcionó y por qué
  - Discute lecciones aprendidas y transferencia a nuevos contextos
✓ Ejemplos de código, algoritmos, implementaciones técnicas
✓ Formulas matemáticas, ecuaciones, diagramas técnicos (en markdown)
✓ Mejores prácticas industriales y estándares profesionales
✓ Evolución histórica y tendencias actuales
✓ Técnicas avanzadas para profesionales que quieren profundizar

ESTRUCTURA PROFESIONAL:
✓ Jerarquía markdown clara (# ## ### para secciones lógicas)
✓ Cada sección principal tiene 3-5 subsecciones
✓ Texto denso quebrado con listas con viñetas, tablas, ejemplos
✓ Usa cerca de código para contenido técnico
✓ Incluye descripciones visuales o diagramas ASCII donde sea útil
✓ Cada sección sustancial: mínimo 150 palabras
✓ Complejidad progresiva

TONO Y VOZ PROFESIONAL:
✓ Escribe como MENTOR y experto en la materia, NO como asistente IA
✓ Usa "nosotros" al discutir práctica industrial establecida
✓ Dirige al lector directamente: "Debes entender...", "Notarás que..."
✓ Comparte perspectivas de experiencia profesional
✓ Usa preguntas retóricas para promover pensamiento crítico
✓ Balancea profundidad técnica con claridad para lectores inteligentes

RECURSOS EDUCATIVOS:
✓ Incluye 7-10 recursos cuidadosamente curados
✓ Deben ser:
  - Recientes y autoridades (últimos 7 años idealmente)
  - Directamente relevantes a este módulo específico
  - De fuentes respetadas: papers académicos, líderes de industria, documentación oficial
  - Tipos diversos: artículos, videos, documentación, libros
  - URLs realistas y específicas (NO placeholders)
✓ Cada recurso extiende comprensión, no repite contenido

LISTA DE VERIFICACIÓN - CONTENIDO DE CALIDAD PREMIUM:
✗ NO [ejemplo], [más contenido] u otros placeholders
✗ NO contenido relleno para alcanzar palabra mínima
✗ NO repetición del mismo concepto en secciones diferentes
✗ NO oversimplificación de tópicos complejos
✗ NO omisión de partes difíciles o controvertidas
✗ NO escritura genérica "estilo IA"
✓ Cada párrafo añade valor DISTINTO e INSUSTITUIBLE
✓ Ejemplos son específicos, detallados, iluminadores
✓ Explicaciones son exhaustivas, no superficiales
✓ Compensaciones y limitaciones abordadas honestamente
✓ Profesionales avanzados encontrarían valor genuino

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ESTRUCTURA JSON REQUERIDA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Genera EXACTAMENTE ${moduleCount} módulos. Cada uno estructura así:

{
  "title": "Título del curso atractivo, claro, profesional",
  "description": "Descripción detallada (máx. 150 palabras) explicando qué aprenderán estudiantes y valor concreto que obtendrán",
  "objectives": ["Objetivo 1 concreto y medible (action verb)", "Objetivo 2 concreto", "Objetivo 3 concreto", "Objetivo 4 concreto", "Objetivo 5 concreto"],
  "modules": [
    {
      "title": "Módulo 1: Título descriptivo que resume contenido principal",
      "description": "Descripción clara de qué aprenderá estudiante (2-3 oraciones, 50-100 palabras)",
      "content": "CONTENIDO EDUCATIVO DE ${wordCount}+ PALABRAS DISTRIBUIDAS EN ESTAS SECCIONES EXACTAS: 1) INTRODUCCIÓN Y CONTEXTO (300-400 palabras, por qué importa, conéctalo a relevancia real) 2) CONCEPTOS FUNDAMENTALES (500-700 palabras, define términos con precisión, establece vocabulario compartido) 3) TEORÍA Y PRINCIPIOS PRINCIPALES (700-900 palabras, explicaciones profundas, lógica subyacente, relaciones entre elementos, referencias a marcos establecidos) 4) INMERSIÓN PROFUNDA AVANZADA (700-900 palabras, exploración extendida de aspectos complejos, técnicas avanzadas, desarrollos state-of-the-art, mejores prácticas emergentes) 5) APLICACIONES REALES Y CASOS DE ESTUDIO (500-700 palabras, incluye 5-7 casos concretos específicos con nombres de empresas, métricas, cronogramas, explica qué funcionó y por qué, cómo aplicar lecciones a nuevos contextos) 6) GUÍA PRÁCTICA DE IMPLEMENTACIÓN (400-500 palabras, procedimientos paso a paso, herramientas y marcos a usar, ejemplos de código, estrategias de mitigación de errores) 7) CASOS LÍMITE, LIMITACIONES Y CONSIDERACIONES AVANZADAS (300-400 palabras, cuándo NO usar este enfoque, condiciones límite y excepciones, limitaciones y compensaciones, sutilezas que profesionales deben saber) 8) SÍNTESIS Y CONCLUSIONES (300-400 palabras, sintetiza aprendizajes clave, cómo encaja en curso completo, qué practicar, conexión con próximo módulo). USO DE MARKDOWN: headers, listas, código, énfasis, tablas. SÉ ESPECÍFICO Y PROFUNDO. EXPLICA EL POR QUÉ, no solo EL QUÉ. PROHIBIDO: contenido corto, placeholders, repeticiones, superficial, omisiones de secciones.",
      "keyTakeaways": ["Punto clave principal 1", "Punto clave principal 2", "Punto clave principal 3", "Punto clave principal 4", "Punto clave principal 5"],
      "estimatedMinutes": 60,
      "quiz": [
        {"question": "Pregunta enfocada en concepto principal del módulo?", "options": ["Opción incorrecta A pero plausible", "Opción incorrecta B pero plausible", "RESPUESTA CORRECTA C", "Opción incorrecta D pero plausible"], "correctAnswer": 2, "explanation": "Explicación DETALLADA de por qué C es correcta, por qué A/B/D son incorrectas, con referencias a contenido del módulo"},
        {"question": "Pregunta sobre aplicación práctica y case studies?", "options": ["A", "RESPUESTA CORRECTA B", "C", "D"], "correctAnswer": 1, "explanation": "Explicación completa con contexto"},
        {"question": "Pregunta sobre concepto secundario importante?", "options": ["A", "B", "RESPUESTA CORRECTA C", "D"], "correctAnswer": 2, "explanation": "Explicación detallada"}
      ],
      "resources": ["Referencia educativa 1 - URL con descripción específica", "Referencia educativa 2 - URL con descripción", "Referencia educativa 3", "Referencia educativa 4", "Referencia educativa 5", "Referencia educativa 6", "Referencia educativa 7"]
    }
  ]
}

REQUISITOS FINALES - NO NEGOCIABLES:
• Genera EXACTAMENTE ${moduleCount} módulos (no más, no menos)
• Cada módulo DEBE tener MÍNIMO ${wordCount} palabras de contenido
• Contenido DEBE ser educativo, profesional, sustancial - CERO placeholders o stubs
• Markdown profesional con estructura clara y subencabezados
• Cada pregunta de quiz DEBE tener explicación detallada (100+ palabras)
• SOLO JSON válido, sin explicaciones adicionales antes/después
• Formato correcto: válido y parseable inmediatamente`;
  }
  
  return `You are a VETERAN EXPERT in "${topic}" with 25+ years of professional experience. You are writing a COMPLETE professional TEXTBOOK for graduate-level university students.

This is the ONLY educational resource these students will have on this topic.
Therefore, your responsibility is EXTRAORDINARY: every word must count, every example must illuminate, every section must be substantial.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
QUALITY STANDARDS FOR THIS TEXTBOOK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ACADEMIC RIGOR:
✓ Graduate university level - this is a professional textbook
✓ Precise and consistent terminology; define specialized terms on first mention
✓ Build arguments logically: foundations → applications → advanced
✓ Include quantifiable data, performance metrics, real benchmarks
✓ Reference specific frameworks, standards, methodologies by name
✓ Discuss trade-offs, limitations, and WHEN NOT to use certain approaches
✓ Address common misconceptions and professional pitfalls

DEPTH AND SUBSTANCE:
✓ Each module MINIMUM ${wordCount} words (not 2500, that's insufficient)
✓ Distributed across:
  - Introduction and context: 300-400 words
  - Foundational concepts: 500-700 words
  - Core theory and principles: 700-900 words
  - Advanced deep dive: 700-900 words
  - Real-world applications and case studies: 500-700 words
  - Practical implementation guide: 400-500 words
  - Edge cases, limitations, advanced considerations: 300-400 words
  - Synthesis and conclusions: 300-400 words

RICH AND VARIED CONTENT:
✓ Conceptual explanations (the "why")
✓ Step-by-step technical procedures (the "how")
✓ 5-7 real and specific case studies (not generic):
  - Include company names, specific metrics, actual results
  - Explain what worked and why
  - Discuss lessons learned and transfer to new contexts
✓ Code examples, algorithms, technical implementations
✓ Mathematical formulas, equations, technical diagrams (in markdown)
✓ Industry best practices and professional standards
✓ Historical evolution and current trends
✓ Advanced techniques for practitioners going deeper

PROFESSIONAL STRUCTURE:
✓ Clear markdown hierarchy (# ## ### for logical sections)
✓ Each major section has 3-5 subsections
✓ Dense text broken with bullet points, tables, examples
✓ Use code fences for technical content
✓ Include visual descriptions or ASCII diagrams where helpful
✓ Each section substantial: minimum 150 words
✓ Progressive complexity

PROFESSIONAL TONE AND VOICE:
✓ Write as MENTOR and subject matter expert, NOT as AI assistant
✓ Use "we" when discussing established industry practice
✓ Address reader directly: "You should understand...", "You'll notice..."
✓ Share insights from professional experience
✓ Use rhetorical questions to promote critical thinking
✓ Balance technical depth with clarity for intelligent readers

EDUCATIONAL RESOURCES:
✓ Include 7-10 carefully curated resources
✓ Resources must be:
  - Recent and authoritative (last 7 years ideally)
  - Directly relevant to this specific module
  - From respected sources: academic papers, industry leaders, official docs
  - Diverse types: articles, videos, documentation, books
  - Realistic and specific URLs (NO placeholders)
✓ Each resource extends understanding, not repeats content

QUALITY CHECKLIST - PREMIUM CONTENT:
✗ NO [example], [more content] or other placeholders
✗ NO filler content to reach word minimum
✗ NO repetition of same concept across sections
✗ NO oversimplification of complex topics
✗ NO omission of hard or controversial parts
✗ NO generic "AI-like" writing
✓ Every paragraph adds DISTINCT, IRREPLACEABLE value
✓ Examples are specific, detailed, illuminating
✓ Explanations are exhaustive, not superficial
✓ Trade-offs and limitations addressed honestly
✓ Advanced professionals would find genuine value

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REQUIRED JSON STRUCTURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Generate EXACTLY ${moduleCount} modules. Each structured as:

{
  "title": "Attractive, clear, professional course title",
  "description": "Detailed description (max. 150 words) explaining what students will learn and concrete value they'll gain",
  "objectives": ["Objective 1 concrete and measurable (action verb)", "Objective 2 concrete", "Objective 3 concrete", "Objective 4 concrete", "Objective 5 concrete"],
  "modules": [
    {
      "title": "Module 1: Descriptive title summarizing main content",
      "description": "Clear description of what student will learn (2-3 sentences, 50-100 words)",
      "content": "EDUCATIONAL CONTENT OF ${wordCount}+ WORDS DISTRIBUTED ACROSS THESE EXACT SECTIONS: 1) INTRODUCTION AND CONTEXT (300-400 words, why this matters, connect to real relevance) 2) FOUNDATIONAL CONCEPTS (500-700 words, define terms with precision, establish shared vocabulary) 3) CORE THEORY AND PRINCIPLES (700-900 words, deep explanations, underlying logic, element relationships, references to established frameworks) 4) ADVANCED DEEP DIVE (700-900 words, extended exploration of complex aspects, advanced techniques, state-of-the-art developments, emerging best practices) 5) REAL-WORLD APPLICATIONS AND CASE STUDIES (500-700 words, include 5-7 specific concrete cases with company names, metrics, timelines, explain what worked and why, how to apply lessons to different contexts) 6) PRACTICAL IMPLEMENTATION GUIDE (400-500 words, step-by-step procedures, tools and frameworks to use, code examples, error mitigation strategies) 7) EDGE CASES, LIMITATIONS AND ADVANCED CONSIDERATIONS (300-400 words, when NOT to use this approach, boundary conditions and exceptions, limitations and trade-offs, nuances professionals should know) 8) SYNTHESIS AND CONCLUSIONS (300-400 words, synthesize key takeaways, how this fits in larger course, what to practice, preview of next module connection). MARKDOWN USAGE: headers, lists, code, emphasis, tables. BE SPECIFIC AND DEEP. EXPLAIN WHY, not just WHAT. PROHIBITED: short content, placeholders, repetitions, superficial, omitted sections.",
      "keyTakeaways": ["Main key takeaway 1", "Main key takeaway 2", "Main key takeaway 3", "Main key takeaway 4", "Main key takeaway 5"],
      "estimatedMinutes": 60,
      "quiz": [
        {"question": "Question focused on module's main concept?", "options": ["Incorrect option A but plausible", "Incorrect option B but plausible", "CORRECT ANSWER C", "Incorrect option D but plausible"], "correctAnswer": 2, "explanation": "DETAILED explanation of why C is correct, why A/B/D are incorrect, with references to module content"},
        {"question": "Question about practical application and case studies?", "options": ["A", "CORRECT ANSWER B", "C", "D"], "correctAnswer": 1, "explanation": "Complete explanation with context"},
        {"question": "Question about important secondary concept?", "options": ["A", "B", "CORRECT ANSWER C", "D"], "correctAnswer": 2, "explanation": "Detailed explanation"}
      ],
      "resources": ["Educational reference 1 - URL with specific description", "Educational reference 2 - URL with description", "Educational reference 3", "Educational reference 4", "Educational reference 5", "Educational reference 6", "Educational reference 7"]
    }
  ]
}

FINAL NON-NEGOTIABLE REQUIREMENTS:
• Generate EXACTLY ${moduleCount} modules (no more, no less)
• Each module MUST have MINIMUM ${wordCount} words of content
• Content MUST be educational, professional, substantial - ZERO placeholders or stubs
• Professional markdown with clear structure and subheadings
• Each quiz question MUST have detailed explanation (100+ words)
• ONLY valid JSON, no additional explanations before/after
• Correct format: valid and immediately parseable`;
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
    
    // Use robust JSON fixing utility
    const fixed = sanitizeAndFixJSON(response.content);
    const parsed = parseJSON<CourseData>(fixed, 'course generation');
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
