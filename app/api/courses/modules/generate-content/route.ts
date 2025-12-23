import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/db/supabase';
import { getServerAuthUser } from '@/lib/auth/auth-config';
import { createLLMClientWithFallback } from '@/lib/ai/llm-client';
import { loggers } from '@/lib/utils/logger';
import { auditEditorialMarkdown, normalizeEditorialMarkdown } from '@/lib/courses/editorial-style';

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
  console.group('🤖 [API] Generate Module Content');
  const startTime = Date.now();
  
  try {
    const user = await getServerAuthUser();
    if (!user) {
      console.error('❌ Unauthorized - no user');
      console.groupEnd();
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('✅ User authenticated:', { userId: user.id });

    const body: GenerateModuleContentRequest = await req.json();
    const { moduleId, courseId, locale } = body;

    console.log('📋 Request Details:', {
      moduleId,
      courseId,
      locale,
      userId: user.id
    });

    loggers.course('Generate module content requested', {
      moduleId,
      courseId,
      locale,
      userId: user.id
    });

    const db = getSupabaseServerClient();

    // Fetch the module to see what content it needs
    console.log('🔍 Fetching module from database...');
    const { data: module, error: moduleError } = await db
      .from('course_modules')
      .select('*')
      .eq('id', moduleId)
      .eq('course_id', courseId)
      .single();

    if (moduleError || !module) {
      console.error('❌ Module not found:', {
        moduleId,
        courseId,
        error: moduleError?.message
      });
      console.groupEnd();
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

    console.log('✅ Module fetched:', {
      moduleId: module.id,
      title: module.title_en,
      contentType: module.content_type,
      order: module.order_index
    });

    // Fetch course context for better content generation
    console.log('📚 Fetching course context...');
    const { data: course } = await db
      .from('courses')
      .select('title_en, title_es, description_en, description_es, difficulty, topics')
      .eq('id', courseId)
      .single();

    console.log('✅ Course context fetched:', {
      title: course?.title_en,
      hasDescription: !!(course?.description_en)
    });

    const courseTitle = locale === 'en' ? course?.title_en : course?.title_es;
    const courseDesc = locale === 'en' ? course?.description_en : course?.description_es;
    const moduleTitle = locale === 'en' ? module.title_en : module.title_es;
    const contentType = module.content_type || 'article';

    const estimatedMinutes = typeof module.estimated_time === 'number' && Number.isFinite(module.estimated_time)
      ? Math.max(5, Math.round(module.estimated_time))
      : 30;

    const difficulty = (course?.difficulty || 'beginner').toString().toLowerCase();
    const levelLabel = locale === 'en'
      ? (difficulty === 'advanced' ? 'Advanced' : difficulty === 'intermediate' ? 'Intermediate' : 'Beginner')
      : (difficulty === 'advanced' ? 'Avanzado' : difficulty === 'intermediate' ? 'Intermedio' : 'Básico');

    const courseTopics = Array.isArray(course?.topics)
      ? (course?.topics as unknown[]).filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
      : [];
    const baseTags = locale === 'en' ? ['AI', 'Course'] : ['AI', 'Curso'];
    const tags = Array.from(new Set([...baseTags, ...courseTopics])).slice(0, 4);
    const tagsInline = tags.map((t) => `\`${t}\``).join(' ');

    console.log('📝 Content generation params:', {
      courseTitle,
      moduleTitle,
      contentType,
      locale
    });

    // Do not re-generate if content already present and not a placeholder
    const existingContent = locale === 'en' ? module.content_en : module.content_es;
    const placeholderRegex = /(coming soon|próximamente|en preparación|contenido en desarrollo|content coming soon|coming-soon)/i;
    const isPlaceholder = (text?: string | null) => {
      if (!text) return true;
      const trimmed = text.trim();
      if (!trimmed) return true;
      if (trimmed.length < 60 && placeholderRegex.test(trimmed)) return true;
      return false;
    };

    console.log('🔍 Checking existing content:', {
      hasContent: !!existingContent,
      contentLength: existingContent?.length || 0,
      isPlaceholder: isPlaceholder(existingContent)
    });

    if (!isPlaceholder(existingContent)) {
      console.log('✅ Existing content found, skipping generation');
      console.log(`⏱️ Total time: ${Date.now() - startTime}ms`);
      console.groupEnd();
      loggers.course('Existing content found, skipping generation', { moduleId, locale });
      return NextResponse.json({ success: true, message: 'Existing content present', data: { moduleId, content: existingContent } });
    }

    console.log('🚀 Starting content generation...');

    // Generate content based on type
    let generatedContent = '';
    
    if (contentType === 'article') {
      console.log('📄 Generating article content...');
      generatedContent = await generateArticleContent(
        courseTitle,
        courseDesc,
        moduleTitle,
        module.description_en || module.description_es || moduleTitle,
        locale,
        {
          estimatedMinutes,
          levelLabel,
          tagsInline,
        }
      );
      console.log('✅ Article generated:', { length: generatedContent.length });
    } else if (contentType === 'video') {
      console.log('🎥 Generating video transcript...');
      // For videos, we generate a placeholder transcript or description
      generatedContent = await generateVideoTranscript(
        courseTitle,
        moduleTitle,
        locale
      );
      console.log('✅ Video transcript generated:', { length: generatedContent.length });
    } else if (contentType === 'quiz') {
      console.log('❓ Generating quiz content...');
      generatedContent = await generateQuizContent(
        courseTitle,
        moduleTitle,
        locale
      );
      console.log('✅ Quiz generated:', { length: generatedContent.length });
    }

    if (!generatedContent) {
      console.error('\u274c Content generation failed - empty result');
      console.groupEnd();
      throw new Error('Failed to generate content');
    }

    // Sanitization: remove control characters but PRESERVE content structure
    const sanitizedContent = generatedContent
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove ASCII control chars
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')     // Remove Unicode control chars
      .trim();

    const normalizedContent = normalizeEditorialMarkdown(sanitizedContent, {
      title: moduleTitle,
      standfirst: (module.description_en || module.description_es || courseDesc || '').toString(),
      locale,
    });

    const editorialIssues = auditEditorialMarkdown(normalizedContent);
    if (editorialIssues.length > 0) {
      loggers.course('Generated module content is not fully editorial-compliant', {
        moduleId,
        locale,
        issueCodes: editorialIssues.map((i) => i.code),
      });
    }

    console.log('\ud83d\udcbe Saving generated content to database...');

    // Update the module with generated content
    const contentField = locale === 'en' ? 'content_en' : 'content_es';
    console.log('📤 Updating field:', contentField);
    
    const { error: updateError } = await db
      .from('course_modules')
      .update({
        [contentField]: normalizedContent,
        updated_at: new Date().toISOString()
      })
      .eq('id', moduleId);

    if (updateError) {
      console.error('❌ Database update failed:', updateError);
      console.groupEnd();
      loggers.error('Generate module content', 'Update failed', {
        error: updateError.message,
        moduleId,
        contentField
      });
      throw updateError;
    }

    console.log('✅ Content saved successfully');
    const totalTime = Date.now() - startTime;
    console.log(`⏱️ Total generation time: ${totalTime}ms`);
    console.log('🎉 Module content generation complete!');
    console.groupEnd();

    loggers.success('Generate module content', 'Content generated and saved', {
      moduleId,
      contentType,
      locale,
      contentLength: sanitizedContent.length,
      generationTime: totalTime
    });

    return NextResponse.json({
      success: true,
      data: {
        moduleId,
        content: normalizedContent,
        contentLength: normalizedContent.length,
        locale
      }
    });

  } catch (error) {
    console.error('❌ Fatal Error in content generation:', error);
    console.error('📋 Error Details:', {
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : 'N/A'
    });
    console.groupEnd();
    
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
  locale: 'en' | 'es',
  meta: { estimatedMinutes: number; levelLabel: string; tagsInline: string }
): Promise<string> {
  const llm = await createLLMClientWithFallback();
  
  const _legacyPrompt = locale === 'en'
    ? `You are a world-class AI educator with decades of experience creating professional university-level content.

**COURSE**: ${courseTitle}
**DESCRIPTION**: ${courseDesc}
**MODULE**: ${moduleTitle}
**MODULE DESCRIPTION**: ${moduleDesc}

Generate COMPREHENSIVE, PROFESSIONAL article content (MINIMUM 2500 words / 8000+ characters):

## QUALITY REQUIREMENTS:

### DEPTH AND RIGOR:
- Write at professional/university level, not blog-post level
- Include SPECIFIC examples with real technical details and code
- Explain the "why" behind concepts, not just the "what"
- Use precise technical terminology (but define it clearly)
- Include quantitative data, statistics, or benchmarks when relevant
- Reference real frameworks, methodologies, or industry standards

### REQUIRED STRUCTURE (Markdown):

# ${moduleTitle}

## 🎯 Learning Objectives
[3-5 concrete, measurable learning outcomes]

## 📖 Introduction (300-400 words)
[Context, importance, real-world relevance]

## 🧠 Fundamental Concepts (800-1000 words)
[Core theory, precise definitions, conceptual foundations]

## 💡 Practical Examples & Case Studies (800-1000 words)
[3-5 DETAILED examples with:
- Real company/project names when possible
- Actual code snippets or technical implementations
- Specific metrics, outcomes, or results
- Why it worked or what was learned]

## ⚙️ Step-by-Step Implementation (600-800 words)
[Actionable guide with:
- Clear procedures or workflows
- Tools and frameworks to use
- Code examples with syntax highlighting
- Configuration or setup details]

## ⚠️ Common Mistakes & Best Practices (400-500 words)
[Real problems professionals encounter and how to avoid them]

## 🚀 Advanced Techniques (300-400 words)
[Advanced applications, current trends, cutting-edge developments]

## 📚 Additional Resources
[5-7 high-quality educational resources: articles, videos, documentation]

## 🎯 Key Takeaways
[5-8 essential conclusions and action items]

### STYLE:
- Write as a professional mentor, NOT as a generic AI
- Use "we" when discussing industry practices
- Include rhetorical questions to engage critical thinking
- Balance technical depth with clarity
- Every section must provide UNIQUE, actionable value
- NO placeholders, NO filler content, NO generic statements

CRITICAL: This content will be evaluated for DEPTH, RIGOR, and PRACTICAL UTILITY. Aim for 2500+ words minimum.`
    : `Eres un educador de IA de clase mundial con décadas de experiencia creando contenido profesional de nivel universitario.

**CURSO**: ${courseTitle}
**DESCRIPCIÓN**: ${courseDesc}
**MÓDULO**: ${moduleTitle}
**DESCRIPCIÓN DEL MÓDULO**: ${moduleDesc}

Genera contenido de artículo EXHAUSTIVO y PROFESIONAL (MÍNIMO 2500 palabras / 8000+ caracteres):

## REQUISITOS DE CALIDAD:

### PROFUNDIDAD Y RIGOR:
- Escribe a nivel profesional/universitario, no nivel blog
- Incluye ejemplos ESPECÍFICOS con detalles técnicos reales y código
- Explica el "porqué" detrás de los conceptos, no solo el "qué"
- Usa terminología técnica precisa (pero defínela claramente)
- Incluye datos cuantitativos, estadísticas o benchmarks cuando sea relevante
- Referencias frameworks, metodologías o estándares de la industria reales

### ESTRUCTURA REQUERIDA (Markdown):

# ${moduleTitle}

## 🎯 Objetivos de Aprendizaje
[3-5 resultados de aprendizaje concretos y medibles]

## 📖 Introducción (300-400 palabras)
[Contexto, importancia, relevancia en el mundo real]

## 🧠 Conceptos Fundamentales (800-1000 palabras)
[Teoría central, definiciones precisas, fundamentos conceptuales]

## 💡 Ejemplos Prácticos y Casos de Estudio (800-1000 palabras)
[3-5 ejemplos DETALLADOS con:
- Nombres reales de empresas/proyectos cuando sea posible
- Fragmentos de código real o implementaciones técnicas
- Métricas, resultados o desenlaces específicos
- Por qué funcionó o qué se aprendió]

## ⚙️ Implementación Paso a Paso (600-800 palabras)
[Guía accionable con:
- Procedimientos o flujos de trabajo claros
- Herramientas y frameworks a utilizar
- Ejemplos de código con resaltado de sintaxis
- Detalles de configuración o setup]

## ⚠️ Errores Comunes y Mejores Prácticas (400-500 palabras)
[Problemas reales que enfrentan los profesionales y cómo evitarlos]

## 🚀 Técnicas Avanzadas (300-400 palabras)
[Aplicaciones avanzadas, tendencias actuales, desarrollos de vanguardia]

## 📚 Recursos Adicionales
[5-7 recursos educativos de alta calidad: artículos, videos, documentación]

## 🎯 Puntos Clave
[5-8 conclusiones esenciales e ítems de acción]

### ESTILO:
- Escribe como un mentor profesional, NO como una IA genérica
- Usa "nosotros" al discutir prácticas de la industria
- Incluye preguntas retóricas para involucrar el pensamiento crítico
- Balancea profundidad técnica con claridad
- Cada sección debe proporcionar valor ÚNICO y accionable
- SIN placeholders, SIN contenido de relleno, SIN declaraciones genéricas

CRÍTICO: Este contenido será evaluado por PROFUNDIDAD, RIGOR y UTILIDAD PRÁCTICA. Apunta a 2500+ palabras mínimo.`;

  const prompt = locale === 'en'
    ? `You are writing a course module in Markdown for a dark editorial "textbook magazine" layout.

COURSE: ${courseTitle}
COURSE DESCRIPTION: ${courseDesc}
MODULE: ${moduleTitle}
MODULE DESCRIPTION: ${moduleDesc}

Write in English. Output ONLY Markdown (no JSON, no preface).

STRICT TEMPLATE (follow exactly):
# ${moduleTitle}
**⏱️ Time:** ${meta.estimatedMinutes} min | **📊 Level:** ${meta.levelLabel} | **🏷️ Tags:** ${meta.tagsInline}

---

BODY RULES (use these building blocks; no walls of plain text):
- Lead (optional but recommended): insert exactly ONE standfirst line between the meta line and the "---" separator using:
  - > **...** (topic-specific; do NOT use generic meta like "This module turns..." or "A fast, structured module...").
- Sections: 3–6 with "##" headings.
- Insight Cards: blockquotes starting with "> ### 💡" and including Context + Example bullets.
- Split Layout: at least one 2-column markdown table (with a "| :--- | :--- |" separator row).
- Editorial List: at least one list using "* **Label:** value" formatting.
- Pull Quote (at least 1): a 2-line blockquote with an italic attribution/context line (starts with an em dash). Do NOT write placeholders like "Short attribution".
- Sidebar box (one-cell table, at least 1):
  | 💡 TECH INSIGHT: A SPECIFIC TECHNICAL POINT |
  | :--- |
  | Specific, topic-related explanation (no generic boilerplate). |

HARD CONSTRAINTS:
- No paragraph longer than ~350 characters.
- Never more than 3 plain paragraphs in a row (insert a card/table/list/quote).
- No single-word line breaks.
- No AI/system/prompt instructions. No placeholders.
- Code examples must be fenced with a language, and prose/exercises must stay outside code blocks.
- If you write a line starting with "In this example" or "This example", place it immediately after the code block as a short italic sentence.
- If you show HTML/CSS, it must be inside a fenced code block with a language.

Target length: ~800–1200 words.`
    : `Estás escribiendo un módulo de curso en Markdown para una maquetación editorial oscura tipo "revista / libro de texto".

CURSO: ${courseTitle}
DESCRIPCIÓN DEL CURSO: ${courseDesc}
MÓDULO: ${moduleTitle}
DESCRIPCIÓN DEL MÓDULO: ${moduleDesc}

Escribe en español. Devuelve SOLO Markdown (sin JSON, sin prefacio).

PLANTILLA ESTRICTA (síguela exactamente):
# ${moduleTitle}
**⏱️ Tiempo:** ${meta.estimatedMinutes} min | **📊 Nivel:** ${meta.levelLabel} | **🏷️ Tags:** ${meta.tagsInline}

---

REGLAS DEL CUERPO (usa estos bloques; cero muros de texto):
- Entradilla (opcional pero recomendable): inserta EXACTAMENTE 1 línea entre la meta y el separador "---" usando:
  - > **...** (frase concreta del tema; NO uses frases meta genéricas tipo "Este módulo convierte..." o "Un módulo directo y estructurado...").
- Secciones: 3–6 con encabezados "##".
- Insight Cards: blockquotes que empiezan por "> ### 💡" e incluyen bullets de Contexto + Ejemplo.
- Split Layout: al menos una tabla markdown de 2 columnas (con fila separadora "| :--- | :--- |").
- Editorial List: al menos una lista con formato "* **Etiqueta:** valor".
- Pull Quote (mínimo 1): cita en blockquote de 2 líneas con una 2ª línea en cursiva de atribución/contexto (empieza por un guion largo). Prohibido escribir placeholders tipo "Idea ancla del módulo" o "Atribución breve".
- Sidebar box (tabla de 1 celda, mínimo 1):
  | 💡 TECH INSIGHT: UN PUNTO TÉCNICO ESPECÍFICO |
  | :--- |
  | Explicación específica y relacionada con el tema (sin boilerplate genérico). |

REGLAS DURAS:
- Ningún párrafo debe superar ~350 caracteres.
- Nunca más de 3 párrafos planos seguidos (mete tarjeta/tabla/lista/cita).
- No cortes palabras en líneas sueltas.
- Prohibido texto de instrucciones/prompt. Sin placeholders.
- Los ejemplos de código deben ir en bloques con lenguaje, y el texto explicativo fuera de los bloques.
- Si escribes una línea que empiece por "En este ejemplo" o "Este ejemplo", colócala justo después del bloque de código como frase corta en cursiva.
- Si muestras HTML/CSS, siempre dentro de un bloque de código con lenguaje.

Longitud objetivo: ~800–1200 palabras.`;

  try {
    const response = await llm.generate(prompt, {
      temperature: 0.6,
      maxTokens: 2800,
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
    ? `You are a professional video scriptwriter and educator. Generate a COMPREHENSIVE video transcript for a course module.

**COURSE**: ${courseTitle}
**MODULE**: ${moduleTitle}

Create a DETAILED, PROFESSIONAL video transcript (MINIMUM 1500 words / 5000+ characters):

## STRUCTURE:

# Video Transcript: ${moduleTitle}

## [INTRO - 0:00-1:00]
- Hook that immediately grabs attention (specific statistic, question, or scenario)
- Brief overview of what will be covered
- 3-5 specific learning objectives
- Why this matters for viewers' careers or projects

## [FOUNDATIONS - 1:00-5:00]
- Core concepts with clear, precise explanations
- Visual cues: "On screen: [detailed diagram description]"
- Key terminology and definitions
- Common misconceptions to address

## [MAIN CONTENT - 5:00-15:00]
Break into 3-4 clear sections with timestamps:
- Deep explanation of concepts
- "Let me show you..." demonstrations with detailed narration
- Real-world examples with specific companies/projects
- Visual descriptions: diagrams, code, screenshots
- Best practices and professional tips

## [PRACTICAL DEMONSTRATION - 15:00-20:00]
- Step-by-step walkthrough
- Detailed narration of each action
- "Here's what you're seeing..." explanations
- Common mistakes to avoid
- Pro tips and shortcuts

## [ADVANCED TOPICS - 20:00-23:00]
- More sophisticated applications
- Industry trends and cutting-edge developments
- How professionals use these techniques
- Resources for going deeper

## [RECAP & ACTION ITEMS - 23:00-25:00]
- Summary of 5-7 key points
- Practical next steps viewers should take
- Resources mentioned in the video
- Preview of next module

## [VISUAL NOTES]
Detailed descriptions of all visuals needed:
- Diagrams and their components
- Code snippets with syntax
- Animations or transitions
- Text overlays or callouts

### STYLE:
- Conversational but professional
- Use "you" and "we" to engage viewers
- Include rhetorical questions: "What if we need to..."
- Smooth transitions between sections
- Energy and enthusiasm appropriate for topic
- Technical depth without being dry

CRITICAL: Write for a 20-25 minute video. Be thorough, specific, and engaging. Minimum 1500 words.`
    : `Eres un guionista profesional de videos educativos. Genera una transcripción COMPLETA de video para un módulo de curso.

**CURSO**: ${courseTitle}
**MÓDULO**: ${moduleTitle}

Crea una transcripción DETALLADA y PROFESIONAL de video (MÍNIMO 1500 palabras / 5000+ caracteres):

## ESTRUCTURA:

# Transcripción de Video: ${moduleTitle}

## [INTRO - 0:00-1:00]
- Gancho que capte inmediatamente la atención (estadística específica, pregunta o escenario)
- Resumen breve de lo que se cubrirá
- 3-5 objetivos de aprendizaje específicos
- Por qué esto importa para las carreras o proyectos de los espectadores

## [FUNDAMENTOS - 1:00-5:00]
- Conceptos centrales con explicaciones claras y precisas
- Señales visuales: "En pantalla: [descripción detallada del diagrama]"
- Terminología clave y definiciones
- Conceptos erróneos comunes a abordar

## [CONTENIDO PRINCIPAL - 5:00-15:00]
Divide en 3-4 secciones claras con marcas de tiempo:
- Explicación profunda de conceptos
- Demostraciones "Déjame mostrarte..." con narración detallada
- Ejemplos del mundo real con empresas/proyectos específicos
- Descripciones visuales: diagramas, código, capturas de pantalla
- Mejores prácticas y consejos profesionales

## [DEMOSTRACIÓN PRÁCTICA - 15:00-20:00]
- Guía paso a paso
- Narración detallada de cada acción
- Explicaciones "Esto es lo que estás viendo..."
- Errores comunes a evitar
- Consejos profesionales y atajos

## [TEMAS AVANZADOS - 20:00-23:00]
- Aplicaciones más sofisticadas
- Tendencias de la industria y desarrollos de vanguardia
- Cómo los profesionales usan estas técnicas
- Recursos para profundizar

## [RECAPITULACIÓN E ÍTEMS DE ACCIÓN - 23:00-25:00]
- Resumen de 5-7 puntos clave
- Próximos pasos prácticos que los espectadores deben tomar
- Recursos mencionados en el video
- Avance del siguiente módulo

## [NOTAS VISUALES]
Descripciones detalladas de todos los visuales necesarios:
- Diagramas y sus componentes
- Fragmentos de código con sintaxis
- Animaciones o transiciones
- Superposiciones de texto o llamadas

### ESTILO:
- Conversacional pero profesional
- Usa "tú" y "nosotros" para involucrar a los espectadores
- Incluye preguntas retóricas: "¿Qué pasa si necesitamos..."
- Transiciones suaves entre secciones
- Energía y entusiasmo apropiados para el tema
- Profundidad técnica sin ser árido

CRÍTICO: Escribe para un video de 20-25 minutos. Sé exhaustivo, específico y atractivo. Mínimo 1500 palabras.`;

  try {
    const response = await llm.generate(prompt, {
      temperature: 0.7,
      maxTokens: 5000 // Increased from 2500 to allow longer transcripts
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
    ? `You are an expert assessment designer. Generate a COMPREHENSIVE quiz for a professional course module.

**COURSE**: ${courseTitle}
**MODULE**: ${moduleTitle}

Create 6-8 HIGH-QUALITY multiple-choice questions formatted as markdown:

## REQUIREMENTS:

### DIFFICULTY MIX:
- 2-3 Easy questions (fundamental concepts, definitions)
- 3-4 Medium questions (application, analysis)
- 1-2 Hard questions (synthesis, evaluation, edge cases)

### QUESTION QUALITY:
- Test UNDERSTANDING, not just memorization
- Include realistic scenarios and applications
- Questions should be clear and unambiguous
- Distractors (wrong answers) should be plausible but clearly incorrect
- Each question should test a distinct concept

### FORMAT (Markdown):

# Quiz: ${moduleTitle}

## Question 1 (Easy)
**[Question text with context and specific scenario]**

A) First option
B) Second option
C) Third option
D) Fourth option

**Correct Answer:** B

**Explanation:** Detailed explanation (3-4 sentences) covering:
- Why B is correct
- Why other options are incorrect or less appropriate
- Key concept being tested
- Real-world relevance

---

## Question 2 (Medium)
**[Question text...]**

[Same format...]

---

[Continue for all 6-8 questions...]

### GUIDELINES:
- Questions should reflect real-world professional scenarios
- Include code snippets, technical specifications, or data when relevant
- Test both theoretical knowledge and practical application
- Explanations should reinforce learning, not just state the answer
- Mix question types: conceptual, analytical, application-based

CRITICAL: Generate 6-8 complete questions with detailed explanations. Aim for professional certification quality.`
    : `Eres un diseñador experto en evaluaciones. Genera un cuestionario COMPLETO para un módulo de curso profesional.

**CURSO**: ${courseTitle}
**MÓDULO**: ${moduleTitle}

Crea 6-8 preguntas de opción múltiple de ALTA CALIDAD formateadas en markdown:

## REQUISITOS:

### MEZCLA DE DIFICULTAD:
- 2-3 preguntas Fáciles (conceptos fundamentales, definiciones)
- 3-4 preguntas Medias (aplicación, análisis)
- 1-2 preguntas Difíciles (síntesis, evaluación, casos límite)

### CALIDAD DE LAS PREGUNTAS:
- Evalúan COMPRENSIÓN, no solo memorización
- Incluyen escenarios realistas y aplicaciones
- Las preguntas deben ser claras e inequívocas
- Los distractores (respuestas incorrectas) deben ser plausibles pero claramente incorrectos
- Cada pregunta debe evaluar un concepto distinto

### FORMATO (Markdown):

# Cuestionario: ${moduleTitle}

## Pregunta 1 (Fácil)
**[Texto de la pregunta con contexto y escenario específico]**

A) Primera opción
B) Segunda opción
C) Tercera opción
D) Cuarta opción

**Respuesta Correcta:** B

**Explicación:** Explicación detallada (3-4 oraciones) cubriendo:
- Por qué B es correcta
- Por qué las otras opciones son incorrectas o menos apropiadas
- Concepto clave siendo evaluado
- Relevancia en el mundo real

---

## Pregunta 2 (Media)
**[Texto de la pregunta...]**

[Mismo formato...]

---

[Continúa con todas las 6-8 preguntas...]

### DIRECTRICES:
- Las preguntas deben reflejar escenarios profesionales del mundo real
- Incluye fragmentos de código, especificaciones técnicas o datos cuando sea relevante
- Evalúa tanto conocimiento teórico como aplicación práctica
- Las explicaciones deben reforzar el aprendizaje, no solo indicar la respuesta
- Mezcla tipos de preguntas: conceptuales, analíticas, basadas en aplicación

CRÍTICO: Genera 6-8 preguntas completas con explicaciones detalladas. Apunta a calidad de certificación profesional.`;

  try {
    const response = await llm.generate(prompt, {
      temperature: 0.7,
      maxTokens: 4000 // Increased from 2000 to allow detailed explanations
    });
    return response.content;
  } catch (error) {
    loggers.error('Generate quiz content', 'LLM call failed', {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}
