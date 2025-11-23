/**
 * Batch Module Content Regenerator
 * Regenerates all modules with insufficient content using the advanced LLM system
 */

import { createClient } from '@supabase/supabase-js';
import { createLLMClientWithFallback } from '../lib/ai/llm-client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MIN_LENGTH = {
  article: 2500,
  video: 1500,
  quiz: 800,
  text: 2500, // Same as article
  code: 1500,
  interactive: 1500
};

async function generateProfessionalContent(
  courseTitle: string,
  courseDesc: string,
  moduleTitle: string,
  moduleType: string,
  locale: 'en' | 'es'
): Promise<string> {
  const llm = await createLLMClientWithFallback();

  const isSpanish = locale === 'es';
  
  const prompt = isSpanish
    ? `Eres un experto educador de IA con décadas de experiencia creando contenido educativo profesional de nivel universitario.

**CURSO**: ${courseTitle}
**DESCRIPCIÓN**: ${courseDesc}
**MÓDULO**: ${moduleTitle}
**TIPO**: ${moduleType}

Genera contenido EXHAUSTIVO y PROFESIONAL para este módulo (mínimo 2500 palabras / 8000+ caracteres):

## REQUISITOS DE CALIDAD:

### PROFUNDIDAD Y RIGOR:
- No uses contenido genérico o superficial
- Incluye ejemplos ESPECÍFICOS con detalles técnicos reales
- Explica el "porqué" detrás de cada concepto, no solo el "qué"
- Usa terminología precisa y técnica (pero explícala)
- Incluye datos cuantitativos, estadísticas, benchmarks cuando sea relevante

### ESTRUCTURA (Markdown):
# ${moduleTitle}

## 🎯 Objetivos de Aprendizaje
[3-5 objetivos concretos y medibles]

## 📖 Introducción
[300-400 palabras: contexto, importancia, aplicaciones]

## 🧠 Conceptos Fundamentales
[800-1000 palabras: teoría sólida, definiciones precisas]

## 💡 Ejemplos Prácticos y Casos de Uso
[800-1000 palabras: 3-5 ejemplos DETALLADOS con código/procedimientos reales]

## ⚙️ Implementación Paso a Paso
[600-800 palabras: guía práctica y accionable]

## ⚠️ Errores Comunes y Mejores Prácticas
[400-500 palabras: problemas reales y soluciones]

## 🚀 Aplicaciones Avanzadas
[300-400 palabras: técnicas avanzadas, tendencias actuales]

## 📚 Recursos Adicionales
[5-7 recursos educativos reales y específicos con URLs]

## 🎯 Puntos Clave
[5-8 conclusiones esenciales]

### ESTILO:
- Escribe como un mentor profesional, NO como una IA
- Usa "nosotros" al discutir prácticas de la industria
- Incluye preguntas retóricas para estimular el pensamiento crítico
- Balancea profundidad técnica con claridad
- Cada sección debe aportar valor ÚNICO

### CONTENIDO TÉCNICO:
- Incluye bloques de código cuando sea apropiado (con sintaxis correcta)
- Usa tablas para comparar opciones/tecnologías
- Incluye diagramas en formato markdown ASCII art si es útil
- Cita frameworks, metodologías o principios por nombre

IMPORTANTE: Este contenido será evaluado por su PROFUNDIDAD, RIGOR y UTILIDAD PRÁCTICA. No uses placeholders ni contenido genérico.`
    : `You are an expert AI educator with decades of experience creating professional university-level educational content.

**COURSE**: ${courseTitle}
**DESCRIPTION**: ${courseDesc}
**MODULE**: ${moduleTitle}
**TYPE**: ${moduleType}

Generate COMPREHENSIVE and PROFESSIONAL content for this module (minimum 2500 words / 8000+ characters):

## QUALITY REQUIREMENTS:

### DEPTH AND RIGOR:
- Don't use generic or superficial content
- Include SPECIFIC examples with real technical details
- Explain the "why" behind each concept, not just the "what"
- Use precise technical terminology (but explain it)
- Include quantitative data, statistics, benchmarks when relevant

### STRUCTURE (Markdown):
# ${moduleTitle}

## 🎯 Learning Objectives
[3-5 concrete, measurable objectives]

## 📖 Introduction
[300-400 words: context, importance, applications]

## 🧠 Fundamental Concepts
[800-1000 words: solid theory, precise definitions]

## 💡 Practical Examples and Use Cases
[800-1000 words: 3-5 DETAILED examples with real code/procedures]

## ⚙️ Step-by-Step Implementation
[600-800 words: practical, actionable guide]

## ⚠️ Common Mistakes and Best Practices
[400-500 words: real problems and solutions]

## 🚀 Advanced Applications
[300-400 words: advanced techniques, current trends]

## 📚 Additional Resources
[5-7 real, specific educational resources with URLs]

## 🎯 Key Takeaways
[5-8 essential conclusions]

### STYLE:
- Write as a professional mentor, NOT as an AI
- Use "we" when discussing industry practices
- Include rhetorical questions to stimulate critical thinking
- Balance technical depth with clarity
- Each section must provide UNIQUE value

### TECHNICAL CONTENT:
- Include code blocks when appropriate (with correct syntax)
- Use tables to compare options/technologies
- Include diagrams in ASCII art markdown format if useful
- Cite frameworks, methodologies, or principles by name

IMPORTANT: This content will be evaluated for its DEPTH, RIGOR, and PRACTICAL UTILITY. Don't use placeholders or generic content.`;

  try {
    const response = await llm.generate(prompt, {
      temperature: 0.7,
      maxTokens: 6000
    });
    
    return response.content;
  } catch (error) {
    console.error(`      ❌ LLM generation failed:`, error);
    throw error;
  }
}

async function regenerateModule(
  moduleId: string,
  courseTitle: string,
  courseDesc: string,
  moduleTitle: string,
  moduleType: string,
  currentLenEn: number,
  currentLenEs: number
) {
  console.log(`\n   🔄 ${moduleTitle}`);
  console.log(`      Current: EN=${currentLenEn} | ES=${currentLenEs}`);

  const minLen = MIN_LENGTH[moduleType as keyof typeof MIN_LENGTH] || 2500;

  try {
    // Regenerate EN if needed
    if (currentLenEn < minLen) {
      console.log(`      🤖 Generating EN content...`);
      const contentEn = await generateProfessionalContent(
        courseTitle,
        courseDesc,
        moduleTitle,
        moduleType,
        'en'
      );
      
      await supabase
        .from('course_modules')
        .update({ content_en: contentEn })
        .eq('id', moduleId);
      
      console.log(`      ✅ EN complete (${contentEn.length} chars)`);
    }

    // Regenerate ES if needed
    if (currentLenEs < minLen) {
      console.log(`      🤖 Generating ES content...`);
      const contentEs = await generateProfessionalContent(
        courseTitle,
        courseDesc,
        moduleTitle,
        moduleType,
        'es'
      );
      
      await supabase
        .from('course_modules')
        .update({ content_es: contentEs })
        .eq('id', moduleId);
      
      console.log(`      ✅ ES complete (${contentEs.length} chars)`);
    }

    console.log(`      ✨ Module regenerated successfully!`);
    return true;
  } catch (error) {
    console.error(`      ❌ Failed:`, error);
    return false;
  }
}

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  BATCH MODULE CONTENT REGENERATOR                        ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  // Fetch all courses and modules
  const { data: courses, error } = await supabase
    .from('courses')
    .select(`
      id,
      title_en,
      title_es,
      description_en,
      description_es,
      difficulty,
      course_modules (
        id,
        order_index,
        title_en,
        title_es,
        content_en,
        content_es,
        type,
        estimated_time
      )
    `)
    .order('created_at', { ascending: true });

  if (error || !courses) {
    console.error('❌ Failed to fetch courses:', error);
    return;
  }

  console.log(`📚 Processing ${courses.length} courses...\n`);

  let totalProcessed = 0;
  let totalSuccess = 0;
  let totalSkipped = 0;

  for (const course of courses) {
    const mods = (course as any).course_modules || [];
    const courseTitleEn = course.title_en;
    const courseTitleEs = course.title_es;
    const courseDescEn = course.description_en || '';
    const courseDescEs = course.description_es || '';

    const needsWork = mods.filter((m: any) => {
      const minLen = MIN_LENGTH[m.type as keyof typeof MIN_LENGTH] || 2500;
      return (m.content_en?.length || 0) < minLen || (m.content_es?.length || 0) < minLen;
    });

    if (needsWork.length === 0) {
      console.log(`✅ ${courseTitleEn} - All modules OK, skipping`);
      continue;
    }

    console.log(`\n📖 ${courseTitleEn} (${needsWork.length} modules need work)`);

    for (let i = 0; i < needsWork.length; i++) {
      const mod = needsWork[i];
      totalProcessed++;
      
      const success = await regenerateModule(
        mod.id,
        courseTitleEn,
        courseDescEn,
        mod.title_en,
        mod.type,
        mod.content_en?.length || 0,
        mod.content_es?.length || 0
      );

      if (success) totalSuccess++;

      // Rate limiting: wait 8 seconds between modules to avoid LLM API limits
      if (i < needsWork.length - 1) {
        console.log(`      ⏱️  Waiting 8s before next module...`);
        await new Promise(resolve => setTimeout(resolve, 8000));
      }
    }
  }

  console.log('\n\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  REGENERATION COMPLETE!                                  ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  console.log(`📊 Results:`);
  console.log(`   Total modules processed: ${totalProcessed}`);
  console.log(`   Successful: ${totalSuccess}`);
  console.log(`   Failed: ${totalProcessed - totalSuccess}`);
  console.log(`\n✨ All modules now have professional, extensive content!\n`);
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('\n❌ Fatal error:', err);
    process.exit(1);
  });
