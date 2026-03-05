/**
 * Complete Course Generation Endpoint - TEXTBOOK QUALITY
 * Generates full, university-grade textbook courses with modules, quizzes, and content
 * Uses cascade LLM fallback system for reliability
 * 
 * POST /api/courses/generate-full
 * Body: { topic, difficulty, duration, locale, quality?: 'standard' | 'textbook' }
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import { getSupabaseServerClient } from '@/lib/db/supabase';
import { sanitizeAndFixJSON, parseJSON } from '@/lib/utils/json-fixer';
import { 
  generateTextbookChapter, 
  assembleChapterMarkdown
} from '@/lib/ai/course-generator-textbook';
import { auditEditorialMarkdown, normalizeEditorialMarkdown } from '@/lib/courses/editorial-style';
import { generateCourseImages } from '@/lib/ai/course-image-generator';
import { batchTranslate, translateMarkdown, translateText } from '@/lib/ai/translator';

export const maxDuration = 300; // Extended for textbook quality
export const dynamic = 'force-dynamic';

const schema = z.object({
  topic: z.string().min(1).max(200),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
  duration: z.enum(['short', 'medium', 'long']).default('medium'),
  locale: z.enum(['en', 'es']).default('en'),
  quality: z.enum(['standard', 'textbook']).default('textbook') // Default to textbook quality
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

type Locale = 'en' | 'es';

async function translateCourseDataBundle(course: CourseData, fromLang: Locale, toLang: Locale): Promise<CourseData> {
  const title = await translateText(course.title, fromLang, toLang);
  const description = await translateText(course.description, fromLang, toLang);

  const objectives = Array.isArray(course.objectives)
    ? await batchTranslate(course.objectives, fromLang, toLang, 80)
    : [];

  const modules: Module[] = [];
  for (const mod of course.modules ?? []) {
    const moduleTitle = await translateText(mod.title, fromLang, toLang);
    const moduleDescription = await translateText(mod.description, fromLang, toLang);
    const moduleContent = await translateMarkdown(mod.content, fromLang, toLang);

    const keyTakeaways = Array.isArray(mod.keyTakeaways)
      ? await batchTranslate(mod.keyTakeaways, fromLang, toLang, 60)
      : [];

    modules.push({
      ...mod,
      title: moduleTitle,
      description: moduleDescription,
      content: moduleContent,
      keyTakeaways,
    });
  }

  return { ...course, title, description, objectives, modules };
}

async function buildCourseByLocale(course: CourseData, primaryLocale: Locale): Promise<Record<Locale, CourseData>> {
  const secondaryLocale: Locale = primaryLocale === 'en' ? 'es' : 'en';
  try {
    const translated = await translateCourseDataBundle(course, primaryLocale, secondaryLocale);
    return primaryLocale === 'en' ? { en: course, es: translated } : { en: translated, es: course };
  } catch (error) {
    console.warn('[Translator] Course translation failed, duplicating content', error);
    return { en: course, es: course };
  }
}

// ============================================================================
// PROMPTS
// ============================================================================

const _COURSE_PROMPT_EN = (topic: string, difficulty: string, duration: string): string => {
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

const _COURSE_PROMPT_ES = (topic: string, difficulty: string, duration: string): string => {
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

async function callOpenAI(prompt: string, options: { maxTokens: number; temperature?: number }): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const temperature = Number.isFinite(options.temperature) ? options.temperature : 0.7;

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
      temperature,
      max_tokens: options.maxTokens
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

  return content;
}

const CourseOutlineSchema = z.object({
  title: z.string().min(4),
  description: z.string().min(20),
  objectives: z.array(z.string()).min(5).max(10),
  modules: z.array(z.object({
    title: z.string().min(4),
    description: z.string().min(12),
    tags: z.array(z.string()).optional(),
  })).min(3).max(10),
});

const ModuleBundleSchema = z.object({
  content: z.string().min(800),
  keyTakeaways: z.array(z.string()).min(4).max(16),
  quiz: z.array(z.object({
    question: z.string().min(12),
    options: z.array(z.string()).length(4),
    correctAnswer: z.number().int().min(0).max(3),
    explanation: z.string().min(60),
  })).min(4).max(6),
  resources: z.array(z.string()).min(3).max(10),
  estimatedMinutes: z.number().int().min(10).max(120).optional(),
});

const ModulePlanSchema = z.object({
  sections: z
    .array(
      z.object({
        heading: z.string().min(6),
        goal: z.string().min(20),
        targetWords: z.number().int().min(250).max(2500),
      })
    )
    .min(10)
    .max(16),
  capstone: z
    .object({
      title: z.string().min(6),
      brief: z.string().min(60),
      deliverable: z.string().min(20),
      steps: z.array(z.string().min(8)).min(3).max(12),
    })
    .optional(),
});

const ModuleMetaSchema = z.object({
  keyTakeaways: z.array(z.string().min(8)).min(6).max(16),
  quiz: z
    .array(
      z.object({
        question: z.string().min(12),
        options: z.array(z.string()).length(4),
        correctAnswer: z.number().int().min(0).max(3),
        explanation: z.string().min(80),
      })
    )
    .min(4)
    .max(10),
  resources: z.array(z.string().min(6)).min(4).max(12),
  estimatedMinutes: z.number().int().min(10).max(180).optional(),
});

function resolveModuleCount(duration: string): number {
  return duration === 'short' ? 3 : duration === 'medium' ? 5 : 7;
}

function resolveEstimatedMinutes(duration: string): number {
  return duration === 'short' ? 30 : duration === 'medium' ? 45 : 60;
}

function resolveTargetWords(duration: string, quality: 'standard' | 'textbook'): number {
  if (quality === 'textbook') {
    return duration === 'short' ? 4500 : duration === 'medium' ? 6500 : 8500;
  }
  return duration === 'short' ? 1200 : duration === 'medium' ? 1600 : 2000;
}

function resolveTextbookPartCount(targetWords: number): number {
  const safeWords = Number.isFinite(targetWords) ? targetWords : 0;
  return Math.max(3, Math.min(5, Math.ceil(safeWords / 1800)));
}

function countWords(text: string): number {
  const stripped = String(text ?? '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`\n\r]*`/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!stripped) return 0;
  return stripped.split(' ').filter(Boolean).length;
}

function buildOutlinePrompt(args: {
  topic: string;
  difficulty: string;
  duration: string;
  locale: 'en' | 'es';
  quality: 'standard' | 'textbook';
}): string {
  const moduleCount = resolveModuleCount(args.duration);

  if (args.locale === 'es') {
    return `Eres un autor de libros de texto y editor senior. Devuelve SOLO JSON válido.

Diseña el plan de un curso de ${moduleCount} módulos sobre:
TEMA: "${args.topic}"
NIVEL: ${args.difficulty}
CALIDAD: ${args.quality}

Requisitos:
- Nada de frases meta tipo "este módulo convierte..." ni menciones a IA.
- Evita títulos genéricos tipo "Fundacional", "Núcleo", "Síntesis y Conclusión".
- El temario debe sonar humano, no robótico, y tener progresión clara.

Devuelve EXACTAMENTE este JSON:
{
  "title": "string",
  "description": "2-3 frases",
  "objectives": ["6-8 objetivos accionables"],
  "modules": [
    {
      "title": "título del módulo (sin prefijo Módulo 1)",
      "description": "1-2 frases",
      "tags": ["AI", "Curso", "..."]
    }
  ]
}

El array "modules" debe tener EXACTAMENTE ${moduleCount} elementos.`;
  }

  return `You are a senior textbook author and editor. Return ONLY valid JSON.

Design a ${moduleCount}-module course plan about:
TOPIC: "${args.topic}"
LEVEL: ${args.difficulty}
QUALITY: ${args.quality}

Requirements:
- No meta phrases like "this module turns..." and no mentions of AI.
- Avoid generic titles like "Foundational", "Core", "Synthesis and Conclusions".
- Make it sound human and engaging, with clear progression.

Return EXACTLY this JSON:
{
  "title": "string",
  "description": "2-3 sentences",
  "objectives": ["6-8 actionable objectives"],
  "modules": [
    {
      "title": "module title (no 'Module 1' prefix)",
      "description": "1-2 sentences",
      "tags": ["AI", "Course", "..."]
    }
  ]
}

The "modules" array MUST have EXACTLY ${moduleCount} items.`;
}

function buildModulePrompt(args: {
  courseTitle: string;
  courseDescription: string;
  objectives: string[];
  moduleIndex: number;
  moduleCount: number;
  moduleTitle: string;
  moduleDescription: string;
  difficulty: string;
  duration: string;
  locale: 'en' | 'es';
  quality: 'standard' | 'textbook';
}): string {
  const estimatedMinutes = resolveEstimatedMinutes(args.duration);
  const targetWords = resolveTargetWords(args.duration, args.quality);

  const bannedPhrases = args.locale === 'es'
    ? [
        'Este módulo convierte un tema',
        'Un módulo directo y estructurado',
        'INSIGHT >>',
        'Distinción clave:',
        'Patrón:',
        'Síntesis y Conclusión',
        'Fundacional',
        'Núcleo',
        'Avanzado',
      ]
    : [
        'This module turns',
        'A direct, structured module',
        'INSIGHT >>',
        'Key insight:',
        'Pattern:',
        'Synthesis and Conclusion',
        'Foundational',
        'Core',
        'Advanced',
      ];

  if (args.locale === 'es') {
    return `Escribe el MÓDULO ${args.moduleIndex + 1}/${args.moduleCount} del curso:
TÍTULO DEL CURSO: "${args.courseTitle}"
DESCRIPCIÓN DEL CURSO: "${args.courseDescription}"
OBJETIVOS DEL CURSO: ${args.objectives.map((o) => `- ${o}`).join('\n')}

MÓDULO: "${args.moduleTitle}"
RESUMEN DEL MÓDULO: "${args.moduleDescription}"
NIVEL: ${args.difficulty}
TIEMPO ESTIMADO: ${estimatedMinutes} min
OBJETIVO DE LONGITUD: ~${targetWords} palabras (contenido real, no headers)

Devuelve SOLO JSON válido con esta forma:
{
  "content": "MARKDOWN",
  "keyTakeaways": ["..."],
  "quiz": [
    { "question": "...", "options": ["A","B","C","D"], "correctAnswer": 0, "explanation": "60+ palabras" }
  ],
  "resources": ["..."],
  "estimatedMinutes": ${estimatedMinutes}
}

Reglas de contenido (MARKDOWN):
- Empieza con: # ${args.moduleTitle}
- Segunda línea: **⏱️ Tiempo:** ${estimatedMinutes} min | **📊 Nivel:** ${args.difficulty} | **🏷️ Tags:** \`AI\` \`Curso\` (añade 1-3 tags relevantes)
- Luego un standfirst corto en blockquote: > **...**
- Luego un separador: ---
- 4-6 secciones con títulos descriptivos (##). Evita headings plantilla.
- Incluye al menos 2 ejemplos concretos y 1 mini caso realista (sin citas falsas).
- Incluye 1 ejercicio práctico breve al final (sin soluciones largas).
- Evita muros de texto: párrafos de 2-5 frases, con transiciones naturales.

Prohibido incluir estas frases/formatos (ni similares): ${bannedPhrases.map((p) => `"${p}"`).join(', ')}

IMPORTANTE: el contenido debe ser natural, editorial y legible; nada de texto robótico o “plantilla”.`;
  }

  return `Write MODULE ${args.moduleIndex + 1}/${args.moduleCount} of the course:
COURSE TITLE: "${args.courseTitle}"
COURSE DESCRIPTION: "${args.courseDescription}"
COURSE OBJECTIVES:\n${args.objectives.map((o) => `- ${o}`).join('\n')}

MODULE: "${args.moduleTitle}"
MODULE SUMMARY: "${args.moduleDescription}"
LEVEL: ${args.difficulty}
ESTIMATED TIME: ${estimatedMinutes} min
TARGET LENGTH: ~${targetWords} words (real content, not headers)

Return ONLY valid JSON with this shape:
{
  "content": "MARKDOWN",
  "keyTakeaways": ["..."],
  "quiz": [
    { "question": "...", "options": ["A","B","C","D"], "correctAnswer": 0, "explanation": "60+ words" }
  ],
  "resources": ["..."],
  "estimatedMinutes": ${estimatedMinutes}
}

Markdown rules:
- Start with: # ${args.moduleTitle}
- Second line: **⏱️ Time:** ${estimatedMinutes} min | **📊 Level:** ${args.difficulty} | **🏷️ Tags:** \`AI\` \`Course\` (add 1-3 relevant tags)
- Then a short standfirst in a blockquote: > **...**
- Then a separator: ---
- 4-6 sections with descriptive headings (##). Avoid template headings.
- Include at least 2 concrete examples and 1 small realistic case (no fake citations).
- Include 1 short practical exercise at the end (no long solutions).
- Avoid walls of text: 2-5 sentences per paragraph, with natural transitions.

Forbidden phrases/formats (or close variants): ${bannedPhrases.map((p) => `"${p}"`).join(', ')}

IMPORTANT: make it human, editorial, and pleasant to read (not robotic).`;
}

type ModulePlan = z.infer<typeof ModulePlanSchema>;
type ModulePlanSection = ModulePlan['sections'][number];

function splitSectionsIntoParts(sections: ModulePlanSection[], partCount: number): ModulePlanSection[][] {
  const safePartCount = Math.max(1, Math.min(5, Math.floor(partCount)));
  if (sections.length === 0) return Array.from({ length: safePartCount }, () => []);
  if (safePartCount === 1) return [sections];

  const totalWords = sections.reduce((sum, s) => sum + (s.targetWords ?? 0), 0);
  const targetPerPart = totalWords > 0 ? totalWords / safePartCount : sections.length / safePartCount;

  const parts: ModulePlanSection[][] = [];
  let current: ModulePlanSection[] = [];
  let currentScore = 0;

  for (const section of sections) {
    const score = totalWords > 0 ? (section.targetWords ?? 0) : 1;

    if (
      parts.length < safePartCount - 1 &&
      current.length >= 2 &&
      currentScore >= targetPerPart
    ) {
      parts.push(current);
      current = [];
      currentScore = 0;
    }

    current.push(section);
    currentScore += score;
  }

  if (current.length) parts.push(current);

  while (parts.length < safePartCount) parts.push([]);

  if (parts.length > safePartCount) {
    const head = parts.slice(0, safePartCount - 1);
    const tail = parts.slice(safePartCount - 1).flat();
    return [...head, tail];
  }

  return parts;
}

function buildModulePlanPrompt(args: {
  courseTitle: string;
  courseDescription: string;
  objectives: string[];
  moduleTitle: string;
  moduleDescription: string;
  difficulty: string;
  duration: string;
  locale: 'en' | 'es';
  targetWords: number;
}): string {
  const common = [
    `COURSE: "${args.courseTitle}"`,
    `COURSE DESCRIPTION: "${args.courseDescription}"`,
    `MODULE: "${args.moduleTitle}"`,
    `MODULE SUMMARY: "${args.moduleDescription}"`,
    `LEVEL: ${args.difficulty}`,
    `TARGET TOTAL LENGTH: ~${args.targetWords} words (±10%)`,
  ].join('\n');

  const objectives = (args.objectives ?? []).map((o) => `- ${o}`).join('\n');

  if (args.locale === 'es') {
    return `Eres un autor de libros de texto y editor senior. Devuelve SOLO JSON válido (sin markdown fences).

Diseña la tabla de contenidos (TOC) del módulo como un capítulo de libro paso a paso.

${common}
OBJETIVOS DEL CURSO:
${objectives}

Requisitos:
- 10 a 16 secciones con títulos específicos (nada genérico tipo "Fundacional", "Núcleo", "Avanzado", "Síntesis y Conclusión").
- Cada sección debe ser útil y práctica: combina explicación, ejemplo trabajado y/o mini-ejercicio.
- Incluye: fundamentos, procedimiento paso a paso, errores comunes, checklist, mini-proyecto guiado y ejercicios de práctica.
- Nada de frases meta ("Este módulo convierte..."), ni menciones a IA.

Devuelve EXACTAMENTE este JSON:
{
  "sections": [
    { "heading": "...", "goal": "Qué aprende el lector", "targetWords": 600 }
  ],
  "capstone": {
    "title": "Título del mini-proyecto",
    "brief": "Contexto y objetivo del mini-proyecto (2-4 frases)",
    "deliverable": "Qué debe entregar el alumno",
    "steps": ["Paso 1", "Paso 2", "Paso 3", "Paso 4", "Paso 5"]
  }
}

Notas:
- En "heading" NO incluyas el prefijo "##" en el texto (solo el título).`;
  }

  return `You are a senior textbook author and editor. Return ONLY valid JSON (no markdown fences).

Design the module table of contents as a step-by-step textbook chapter.

${common}
COURSE OBJECTIVES:
${objectives}

Requirements:
- 10 to 16 sections with specific titles (avoid generic titles like "Foundational", "Core", "Advanced", "Synthesis and Conclusion").
- Each section must be practical: mix explanation + worked example and/or mini exercise.
- Include: fundamentals, step-by-step procedure, common pitfalls, checklists, a guided mini-project, and practice exercises.
- No meta phrases ("This module turns...") and no mentions of AI.

Return EXACTLY this JSON:
{
  "sections": [
    { "heading": "...", "goal": "What the learner will be able to do", "targetWords": 600 }
  ],
  "capstone": {
    "title": "Mini-project title",
    "brief": "2-4 sentences of context and goal",
    "deliverable": "What the learner must produce",
    "steps": ["Step 1", "Step 2", "Step 3", "Step 4", "Step 5"]
  }
}`;
}

function buildModuleContentPartPrompt(args: {
  courseTitle: string;
  moduleTitle: string;
  moduleDescription: string;
  difficulty: string;
  estimatedMinutes: number;
  locale: 'en' | 'es';
  partIndex: number;
  partCount: number;
  partTargetWords: number;
  sections: ModulePlanSection[];
  capstone?: ModulePlan['capstone'];
}): string {
  const includeHook = args.partIndex === 0;
  const isLast = args.partIndex === args.partCount - 1;

  const banned = args.locale === 'es'
    ? [
        'Este módulo convierte un tema',
        'Un módulo directo y estructurado',
        'Idea ancla del módulo',
        'INSIGHT >>',
        'Distinción clave:',
        'Patrón:',
        'Síntesis y Conclusión',
        'Fundacional',
        'Núcleo',
        'Avanzado',
      ]
    : [
        'This module turns',
        'A direct, structured module',
        'Module anchor idea',
        'INSIGHT >>',
        'Key insight:',
        'Pattern:',
        'Synthesis and Conclusion',
        'Foundational',
        'Core',
        'Advanced',
      ];

  const sectionsList = args.sections
    .map((s, idx) => `${idx + 1}. ${s.heading} — ${s.goal} (~${s.targetWords} words)`)
    .join('\n');

  if (args.locale === 'es') {
    return `Escribe contenido en Markdown para el módulo (parte ${args.partIndex + 1}/${args.partCount}).

CURSO: "${args.courseTitle}"
MÓDULO: "${args.moduleTitle}"
NIVEL: ${args.difficulty}
OBJETIVO DE LONGITUD PARA ESTA PARTE: ~${args.partTargetWords} palabras

Reglas (estrictas):
- Devuelve SOLO Markdown (no JSON). No envuelvas toda la respuesta en un único bloque de código.
- Esta parte debe tener al menos ~${Math.round(args.partTargetWords * 0.85)} palabras (si te quedas corto, sigue escribiendo).
- Evita muros de texto: máximo 3 párrafos seguidos sin un “widget” (lista, tabla, quote, código, etc.).
- Código: usa fences con lenguaje (por ejemplo: ts, python) y cierra con una línea de 3 backticks sola (sin lenguaje). No metas texto normal ni ejercicios dentro de bloques de código. No uses Mermaid.
- Si escribes una frase que empiece por "En este ejemplo" o "Este ejemplo", colócala fuera del bloque de código (justo después) como frase corta en cursiva.
- Si muestras HTML/CSS, siempre dentro de un bloque de código con lenguaje.
- Nada de headings genéricos/plantilla.
- No pongas títulos de sección en blockquote (evita "> ### ..."). Usa headings normales "##".
- Prohibido incluir frases meta o “instrucciones para IA” (ni variantes cercanas): ${banned.map((p) => `"${p}"`).join(', ')}.

${includeHook ? `Estructura del inicio (solo en esta parte):
1) Primera línea: # ${args.moduleTitle}
2) Segunda línea: **Tiempo:** ${args.estimatedMinutes} min | **Nivel:** ${args.difficulty} | **Tags:** \`Curso\` \`AI\` (añade 1-3 tags relevantes)
3) Un standfirst corto en blockquote: > **...**
4) Un separador: ---
5) Incluye 1 pull quote con este formato: > ## "..." y una línea opcional de contexto.
6) Incluye 1 caja lateral como tabla de 1 celda:
   | 💡 TECH INSIGHT: Título específico |
   | :--- |
   | Texto breve y útil (2-4 frases). |
` : `NO repitas el título, meta, standfirst ni separador. Empieza directamente con el primer "##" que te corresponda.`}

Secciones a escribir (en este orden, usando "## {heading}" exactamente):
${sectionsList}

${isLast && args.capstone ? `Al final de esta parte, añade una sección "## Proyecto guiado: ${args.capstone.title}" e incluye:
- Contexto: ${args.capstone.brief}
- Entregable: ${args.capstone.deliverable}
- Pasos numerados: ${args.capstone.steps.map((s) => s.trim()).filter(Boolean).map((s, i) => `${i + 1}. ${s}`).join('\n')}

Y termina con una sección breve de "## Práctica" con 4-6 ejercicios sin solución larga.` : ''}`;
  }

  return `Write Markdown content for the module (part ${args.partIndex + 1}/${args.partCount}).

COURSE: "${args.courseTitle}"
MODULE: "${args.moduleTitle}"
LEVEL: ${args.difficulty}
TARGET LENGTH FOR THIS PART: ~${args.partTargetWords} words

Rules (strict):
- Return ONLY Markdown (no JSON). Do NOT wrap the entire response in a single code block.
- This part must be at least ~${Math.round(args.partTargetWords * 0.85)} words (if you’re short, keep writing).
- Avoid walls of text: max 3 plain paragraphs in a row without a “widget” (list, table, quote, code, etc.).
- Code: always use fenced blocks with a language (e.g. ts, python) and close with a plain line of three backticks (no language). Never put prose/exercises inside code blocks. No Mermaid.
- If you write a line starting with "In this example" or "This example", place it outside the code block (immediately after) as a short italic sentence.
- If you show HTML/CSS, it must be inside a fenced code block with a language.
- Avoid generic/template headings.
- Do not put section titles inside blockquotes (avoid \"> ### ...\"). Use normal \"##\" headings.
- Forbidden meta/instructional phrases (or close variants): ${banned.map((p) => `"${p}"`).join(', ')}.

${includeHook ? `Opening structure (only in this part):
1) First line: # ${args.moduleTitle}
2) Second line: **Time:** ${args.estimatedMinutes} min | **Level:** ${args.difficulty} | **Tags:** \`Course\` \`AI\` (add 1-3 relevant tags)
3) A short standfirst in a blockquote: > **...**
4) A separator: ---
5) Include 1 pull quote using: > ## "..." and an optional context line.
6) Include 1 sidebar as a 1-cell table:
   | 💡 TECH INSIGHT: Specific title |
   | :--- |
   | 2-4 useful sentences. |
` : `Do NOT repeat title/meta/standfirst/separator. Start directly with the first required "##" section.`}

Sections to write (in order, using "## {heading}" exactly):
${sectionsList}

${isLast && args.capstone ? `At the end of this part, add a section "## Guided mini-project: ${args.capstone.title}" and include:
- Context: ${args.capstone.brief}
- Deliverable: ${args.capstone.deliverable}
- Numbered steps: ${args.capstone.steps.map((s) => s.trim()).filter(Boolean).map((s, i) => `${i + 1}. ${s}`).join('\n')}

Then end with a short "## Practice" section with 4-6 exercises (no long solutions).` : ''}`;
}

function buildModuleContentPartRepairPrompt(args: {
  draft: string;
  currentWords: number;
  courseTitle: string;
  moduleTitle: string;
  moduleDescription: string;
  difficulty: string;
  estimatedMinutes: number;
  locale: 'en' | 'es';
  partIndex: number;
  partCount: number;
  partTargetWords: number;
  sections: ModulePlanSection[];
  capstone?: ModulePlan['capstone'];
}): string {
  const includeHook = args.partIndex === 0;
  const isLast = args.partIndex === args.partCount - 1;
  const minWords = Math.round(args.partTargetWords * 0.85);

  const sectionsList = args.sections
    .map((s, idx) => `${idx + 1}. ${s.heading} — ${s.goal} (~${s.targetWords} words)`)
    .join('\n');

  if (args.locale === 'es') {
    return `Tu borrador para esta parte es demasiado corto o está mal maquetado.

Reescribe esta parte (no la resumas), ampliando y mejorando el contenido.

CURSO: "${args.courseTitle}"
MÓDULO: "${args.moduleTitle}"
NIVEL: ${args.difficulty}
PARTE: ${args.partIndex + 1}/${args.partCount}
OBJETIVO: ~${args.partTargetWords} palabras (mínimo ~${minWords})
BORRADOR ACTUAL: ~${args.currentWords} palabras

Reglas (estrictas):
- Devuelve SOLO Markdown (no JSON). No envuelvas toda la respuesta en un único bloque de código.
- Mantén el orden y los headings: usa "## {heading}" exactamente.
- No pongas títulos dentro de blockquotes (evita "> ### ...").
${includeHook ? `- Esta parte DEBE incluir el hook completo (H1 + meta + standfirst + --- + pull quote + tabla TECH INSIGHT).` : `- NO repitas el hook; empieza directamente con el primer "##" que te corresponda.`}
- Aporta profundidad: explicación + ejemplo trabajado + mini ejercicio o checklist por sección.
- Si incluyes código/comandos: usa bloques con fences y lenguaje, y cierra con una línea de 3 backticks sola (sin lenguaje). No metas texto normal ni ejercicios dentro del bloque.
- Evita frases meta/instrucciones para IA.

Secciones a escribir (en este orden):
${sectionsList}

${isLast && args.capstone ? `Al final incluye "## Proyecto guiado: ${args.capstone.title}" y luego "## Práctica" (4-6 ejercicios).` : ''}

BORRADOR (para mejorar; NO lo copies tal cual):
<BEGIN_DRAFT>
${args.draft.trim()}
<END_DRAFT>

Ahora devuelve la versión corregida y ampliada de esta parte.`;
  }

  return `Your draft for this part is too short or poorly formatted.

Rewrite this part (not a summary), expanding and improving it.

COURSE: "${args.courseTitle}"
MODULE: "${args.moduleTitle}"
LEVEL: ${args.difficulty}
PART: ${args.partIndex + 1}/${args.partCount}
TARGET: ~${args.partTargetWords} words (minimum ~${minWords})
CURRENT DRAFT: ~${args.currentWords} words

Rules (strict):
- Return ONLY Markdown (no JSON). Do NOT wrap the entire response in a single code block.
- Keep the same order and section headings: use "## {heading}" exactly.
- Do not put section titles inside blockquotes (avoid "> ### ...").
${includeHook ? `- This part MUST include the full hook (H1 + meta + standfirst + --- + pull quote + TECH INSIGHT table).` : `- Do NOT repeat the hook; start directly with the first required "##" section.`}
- Add depth: explanation + worked example + mini exercise or checklist per section.
- If you include code/commands: use fenced code blocks with a language and close with a plain line of three backticks (no language). Never put prose/exercises inside code blocks.
- Avoid meta/AI-instructional phrasing.

Sections to write (in this order):
${sectionsList}

${isLast && args.capstone ? `At the end include "## Guided mini-project: ${args.capstone.title}" and then "## Practice" (4-6 exercises).` : ''}

DRAFT (to improve; do NOT copy verbatim):
<BEGIN_DRAFT>
${args.draft.trim()}
<END_DRAFT>

Now return the corrected, expanded version of this part.`;
}

function buildModuleExpansionPrompt(args: {
  courseTitle: string;
  moduleTitle: string;
  moduleDescription: string;
  locale: 'en' | 'es';
  missingWords: number;
  existingHeadings: string[];
}): string {
  const headings = args.existingHeadings.map((h) => `- ${h}`).join('\n');
  const newWords = Math.max(1200, Math.min(args.missingWords, 2600));

  if (args.locale === 'es') {
    return `El módulo está demasiado corto. Añade contenido NUEVO para enriquecerlo.

CURSO: "${args.courseTitle}"
MÓDULO: "${args.moduleTitle}"
RESUMEN: "${args.moduleDescription}"
FALTAN APROX.: ${args.missingWords} palabras

Reglas:
- Devuelve SOLO Markdown (no JSON). No envuelvas toda la respuesta en un único bloque de código.
- NO repitas el título ni el hook.
- Escribe al menos ~${newWords} palabras NUEVAS (no un resumen), repartidas en 2-3 secciones (ideal: 900-1400 palabras por sección).
- Añade 2-3 secciones nuevas con títulos específicos y relacionados con el tema.
- Incluye al menos 2 ejemplos trabajados y una lista de “errores comunes”.
- Si incluyes código/comandos: usa bloques con fences y lenguaje, y cierra con una línea de 3 backticks sola (sin lenguaje).
- No uses títulos genéricos como "Síntesis", "Fundacional", etc.

Headings existentes (no repetir):
${headings}`;
  }

  return `The module is too short. Add NEW content to enrich it.

COURSE: "${args.courseTitle}"
MODULE: "${args.moduleTitle}"
SUMMARY: "${args.moduleDescription}"
MISSING APPROX.: ${args.missingWords} words

Rules:
- Return ONLY Markdown (no JSON). Do NOT wrap the entire response in a single code block.
- Do NOT repeat the title or hook.
- Write at least ~${newWords} NEW words (not a summary), across 2-3 new sections (ideal: 900-1400 words per section).
- Add 2-3 new sections with specific, topic-relevant titles.
- Include at least 2 worked examples and a “common pitfalls” list.
- If you include code/commands: use fenced code blocks with a language and close with a plain line of three backticks (no language).
- Avoid generic headings like "Synthesis", "Foundational", etc.

Existing headings (do not repeat):
${headings}`;
}

function buildModuleMetaPrompt(args: {
  courseTitle: string;
  moduleTitle: string;
  moduleDescription: string;
  difficulty: string;
  locale: 'en' | 'es';
  sections: ModulePlanSection[];
  estimatedMinutes: number;
}): string {
  const headings = args.sections.map((s) => `- ${s.heading}: ${s.goal}`).join('\n');

  if (args.locale === 'es') {
    return `Eres un autor de libros de texto. Devuelve SOLO JSON válido.

Genera materiales de estudio para este módulo (sin mencionar IA):
CURSO: "${args.courseTitle}"
MÓDULO: "${args.moduleTitle}"
RESUMEN: "${args.moduleDescription}"
NIVEL: ${args.difficulty}
TIEMPO: ${args.estimatedMinutes} min

Tabla de contenidos (para contexto):
${headings}

Devuelve EXACTAMENTE este JSON:
{
  "keyTakeaways": ["6-12 puntos accionables y concretos"],
  "quiz": [
    {
      "question": "Pregunta",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": 0,
      "explanation": "80+ palabras, explica por qué es correcta y por qué las otras no"
    }
  ],
  "resources": ["4-10 recursos opcionales (título + URL cuando sea posible)"],
  "estimatedMinutes": ${args.estimatedMinutes}
}

Reglas:
- 6 a 10 preguntas de quiz.
- Evita preguntas genéricas; deben evaluar comprensión real y aplicación.
- Las explicaciones deben ser claras y útiles (no “porque sí”).`;
  }

  return `You are a senior textbook author. Return ONLY valid JSON.

Generate study materials for this module (do not mention AI):
COURSE: "${args.courseTitle}"
MODULE: "${args.moduleTitle}"
SUMMARY: "${args.moduleDescription}"
LEVEL: ${args.difficulty}
TIME: ${args.estimatedMinutes} min

Table of contents (for context):
${headings}

Return EXACTLY this JSON:
{
  "keyTakeaways": ["6-12 concrete, actionable takeaways"],
  "quiz": [
    {
      "question": "Question",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": 0,
      "explanation": "80+ words explaining why it's correct and why others are wrong"
    }
  ],
  "resources": ["4-10 optional resources (title + URL when possible)"],
  "estimatedMinutes": ${args.estimatedMinutes}
}

Rules:
- 6 to 10 quiz questions.
- Avoid generic questions; test real understanding and application.
- Explanations must be helpful (not hand-wavy).`;
}

async function generateTextbookModuleWithGPT4o(args: {
  courseTitle: string;
  courseDescription: string;
  objectives: string[];
  moduleIndex: number;
  moduleCount: number;
  moduleTitle: string;
  moduleDescription: string;
  difficulty: string;
  duration: string;
  locale: 'en' | 'es';
}): Promise<Module> {
  const estimatedMinutes = resolveEstimatedMinutes(args.duration);
  const targetWords = resolveTargetWords(args.duration, 'textbook');

  const planRaw = await callOpenAI(
    buildModulePlanPrompt({
      courseTitle: args.courseTitle,
      courseDescription: args.courseDescription,
      objectives: args.objectives,
      moduleTitle: args.moduleTitle,
      moduleDescription: args.moduleDescription,
      difficulty: args.difficulty,
      duration: args.duration,
      locale: args.locale,
      targetWords,
    }),
    { maxTokens: 1400, temperature: 0.3 }
  );

  const planFixed = sanitizeAndFixJSON(planRaw);
  const planParsed = parseJSON<ModulePlan>(planFixed, `gpt4o module plan ${args.moduleIndex + 1}`);
  const plan = ModulePlanSchema.parse(planParsed);

  const normalizedSections = plan.sections
    .map((s) => ({
      ...s,
      heading: String(s.heading ?? '').replace(/^#+\s*/, '').trim(),
    }))
    .filter((s) => s.heading.length >= 4)
    .filter((s, idx, arr) => {
      const key = s.heading.toLowerCase();
      return arr.findIndex((x) => x.heading.toLowerCase() === key) === idx;
    });

  const partCount = resolveTextbookPartCount(targetWords);
  const parts = splitSectionsIntoParts(normalizedSections, partCount);
  const plannedWords = normalizedSections.reduce((sum, s) => sum + (s.targetWords ?? 0), 0) || targetWords;

  const partTargets = parts.map((p) => {
    const w = p.reduce((sum, s) => sum + (s.targetWords ?? 0), 0);
    return Math.max(900, Math.round((targetWords * w) / plannedWords));
  });
  if (partTargets.length) {
    const sum = partTargets.reduce((a, b) => a + b, 0);
    partTargets[partTargets.length - 1] = Math.max(900, partTargets[partTargets.length - 1] + (targetWords - sum));
  }

  const contentParts: string[] = [];
  for (let i = 0; i < parts.length; i += 1) {
    const sectionGroup = parts[i] ?? [];
    if (sectionGroup.length === 0) continue;

    const partMarkdown = await callOpenAI(
      buildModuleContentPartPrompt({
        courseTitle: args.courseTitle,
        moduleTitle: args.moduleTitle,
        moduleDescription: args.moduleDescription,
        difficulty: args.difficulty,
        estimatedMinutes,
        locale: args.locale,
        partIndex: i,
        partCount: parts.length,
        partTargetWords: partTargets[i] ?? Math.round(targetWords / parts.length),
        sections: sectionGroup,
        capstone: plan.capstone,
      }),
      { maxTokens: 6200, temperature: 0.75 }
    );

    let part = partMarkdown.trim();
    const words = countWords(part);
    const target = partTargets[i] ?? Math.round(targetWords / Math.max(1, parts.length));
    const minPartWords = Math.max(600, Math.round(target * 0.75));

    if (words > 0 && words < minPartWords) {
      const repaired = await callOpenAI(
        buildModuleContentPartRepairPrompt({
          draft: part,
          currentWords: words,
          courseTitle: args.courseTitle,
          moduleTitle: args.moduleTitle,
          moduleDescription: args.moduleDescription,
          difficulty: args.difficulty,
          estimatedMinutes,
          locale: args.locale,
          partIndex: i,
          partCount: parts.length,
          partTargetWords: target,
          sections: sectionGroup,
          capstone: plan.capstone,
        }),
        { maxTokens: 6800, temperature: 0.6 }
      );

      const repairedTrimmed = repaired.trim();
      if (countWords(repairedTrimmed) > words) {
        part = repairedTrimmed;
      }
    }

    contentParts.push(part);
  }

  let content = contentParts.filter(Boolean).join('\n\n').trim();
  content = normalizeEditorialMarkdown(content, {
    title: args.moduleTitle,
    standfirst: args.moduleDescription,
    locale: args.locale,
  });

  const existingHeadings = normalizedSections.map((s) => s.heading).filter(Boolean);
  const minWords = Math.round(targetWords * 0.85);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const currentWords = countWords(content);
    if (currentWords <= 0 || currentWords >= minWords) break;

    const missingWords = minWords - currentWords;
    const expansion = await callOpenAI(
      buildModuleExpansionPrompt({
        courseTitle: args.courseTitle,
        moduleTitle: args.moduleTitle,
        moduleDescription: args.moduleDescription,
        locale: args.locale,
        missingWords,
        existingHeadings,
      }),
      { maxTokens: 5200, temperature: 0.75 }
    );

    content = normalizeEditorialMarkdown(`${content.trim()}\n\n${expansion.trim()}\n`, {
      title: args.moduleTitle,
      standfirst: args.moduleDescription,
      locale: args.locale,
    });
  }

  const metaRaw = await callOpenAI(
    buildModuleMetaPrompt({
      courseTitle: args.courseTitle,
      moduleTitle: args.moduleTitle,
      moduleDescription: args.moduleDescription,
      difficulty: args.difficulty,
      locale: args.locale,
      sections: normalizedSections,
      estimatedMinutes,
    }),
    { maxTokens: 1900, temperature: 0.35 }
  );

  const metaFixed = sanitizeAndFixJSON(metaRaw);
  const metaParsed = parseJSON<z.infer<typeof ModuleMetaSchema>>(metaFixed, `gpt4o module meta ${args.moduleIndex + 1}`);
  const meta = ModuleMetaSchema.parse(metaParsed);

  return {
    title: args.moduleTitle,
    description: args.moduleDescription,
    content,
    keyTakeaways: meta.keyTakeaways,
    estimatedMinutes: meta.estimatedMinutes ?? estimatedMinutes,
    quiz: meta.quiz,
    resources: meta.resources,
  };
}

async function generateCourseWithGPT4o(args: {
  topic: string;
  difficulty: string;
  duration: string;
  locale: 'en' | 'es';
  quality: 'standard' | 'textbook';
}): Promise<CourseData> {
  const moduleCount = resolveModuleCount(args.duration);

  console.log(`[OpenAI] Generating course outline with GPT-4o (modules=${moduleCount}, locale=${args.locale}, quality=${args.quality})...`);

  const outlineRaw = await callOpenAI(buildOutlinePrompt(args), { maxTokens: 1200, temperature: 0.4 });
  const outlineFixed = sanitizeAndFixJSON(outlineRaw);
  const outlineParsed = parseJSON<z.infer<typeof CourseOutlineSchema>>(outlineFixed, 'gpt4o course outline');
  const outline = CourseOutlineSchema.parse(outlineParsed);

  const modulesOutline = outline.modules.slice(0, moduleCount);
  if (modulesOutline.length !== moduleCount) {
    throw new Error(`Outline returned ${modulesOutline.length} modules, expected ${moduleCount}`);
  }

  const modules: Module[] = [];

  for (let i = 0; i < moduleCount; i += 1) {
    const entry = modulesOutline[i];
    const moduleTitleBase = entry.title.trim();
    const moduleTitle = args.locale === 'es'
      ? `Módulo ${i + 1}: ${moduleTitleBase}`
      : `Module ${i + 1}: ${moduleTitleBase}`;

    console.log(`[OpenAI] Generating module ${i + 1}/${moduleCount}: ${moduleTitleBase}...`);

    if (args.quality === 'textbook') {
      const generatedModule = await generateTextbookModuleWithGPT4o({
        courseTitle: outline.title,
        courseDescription: outline.description,
        objectives: outline.objectives,
        moduleIndex: i,
        moduleCount,
        moduleTitle,
        moduleDescription: entry.description,
        difficulty: args.difficulty,
        duration: args.duration,
        locale: args.locale,
      });

      modules.push(generatedModule);
      continue;
    }

    const moduleRaw = await callOpenAI(buildModulePrompt({
      courseTitle: outline.title,
      courseDescription: outline.description,
      objectives: outline.objectives,
      moduleIndex: i,
      moduleCount,
      moduleTitle,
      moduleDescription: entry.description,
      difficulty: args.difficulty,
      duration: args.duration,
      locale: args.locale,
      quality: args.quality,
    }), { maxTokens: 5200, temperature: 0.7 });

    const moduleFixed = sanitizeAndFixJSON(moduleRaw);
    const moduleParsed = parseJSON<z.infer<typeof ModuleBundleSchema>>(moduleFixed, `gpt4o module ${i + 1}`);
    const bundle = ModuleBundleSchema.parse(moduleParsed);

    modules.push({
      title: moduleTitle,
      description: entry.description,
      content: bundle.content,
      keyTakeaways: bundle.keyTakeaways,
      estimatedMinutes: bundle.estimatedMinutes ?? resolveEstimatedMinutes(args.duration),
      quiz: bundle.quiz,
      resources: bundle.resources,
    });
  }

  console.log('[OpenAI] ✅ Course generated');

  return {
    title: outline.title,
    description: outline.description,
    objectives: outline.objectives,
    modules,
  };
}

// ============================================================================
// TEXTBOOK QUALITY GENERATION (NEW SYSTEM)
// ============================================================================

async function generateTextbookCourse(
  topic: string,
  difficulty: string,
  duration: string,
  locale: 'en' | 'es'
): Promise<CourseData> {
  console.log('[Textbook] 📚 Starting textbook-quality course generation...');
  console.log(`[Textbook] Topic: ${topic}, Difficulty: ${difficulty}, Duration: ${duration}, Locale: ${locale}`);
  
  const moduleCount = duration === 'short' ? 3 : duration === 'medium' ? 5 : 7;
  const modules: Module[] = [];
  
  // Generate course title and description first
  const courseOutlinePrompt = locale === 'es' 
    ? `Genera un título y descripción para un curso de ${moduleCount} módulos sobre "${topic}" nivel ${difficulty}. Responde SOLO en JSON: {"title": "...", "description": "...", "objectives": ["...", "...", "..."], "moduleTopics": ["Tema módulo 1", "Tema módulo 2", ...]}`
    : `Generate a title and description for a ${moduleCount}-module course on "${topic}" at ${difficulty} level. Respond ONLY in JSON: {"title": "...", "description": "...", "objectives": ["...", "...", "..."], "moduleTopics": ["Module 1 topic", "Module 2 topic", ...]}`;
  
  // Get course outline from cascade LLM
  const outlineResult = await callCascadeLLM(courseOutlinePrompt);
  const outlineFixed = sanitizeAndFixJSON(outlineResult);
  const outline = parseJSON<{
    title: string;
    description: string;
    objectives: string[];
    moduleTopics: string[];
  }>(outlineFixed, 'course outline');
  
  console.log(`[Textbook] Course: "${outline.title}"`);
  console.log(`[Textbook] Generating ${moduleCount} textbook-quality modules...`);
  
  // Generate each module with textbook quality
  for (let i = 0; i < Math.min(moduleCount, outline.moduleTopics.length); i++) {
    const moduleTopic = outline.moduleTopics[i];
    console.log(`[Textbook] Generating module ${i + 1}/${moduleCount}: "${moduleTopic}"...`);
    
    try {
      const chapter = await generateTextbookChapter({
        courseTopic: topic,
        moduleTitle: `Module ${i + 1}: ${moduleTopic}`,
        moduleDescription: `${locale === 'es' ? 'Módulo detallado sobre' : 'Detailed module on'} ${moduleTopic}`,
        moduleTopics: [moduleTopic],
        difficulty: difficulty as 'beginner' | 'intermediate' | 'advanced',
        language: locale === 'es' ? 'Spanish' : 'English',
        locale,
        targetWordCount: duration === 'short' ? 8000 : duration === 'medium' ? 12000 : 15000
      });
      
      const content = assembleChapterMarkdown(chapter);

      const editorialIssues = auditEditorialMarkdown(content);
      if (editorialIssues.length > 0) {
        console.warn(
          `[Textbook] ⚠️ Editorial style issues in module ${i + 1}: ${editorialIssues
            .map((issue) => issue.code)
            .join(', ')}`
        );
      }
      
      // Extract exercises as quiz questions
      // chapter.exercises is an ExerciseSet object with { exercises: [...], total_points, etc }
      const exerciseArray = chapter.exercises?.exercises || [];
      const quiz: Quiz[] = exerciseArray
        .filter(ex => ex.type === 'multiple_choice' && ex.options?.length)
        .slice(0, 4)
        .map((ex) => {
          // Find the correct answer index from the solution
          const correctIdx = ex.options?.findIndex(opt => 
            opt.toLowerCase().includes(ex.solution?.toLowerCase().slice(0, 20) || '')
          ) ?? 0;
          return {
            question: ex.question,
            options: ex.options || ['A', 'B', 'C', 'D'],
            correctAnswer: correctIdx >= 0 ? correctIdx : 0,
            explanation: ex.explanation || ''
          };
        });
      
      modules.push({
        title: `${locale === 'es' ? 'Módulo' : 'Module'} ${i + 1}: ${moduleTopic}`,
        description: chapter.outline.learning_objectives.join('. '),
        content,
        keyTakeaways: chapter.outline.learning_objectives,
        estimatedMinutes: duration === 'short' ? 30 : duration === 'medium' ? 45 : 60,
        quiz,
        resources: chapter.outline.learning_objectives.map(obj => `Resource for: ${obj}`)
      });
      
      console.log(`[Textbook] ✅ Module ${i + 1} generated (${content.length} chars)`);
    } catch (error) {
      console.error(`[Textbook] ⚠️ Error generating module ${i + 1}:`, error);
      // Generate a fallback module
      modules.push({
        title: `${locale === 'es' ? 'Módulo' : 'Module'} ${i + 1}: ${moduleTopic}`,
        description: moduleTopic,
        content: `# ${moduleTopic}\n\n${locale === 'es' ? 'Contenido en desarrollo...' : 'Content under development...'}`,
        keyTakeaways: [moduleTopic],
        estimatedMinutes: 30,
        quiz: [],
        resources: []
      });
    }
  }
  
  console.log(`[Textbook] ✅ Course generation complete! ${modules.length} modules generated.`);
  
  return {
    title: outline.title,
    description: outline.description,
    objectives: outline.objectives,
    modules
  };
}

// ============================================================================
// CASCADE LLM SYSTEM
// ============================================================================

const LLM_CASCADE = ['ollama', 'groq', 'gemini', 'openrouter', 'anthropic', 'openai'] as const;

async function callCascadeLLM(prompt: string): Promise<string> {
  for (const provider of LLM_CASCADE) {
    try {
      console.log(`[Cascade] Trying ${provider}...`);
      const result = await callProvider(provider, prompt);
      if (result) {
        console.log(`[Cascade] ✅ ${provider} succeeded`);
        return result;
      }
    } catch (error) {
      console.warn(`[Cascade] ${provider} failed:`, error instanceof Error ? error.message : 'Unknown');
    }
  }
  throw new Error('All LLM providers failed');
}

async function callProvider(provider: string, prompt: string): Promise<string> {
  switch (provider) {
    case 'ollama':
      return callOllama(prompt);
    case 'groq':
      return callGroq(prompt);
    case 'gemini':
      return callGemini(prompt);
    case 'openrouter':
      return callOpenRouter(prompt);
    case 'anthropic':
      return callAnthropic(prompt);
    case 'openai':
      return callOpenAISimple(prompt);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

async function callOllama(prompt: string): Promise<string> {
  const models = ['qwen2.5:72b', 'llama3.3:70b', 'qwen2.5:14b', 'llama3.1:8b', 'mistral:7b'];
  
  for (const model of models) {
    try {
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt,
          stream: false,
          options: { temperature: 0.7, num_predict: 8000 }
        })
      });
      
      if (response.ok) {
        const data = await response.json() as { response: string };
        return data.response;
      }
    } catch { /* Try next model */ }
  }
  throw new Error('No Ollama models available');
}

async function callGroq(prompt: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY not set');
  
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 8000
    })
  });
  
  if (!response.ok) throw new Error(`Groq error: ${response.status}`);
  const data = await response.json() as { choices: Array<{ message?: { content: string } }> };
  return data.choices[0]?.message?.content || '';
}

async function callGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set');
  
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 8000 }
    })
  });
  
  if (!response.ok) throw new Error(`Gemini error: ${response.status}`);
  const data = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text: string }> } }> };
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

async function callOpenRouter(prompt: string): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not set');
  
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'meta-llama/llama-3.3-70b-instruct:free',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 8000
    })
  });
  
  if (!response.ok) throw new Error(`OpenRouter error: ${response.status}`);
  const data = await response.json() as { choices: Array<{ message?: { content: string } }> };
  return data.choices[0]?.message?.content || '';
}

async function callAnthropic(prompt: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');
  
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 8000,
      messages: [{ role: 'user', content: prompt }]
    })
  });
  
  if (!response.ok) throw new Error(`Anthropic error: ${response.status}`);
  const data = await response.json() as { content?: Array<{ text: string }> };
  return data.content?.[0]?.text || '';
}

async function callOpenAISimple(prompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not set');
  
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
      max_tokens: 8000
    })
  });
  
  if (!response.ok) throw new Error(`OpenAI error: ${response.status}`);
  const data = await response.json() as { choices: Array<{ message?: { content: string } }> };
  return data.choices[0]?.message?.content || '';
}

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

async function saveCourseToDatabase(
  courseByLocale: Record<Locale, CourseData>,
  params: z.infer<typeof schema>,
  courseId: string
): Promise<{ success: boolean; courseId: string; error?: string; moduleIds?: Array<{ id: string; title: string; content: string }> }> {
  const supabase = getSupabaseServerClient();

  try {
    const courseEn = courseByLocale.en;
    const courseEs = courseByLocale.es;
    console.log(`[Database] Saving course "${courseByLocale[params.locale].title}" to database...`);

    // 1. Insert course record
    const { error: courseError } = await supabase
      .from('courses')
      .insert({
        id: courseId,
        title_en: courseEn.title,
        title_es: courseEs.title,
        description_en: courseEn.description,
        description_es: courseEs.description,
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
    if (!courseEn.modules?.length || !courseEs.modules?.length) {
      return {
        success: true,
        courseId,
        error: 'No modules to insert'
      };
    }

    const moduleCount = Math.max(courseEn.modules.length, courseEs.modules.length);

    const modulesToInsert = Array.from({ length: moduleCount }).map((_, index) => {
      const moduleEn = courseEn.modules[index];
      const moduleEs = courseEs.modules[index];
      const base = (params.locale === 'es' ? moduleEs : moduleEn) ?? moduleEn ?? moduleEs;

      if (!moduleEn || !moduleEs || !base) {
        throw new Error(`Course translation mismatch: missing module index ${index}`);
      }

      const normalizedEn = normalizeEditorialMarkdown(moduleEn.content, {
        title: moduleEn.title,
        standfirst: moduleEn.description,
        locale: 'en',
      });

      const normalizedEs = normalizeEditorialMarkdown(moduleEs.content, {
        title: moduleEs.title,
        standfirst: moduleEs.description,
        locale: 'es',
      });

      return {
      course_id: courseId,
      order_index: index,
      title_en: moduleEn.title,
      title_es: moduleEs.title,
      content_en: normalizedEn,
      content_es: normalizedEs,
      type: 'text' as const,
      estimated_time: base.estimatedMinutes,
      resources: {
        takeaways: base.keyTakeaways,
        quiz: base.quiz,
        links: base.resources
      }
      };
    });

    console.log(`[Database] Inserting ${modulesToInsert.length} modules...`);

    const { data: insertedModules, error: modulesError } = await supabase
      .from('course_modules')
      .insert(modulesToInsert)
      .select('id, title_en, title_es, content_en, content_es');

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

    // Return module IDs for image generation
    const moduleIds = (insertedModules || []).map((m: { id: string; title_en: string; title_es: string; content_en: string; content_es: string }) => ({
      id: m.id,
      title: params.locale === 'es' ? m.title_es : m.title_en,
      content: (params.locale === 'es' ? m.content_es : m.content_en) || '',
    }));

    return {
      success: true,
      courseId,
      moduleIds
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
      locale: params.locale,
      quality: params.quality
    });

    let courseData: CourseData;

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: 'OPENAI_API_KEY not configured',
          details: 'Set OPENAI_API_KEY in your environment (Vercel) to enable GPT-4o course generation.',
        },
        { status: 500 }
      );
    }

    // 2. Generate course based on quality setting
    if (process.env.OPENAI_API_KEY) {
      console.log(`[API] 🤖 Using GPT-4o generation (quality=${params.quality})...`);
      try {
        courseData = await generateCourseWithGPT4o({
          topic: params.topic,
          difficulty: params.difficulty,
          duration: params.duration,
          locale: params.locale,
          quality: params.quality,
        });
      } catch (err) {
        console.warn('[API] GPT-4o generation failed:', err);
        throw err;
      }
    } else {
      console.warn('[API] OPENAI_API_KEY missing. Falling back to legacy textbook generator...');
      courseData = await generateTextbookCourse(
        params.topic,
        params.difficulty,
        params.duration,
        params.locale
      );
    }

    // 3. Create course ID
    const courseId = crypto.randomUUID();

    // 4. Save to database
    console.log('[API] 💾 Saving to database...');
    const courseByLocale = await buildCourseByLocale(courseData, params.locale);
    const localizedCourse = courseByLocale[params.locale];
    const dbResult = await saveCourseToDatabase(courseByLocale, params, courseId);

    if (!dbResult.success) {
      console.error('[API] Database save failed:', dbResult.error);
      throw new Error(dbResult.error || 'Database save failed');
    }

    // 5. Generate course images eagerly so the reading experience is ready immediately.
    if (dbResult.moduleIds?.length) {
      console.log('[API] 🎨 Triggering background image generation...');
      try {
        const imageResult = await generateCourseImages(
          {
            courseId,
            title: localizedCourse.title,
            description: localizedCourse.description,
            locale: params.locale,
            modules: dbResult.moduleIds,
          },
          { useLLMPlan: true }
        );

        if (imageResult.errors.length > 0) {
          console.warn('[API] Image generation completed with warnings:', imageResult.errors);
        }
      } catch (err) {
        console.warn('[API] Image generation failed (continuing):', err);
      }
    }

    // 6. Return response
    const duration = Date.now() - startTime;
    console.log(`[API] ✅ Success! Generated in ${duration}ms`);
    console.log(`[API] Quality: ${params.quality}, Modules: ${courseData.modules?.length || 0}`);
    
    // Calculate total words for textbook quality courses
    const totalWords = localizedCourse.modules?.reduce((sum, m) => {
      return sum + (m.content?.split(/\s+/).length || 0);
    }, 0) || 0;
    console.log(`[API] Total words generated: ${totalWords.toLocaleString()}`);

    const moduleWordCounts = (localizedCourse.modules ?? []).map((m) => ({
      title: m.title,
      words: (m.content?.split(/\s+/).filter(Boolean).length || 0),
    }));

    try {
      const supabase = getSupabaseServerClient();
      await supabase.from('ai_system_logs').insert({
        action_type: 'course_generation',
        model_used: 'gpt-4o',
        input_tokens: 0,
        output_tokens: 0,
        success: true,
        error_message: null,
        execution_time: duration,
        cost: 0,
        metadata: {
          endpoint: '/api/courses/generate-full',
          course_id: courseId,
          topic: params.topic,
          difficulty: params.difficulty,
          duration: params.duration,
          locale: params.locale,
          quality: params.quality,
          modules_count: localizedCourse.modules?.length || 0,
          total_words: totalWords,
          module_words: moduleWordCounts,
        },
      });
    } catch (logError) {
      console.warn('[API] Failed to write ai_system_logs (continuing):', logError);
    }

    return NextResponse.json({
      success: true,
      data: {
        course_id: courseId,
        title: localizedCourse.title,
        description: localizedCourse.description,
        objectives: localizedCourse.objectives,
        modules_count: localizedCourse.modules?.length || 0,
        estimated_duration_minutes: localizedCourse.modules
          ? localizedCourse.modules.reduce((sum, m) => sum + m.estimatedMinutes, 0)
          : 0,
        estimated_total_minutes: localizedCourse.modules
          ? localizedCourse.modules.reduce((sum, m) => sum + m.estimatedMinutes, 0)
          : 0,
        quality: params.quality,
        total_words: totalWords,
        content: localizedCourse
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
        error: 'Failed to parse course JSON from AI'
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: 'Course generation failed'
    }, { status: 500 });
  }
}

// Expose a minimal, explicit surface for scripts/admin tooling.
// Not used by the Next.js route matcher.
export const __internal = {
  generateCourseWithGPT4o,
  buildCourseByLocale,
};
