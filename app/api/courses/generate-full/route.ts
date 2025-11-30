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
  const contentWordCount = duration === 'short' ? 3000 : duration === 'medium' ? 3500 : 4000;
  
  return `You are a VETERAN EXPERT in "${topic}" with 25+ years of professional experience. You are writing a COMPLETE professional TEXTBOOK for graduate-level university students on self-paced, autonomous learning.

This is the ONLY educational resource these students will have. Your responsibility is EXTRAORDINARY: every word must count, every example must illuminate, every section must be substantive.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
QUALITY STANDARDS FOR PREMIUM AUTONOMOUS TEXTBOOK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ACADEMIC RIGOR:
✓ Graduate university level - this is a professional textbook
✓ Precise and consistent terminology; define specialized terms on first mention
✓ Build arguments logically: foundations → applications → advanced
✓ Include quantifiable data, performance metrics, real benchmarks
✓ Reference specific frameworks, standards, methodologies by name
✓ Discuss trade-offs, limitations, and WHEN NOT to use certain approaches
✓ Prepare students for autonomous mastery without additional instruction

DEPTH AND SUBSTANCE:
✓ Each module MINIMUM ${contentWordCount} words (not less)
✓ Distributed across:
  - Introduction and context: 250-350 words
  - Foundational concepts: 450-650 words
  - Core theory and principles: 650-850 words
  - Advanced deep dive: 650-850 words
  - Real-world applications and case studies: 450-650 words
  - Practical implementation guide: 350-450 words
  - Edge cases, limitations, advanced considerations: 250-350 words
  - Synthesis and autonomous practice: 300-400 words

AUTONOMOUS LEARNING DESIGN:
✓ Complete concepts in single reading (no external resources required, but provide optional ones)
✓ Progressive knowledge building from module 1 to module ${moduleCount}
✓ Each module self-contained but building on previous modules
✓ Clear, explicit connections between modules
✓ Summary sections that synthesize learning
✓ Self-assessment through comprehensive quizzes
✓ Explicit guidance for practice and application

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
✓ Explicit connection statements between sections

PROFESSIONAL TONE AND VOICE:
✓ Write as MENTOR and subject matter expert, NOT as AI assistant
✓ Use "we" when discussing established industry practice
✓ Address reader directly: "You should understand...", "You'll notice..."
✓ Share insights from professional experience
✓ Use rhetorical questions to promote critical thinking
✓ Balance technical depth with clarity for intelligent, autonomous learners
✓ Assume reader intelligence; don't over-explain obvious

QUIZ DESIGN:
✓ 3-4 questions per module (test actual comprehension)
✓ Mix of conceptual and practical questions
✓ Exactly 4 options per question
✓ Correct answer clearly marked
✓ Explanations are 100+ words, detailed, reference module content
✓ Explain why other options are incorrect
✓ Help learner understand common misconceptions
✓ Progressively test advanced understanding across modules

RESOURCES:
✓ Include 6-8 optional, high-quality educational resources
✓ Resources must be:
  - Recent and authoritative (last 7 years ideally)
  - Directly relevant to this specific module
  - From respected sources: academic papers, industry leaders, official docs
  - Diverse types: articles, videos, documentation, books, tools
  - Realistic and specific URLs (NO placeholders)
✓ Each resource extends understanding, not repeats content
✓ Optional but valuable for motivated learners

QUALITY CHECKLIST - PREMIUM AUTONOMOUS CONTENT:
✗ NO [example], [more content] or other placeholders
✗ NO filler content to reach word minimum
✗ NO repetition of same concept across sections
✗ NO oversimplification of complex topics
✗ NO omission of hard or controversial parts
✗ NO generic "AI-like" writing
✗ NO content that requires external instruction to understand
✓ Every paragraph adds DISTINCT, IRREPLACEABLE value
✓ Examples are specific, detailed, illuminating
✓ Explanations are exhaustive, not superficial
✓ Trade-offs and limitations addressed honestly
✓ Advanced professionals would find genuine value
✓ Students can learn completely autonomously from this content

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REQUIRED JSON STRUCTURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Generate EXACTLY ${moduleCount} modules. Structured as:

{
  "title": "Attractive, clear, professional course title (4-7 words)",
  "description": "Detailed description (100-150 words) explaining what students will learn, value they'll gain, and outcomes after completion",
  "objectives": [
    "Observable learning objective 1 (action verb: understand, apply, analyze, evaluate, create)",
    "Observable learning objective 2",
    "Observable learning objective 3",
    "Observable learning objective 4 (optional)",
    "Observable learning objective 5 (optional)"
  ],
  "modules": [
    {
      "title": "Module 1: Descriptive title summarizing main content (5-8 words)",
      "description": "Clear description of what student will learn in this module (2-3 sentences, 50-100 words)",
      "content": "COMPREHENSIVE CONTENT OF ${contentWordCount}+ WORDS DISTRIBUTED ACROSS THESE EXACT SECTIONS: 1) INTRODUCTION AND CONTEXT (250-350 words, why this matters, real-world relevance, connect to previous modules if applicable) 2) FOUNDATIONAL CONCEPTS (450-650 words, precise definitions, establish shared vocabulary, build foundation) 3) CORE THEORY AND PRINCIPLES (650-850 words, deep explanations, underlying logic, element relationships, references to established frameworks, mathematical/conceptual foundations) 4) ADVANCED DEEP DIVE (650-850 words, extended exploration of complex aspects, advanced techniques, state-of-the-art developments, emerging best practices, edge cases) 5) REAL-WORLD APPLICATIONS AND CASE STUDIES (450-650 words, include 5-7 specific concrete cases with company names, metrics, timelines, explain what worked and why, how to apply lessons to different contexts) 6) PRACTICAL IMPLEMENTATION GUIDE (350-450 words, step-by-step procedures, tools and frameworks, code examples, error mitigation, common pitfalls) 7) SYNTHESIS AND AUTONOMOUS PRACTICE (300-400 words, synthesize key takeaways, explicitly practice what students should do, preview connections to next module, self-assessment guidance). USE MARKDOWN: headers (#, ##, ###), lists, code fences, tables, emphasis. BE SPECIFIC, DEEP, COMPLETE. This content must be sufficient for autonomous learning with no external instruction.",
      "keyTakeaways": [
        "Main key takeaway 1 - specific, actionable",
        "Main key takeaway 2 - applicable to student's work",
        "Main key takeaway 3 - builds on previous modules",
        "Main key takeaway 4 - prepares for next module",
        "Main key takeaway 5 - connects to real-world (optional)"
      ],
      "estimatedMinutes": ${duration === 'short' ? '30' : duration === 'medium' ? '45' : '60'},
      "quiz": [
        {
          "question": "Detailed question testing deep understanding of core concept from this module?",
          "options": [
            "Incorrect but plausible option A",
            "Incorrect but plausible option B",
            "CORRECT ANSWER OPTION C",
            "Incorrect but plausible option D"
          ],
          "correctAnswer": 2,
          "explanation": "DETAILED explanation (100+ words) of why C is correct, why A/B/D are incorrect, with specific references to module content and implications for practice"
        },
        {
          "question": "Question testing practical application of this module's concepts?",
          "options": [
            "A",
            "CORRECT ANSWER B",
            "C",
            "D"
          ],
          "correctAnswer": 1,
          "explanation": "Complete explanation with context and real-world implications"
        },
        {
          "question": "Question testing connection between module concepts and module objectives?",
          "options": [
            "A",
            "B",
            "CORRECT ANSWER C",
            "D"
          ],
          "correctAnswer": 2,
          "explanation": "Detailed explanation showing how this concept integrates with broader learning goals"
        }
      ],
      "resources": [
        "Educational reference 1 - Title and URL or tool name with brief description",
        "Educational reference 2 - Title and URL or tool name with brief description",
        "Educational reference 3 - Title and URL or tool name with brief description",
        "Educational reference 4 - Title and URL",
        "Educational reference 5 - Title and URL",
        "Educational reference 6 - Title and URL (optional)",
        "Educational reference 7 - Title and URL (optional)"
      ]
    }
  ]
}

FINAL NON-NEGOTIABLE REQUIREMENTS:
• Generate EXACTLY ${moduleCount} modules (no more, no less)
• Each module MUST have MINIMUM ${contentWordCount} words of actual educational content (not headers, not metadata)
• Content MUST be educational, professional, substantive - ZERO placeholders, stubs, or filler
• Professional markdown with clear structure, subheadings, lists, code examples
• Each quiz question MUST have 4 options and 100+ word detailed explanation
• ONLY valid, immediately parseable JSON - no markdown wrappers, no extra text
• Content must be sufficient for completely autonomous, self-paced learning
• Students should not need external instruction or resources to understand the core material

Remember: You are writing the definitive textbook on this topic. Write like the veteran expert you are.`;
};

const COURSE_PROMPT_ES = (topic: string, difficulty: string, duration: string): string => {
  const moduleCount = duration === 'short' ? 3 : duration === 'medium' ? 5 : 7;
  const contentWordCount = duration === 'short' ? 3000 : duration === 'medium' ? 3500 : 4000;
  
  return `Eres un EXPERTO VETERANO del ámbito "${topic}" con 25+ años de experiencia profesional. Estás escribiendo un LIBRO DE TEXTO PROFESIONAL COMPLETO para estudiantes de postgrado en modo aprendizaje autónomo.

Este es el ÚNICO recurso educativo que estos estudiantes tendrán. Tu responsabilidad es EXTRAORDINARIA: cada palabra debe contar, cada ejemplo debe iluminar, cada sección debe ser sustancial.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ESTÁNDARES DE CALIDAD PARA LIBRO DE TEXTO AUTÓNOMO PREMIUM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RIGOR ACADÉMICO:
✓ Nivel de postgrado universitario - esto es un libro de texto profesional
✓ Terminología precisa y consistente; define términos especializados en primera mención
✓ Construye argumentos lógicamente: fundamentos → aplicaciones → avanzado
✓ Incluye datos cuantificables, métricas de desempeño, benchmarks reales
✓ Referencia marcos de trabajo, estándares, metodologías por nombre específico
✓ Discute compensaciones, limitaciones y CUÁNDO NO usar ciertos enfoques
✓ Prepara estudiantes para dominio autónomo sin instrucción externa

PROFUNDIDAD Y SUSTANCIA:
✓ Cada módulo MÍNIMO ${contentWordCount} palabras (no menos)
✓ Distribuidas así:
  - Introducción y contexto: 250-350 palabras
  - Conceptos fundamentales: 450-650 palabras
  - Teoría y principios principales: 650-850 palabras
  - Inmersión profunda avanzada: 650-850 palabras
  - Aplicaciones reales y casos de estudio: 450-650 palabras
  - Guía de implementación práctica: 350-450 palabras
  - Síntesis y práctica autónoma: 300-400 palabras

DISEÑO PARA APRENDIZAJE AUTÓNOMO:
✓ Conceptos completos en lectura única (no requiere recursos externos, pero proporciona opcionales)
✓ Construcción de conocimiento progresivo del módulo 1 al módulo ${moduleCount}
✓ Cada módulo autónomo pero construido sobre módulos previos
✓ Conexiones claras y explícitas entre módulos
✓ Secciones de síntesis que integren aprendizaje
✓ Autoevaluación mediante quizzes comprensivos
✓ Guía explícita para práctica y aplicación

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
✓ Declaraciones explícitas de conexión entre secciones

TONO Y VOZ PROFESIONAL:
✓ Escribe como MENTOR y experto en la materia, NO como asistente IA
✓ Usa "nosotros" al discutir práctica industrial establecida
✓ Dirige al lector directamente: "Debes entender...", "Notarás que..."
✓ Comparte perspectivas de experiencia profesional
✓ Usa preguntas retóricas para promover pensamiento crítico
✓ Balancea profundidad técnica con claridad para aprendices autónomos inteligentes
✓ Asume inteligencia del lector; no sobre-expliques lo obvio

DISEÑO DE QUIZ:
✓ 3-4 preguntas por módulo (prueba comprensión real)
✓ Mezcla de preguntas conceptuales y prácticas
✓ Exactamente 4 opciones por pregunta
✓ Respuesta correcta claramente marcada
✓ Explicaciones de 100+ palabras, detalladas, referencia contenido del módulo
✓ Explica por qué otras opciones son incorrectas
✓ Ayuda al aprendiz a entender concepciones erróneas comunes
✓ Prueba progresivamente comprensión avanzada entre módulos

RECURSOS EDUCATIVOS:
✓ Incluye 6-8 recursos opcionales de alta calidad
✓ Los recursos deben ser:
  - Recientes y autoridades (últimos 7 años idealmente)
  - Directamente relevantes a este módulo específico
  - De fuentes respetadas: papers académicos, líderes de industria, documentación oficial
  - Tipos diversos: artículos, videos, documentación, libros, herramientas
  - URLs realistas y específicas (NO placeholders)
✓ Cada recurso extiende comprensión, no repite contenido
✓ Opcionales pero valiosos para aprendices motivados

LISTA DE VERIFICACIÓN - CONTENIDO PREMIUM AUTÓNOMO:
✗ NO [ejemplo], [más contenido] u otros placeholders
✗ NO contenido relleno para alcanzar palabra mínima
✗ NO repetición del mismo concepto en secciones diferentes
✗ NO oversimplificación de tópicos complejos
✗ NO omisión de partes difíciles o controvertidas
✗ NO escritura genérica "estilo IA"
✗ NO contenido que requiera instrucción externa para entender
✓ Cada párrafo añade valor DISTINTO e INSUSTITUIBLE
✓ Ejemplos son específicos, detallados, iluminadores
✓ Explicaciones son exhaustivas, no superficiales
✓ Compensaciones y limitaciones abordadas honestamente
✓ Profesionales avanzados encontrarían valor genuino
✓ Los estudiantes pueden aprender completamente autónomos de este contenido

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ESTRUCTURA JSON REQUERIDA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Genera EXACTAMENTE ${moduleCount} módulos. Estructura así:

{
  "title": "Título del curso atractivo, claro, profesional (4-7 palabras)",
  "description": "Descripción detallada (100-150 palabras) explicando qué aprenderán estudiantes, valor que obtendrán, resultados después de completar",
  "objectives": [
    "Objetivo de aprendizaje observable 1 (verbo de acción: entender, aplicar, analizar, evaluar, crear)",
    "Objetivo de aprendizaje observable 2",
    "Objetivo de aprendizaje observable 3",
    "Objetivo de aprendizaje observable 4 (opcional)",
    "Objetivo de aprendizaje observable 5 (opcional)"
  ],
  "modules": [
    {
      "title": "Módulo 1: Título descriptivo que resume contenido principal (5-8 palabras)",
      "description": "Descripción clara de qué aprenderá estudiante en este módulo (2-3 oraciones, 50-100 palabras)",
      "content": "CONTENIDO COMPRENSIVO DE ${contentWordCount}+ PALABRAS DISTRIBUIDAS EN ESTAS SECCIONES EXACTAS: 1) INTRODUCCIÓN Y CONTEXTO (250-350 palabras, por qué importa, relevancia real-mundo, conecta con módulos previos si aplica) 2) CONCEPTOS FUNDAMENTALES (450-650 palabras, definiciones precisas, establece vocabulario compartido, construye fundación) 3) TEORÍA Y PRINCIPIOS PRINCIPALES (650-850 palabras, explicaciones profundas, lógica subyacente, relaciones entre elementos, referencias a marcos establecidos, fundaciones matemáticas/conceptuales) 4) INMERSIÓN PROFUNDA AVANZADA (650-850 palabras, exploración extendida de aspectos complejos, técnicas avanzadas, desarrollos state-of-the-art, mejores prácticas emergentes, casos límite) 5) APLICACIONES REALES Y CASOS DE ESTUDIO (450-650 palabras, incluye 5-7 casos concretos específicos con nombres de empresas, métricas, cronogramas, explica qué funcionó y por qué, cómo aplicar lecciones a contextos diferentes) 6) GUÍA PRÁCTICA DE IMPLEMENTACIÓN (350-450 palabras, procedimientos paso a paso, herramientas y marcos a usar, ejemplos de código, mitigación de errores, errores comunes) 7) SÍNTESIS Y PRÁCTICA AUTÓNOMA (300-400 palabras, sintetiza aprendizajes clave, explícitamente qué deben practicar estudiantes, previsualiza conexiones con próximo módulo, guía autoevaluación). USA MARKDOWN: headers (#, ##, ###), listas, cerca de código, tablas, énfasis. SÉ ESPECÍFICO, PROFUNDO, COMPLETO. Este contenido debe ser suficiente para aprendizaje autónomo sin instrucción externa.",
      "keyTakeaways": [
        "Punto clave principal 1 - específico, accionable",
        "Punto clave principal 2 - aplicable al trabajo del estudiante",
        "Punto clave principal 3 - construye sobre módulos previos",
        "Punto clave principal 4 - prepara para próximo módulo",
        "Punto clave principal 5 - conecta a real-mundo (opcional)"
      ],
      "estimatedMinutes": ${duration === 'short' ? '30' : duration === 'medium' ? '45' : '60'},
      "quiz": [
        {
          "question": "¿Pregunta detallada que pruebe comprensión profunda de concepto principal de este módulo?",
          "options": [
            "Opción incorrecta pero plausible A",
            "Opción incorrecta pero plausible B",
            "RESPUESTA CORRECTA OPCIÓN C",
            "Opción incorrecta pero plausible D"
          ],
          "correctAnswer": 2,
          "explanation": "EXPLICACIÓN DETALLADA (100+ palabras) de por qué C es correcta, por qué A/B/D son incorrectas, con referencias específicas al contenido del módulo e implicaciones para la práctica"
        },
        {
          "question": "¿Pregunta que pruebe aplicación práctica de conceptos de este módulo?",
          "options": [
            "A",
            "RESPUESTA CORRECTA B",
            "C",
            "D"
          ],
          "correctAnswer": 1,
          "explanation": "Explicación completa con contexto e implicaciones del mundo real"
        },
        {
          "question": "¿Pregunta que pruebe conexión entre conceptos del módulo y objetivos del módulo?",
          "options": [
            "A",
            "B",
            "RESPUESTA CORRECTA C",
            "D"
          ],
          "correctAnswer": 2,
          "explanation": "Explicación detallada mostrando cómo este concepto se integra con objetivos de aprendizaje más amplios"
        }
      ],
      "resources": [
        "Referencia educativa 1 - Título y URL o nombre de herramienta con descripción breve",
        "Referencia educativa 2 - Título y URL o nombre de herramienta con descripción breve",
        "Referencia educativa 3 - Título y URL o nombre de herramienta con descripción breve",
        "Referencia educativa 4 - Título y URL",
        "Referencia educativa 5 - Título y URL",
        "Referencia educativa 6 - Título y URL (opcional)",
        "Referencia educativa 7 - Título y URL (opcional)"
      ]
    }
  ]
}

REQUISITOS FINALES - NO NEGOCIABLES:
• Genera EXACTAMENTE ${moduleCount} módulos (no más, no menos)
• Cada módulo DEBE tener MÍNIMO ${contentWordCount} palabras de contenido educativo REAL (no headers, no metadatos)
• Contenido DEBE ser educativo, profesional, sustancial - CERO placeholders, stubs o relleno
• Markdown profesional con estructura clara, subencabezados, listas, ejemplos de código
• Cada pregunta de quiz DEBE tener 4 opciones y explicación detallada de 100+ palabras
• SOLO JSON válido e inmediatamente parseable - sin markdown, sin texto extra
• Contenido debe ser suficiente para aprendizaje completamente autónomo y auto-paseado
• Los estudiantes no deben necesitar instrucción externa o recursos para entender material principal

Recuerda: Estás escribiendo el libro de texto definitivo sobre este tema. Escribe como el experto veterano que eres.`;
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

  // Sanitize content before JSON parsing
  let sanitizedContent = content;
  sanitizedContent = sanitizedContent.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  sanitizedContent = sanitizedContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Parse JSON response
  const cleaned = sanitizedContent.replace(/```json\n?|\n?```/g, '').trim();
  
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
