#!/usr/bin/env npx tsx
/**
 * ============================================================================
 * MASSIVE COURSE UPGRADE SCRIPT - TEXTBOOK QUALITY
 * ============================================================================
 * 
 * This script upgrades ALL existing courses to textbook-quality standards:
 * 
 * 1. Uses specialized Ollama models for different tasks:
 *    - DeepSeek R1 70B: Planning, exercises, exam generation (reasoning)
 *    - Qwen3 30B: Content prose, case studies, translations (polished output)
 * 2. Expands each module to 15,000+ words with:
 *    - 8+ major sections
 *    - Case studies
 *    - Exercises with solutions
 *    - "Did You Know?" boxes
 *    - Chapter exams
 * 3. Generates educational illustrations using Nano Banana Pro (Google Gemini)
 * 4. Updates the database with the enhanced content
 * 
 * MODEL STRATEGY:
 *   🧠 DeepSeek R1 70B → Outline planning, exercise banks, reasoning validation
 *   📘 Qwen3 30B → Main prose content, case studies, translations
 * 
 * Usage:
 *   npx tsx scripts/upgrade-courses-textbook-quality.ts
 *   npx tsx scripts/upgrade-courses-textbook-quality.ts --course-id <uuid>
 *   npx tsx scripts/upgrade-courses-textbook-quality.ts --dry-run
 *   npx tsx scripts/upgrade-courses-textbook-quality.ts --download-models
 * 
 * @author AI News Platform
 * @version 2.0.0
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import * as readline from 'readline';
import {
  analyzeModuleForImages,
  generateModuleImages,
  insertImagesIntoContent,
  type ImageAnalysisResult
} from '../lib/ai/image-insertion-ai';

// Load environment
dotenv.config({ path: path.join(__dirname, '../.env.local') });

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Minimum content requirements (in characters)
  MIN_CONTENT_LENGTH: 50000, // ~15,000 words = ~50,000 chars
  MIN_SECTIONS: 8,
  MIN_EXERCISES: 10,
  MIN_CASE_STUDIES: 2,
  
  // LLM settings
  OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  
  // Model Strategy: Different models for different tasks
  // 🧠 DeepSeek R1 70B - Reasoning, planning, exercises, IMAGE ANALYSIS
  // 📘 Qwen3 30B - Prose content, case studies, translations
  MODELS: {
    reasoning: 'deepseek-r1:70b',   // Planning, exercises, validation, image analysis
    prose: 'qwen3:30b',              // Content generation, case studies
    fallback: 'qwen2.5:14b'          // Lightweight fallback
  },
  
  // Models to download if not available
  REQUIRED_MODELS: [
    'deepseek-r1:70b',  // ~40GB - Reasoning powerhouse
    'qwen3:30b',        // ~17GB - Prose generation
  ],
  
  // Batch processing
  BATCH_SIZE: 1, // Process one module at a time (heavy processing)
  DELAY_BETWEEN_MODULES_MS: 2000,
  
  // Image generation settings
  GENERATE_IMAGES: true,
  MAX_IMAGES_PER_MODULE: 6,           // Max images per module
  MIN_IMAGES_PER_MODULE: 3,           // Minimum images to generate
  IMAGE_PRIORITIES: ['essential', 'recommended'], // Which priorities to generate
};

// ============================================================================
// SUPABASE CLIENT
// ============================================================================

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

interface Course {
  id: string;
  title_en: string;
  title_es: string;
  description_en: string;
  description_es: string;
  difficulty: string;
  topics: string[];
  course_modules: Module[];
}

interface Module {
  id: string;
  course_id: string;
  order_index: number;
  title_en: string;
  title_es: string;
  description_en?: string;
  description_es?: string;
  content_en: string;
  content_es: string;
  content_type: string;
  estimated_time: number;
  resources?: Array<{ title: string; url: string; type: string }>;
}

interface OllamaModel {
  name: string;
  size: number;
  modified_at: string;
  details?: {
    parameter_size?: string;
    quantization_level?: string;
  };
}

interface UpgradeResult {
  courseId: string;
  courseTitle: string;
  modulesProcessed: number;
  modulesUpgraded: number;
  modulesFailed: number;
  imagesGenerated: number;
  totalTime: number;
  errors: string[];
}

const TextbookSectionSchema = z.object({
  introduction: z.string().min(1000),
  foundational_concepts: z.string().min(2000),
  core_theory: z.string().min(3000),
  advanced_deep_dive: z.string().min(3000),
  case_studies: z.array(z.object({
    title: z.string(),
    company: z.string(),
    background: z.string().min(300),
    challenge: z.string().min(200),
    solution: z.string().min(400),
    results: z.string().min(200),
    lessons: z.array(z.string())
  })).min(2),
  practical_guide: z.string().min(2000),
  edge_cases: z.string().min(1000),
  summary: z.string().min(500),
  exercises: z.array(z.object({
    type: z.string(),
    difficulty: z.string(),
    question: z.string(),
    solution: z.string(),
    explanation: z.string()
  })).min(10),
  did_you_know: z.array(z.object({
    title: z.string(),
    content: z.string(),
    illustration_prompt: z.string().optional()
  })).min(3),
  key_terms: z.array(z.object({
    term: z.string(),
    definition: z.string()
  })).min(10),
  exam_questions: z.array(z.object({
    type: z.string(),
    question: z.string(),
    options: z.array(z.string()).optional(),
    answer: z.string(),
    explanation: z.string()
  })).min(15)
});

// ============================================================================
// OLLAMA HELPERS
// ============================================================================

async function checkOllamaRunning(): Promise<boolean> {
  try {
    const response = await fetch(`${CONFIG.OLLAMA_BASE_URL}/api/version`, {
      signal: AbortSignal.timeout(5000)
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function getOllamaModels(): Promise<OllamaModel[]> {
  try {
    const response = await fetch(`${CONFIG.OLLAMA_BASE_URL}/api/tags`);
    if (!response.ok) return [];
    const data = await response.json();
    return data.models || [];
  } catch {
    return [];
  }
}

async function downloadOllamaModel(modelName: string): Promise<boolean> {
  console.log(`\n📥 Downloading model: ${modelName}...`);
  console.log('   This may take several minutes depending on model size and internet speed.\n');
  
  try {
    const response = await fetch(`${CONFIG.OLLAMA_BASE_URL}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: modelName, stream: true })
    });
    
    if (!response.ok || !response.body) {
      console.error(`❌ Failed to start download: ${response.status}`);
      return false;
    }
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let lastStatus = '';
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const lines = decoder.decode(value).split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const data = JSON.parse(line);
          if (data.status && data.status !== lastStatus) {
            process.stdout.write(`\r   ${data.status}                    `);
            lastStatus = data.status;
          }
          if (data.completed && data.total) {
            const pct = ((data.completed / data.total) * 100).toFixed(1);
            process.stdout.write(`\r   Downloading: ${pct}%                    `);
          }
        } catch {
          // Ignore parse errors
        }
      }
    }
    
    console.log('\n✅ Model downloaded successfully!');
    return true;
  } catch (error) {
    console.error(`\n❌ Download failed:`, error);
    return false;
  }
}

async function selectBestModel(): Promise<string | null> {
  const availableModels = await getOllamaModels();
  
  if (availableModels.length === 0) {
    console.log('⚠️  No Ollama models found.');
    return null;
  }
  
  console.log('\n📋 Available Ollama models:');
  availableModels.forEach(m => {
    const sizeGB = (m.size / (1024 ** 3)).toFixed(1);
    console.log(`   - ${m.name} (${sizeGB} GB)`);
  });
  
  // Check for required models
  const hasDeepSeek = availableModels.some(m => m.name.includes('deepseek-r1'));
  const hasQwen3 = availableModels.some(m => m.name.includes('qwen3'));
  
  console.log('\n🧠 Model Strategy:');
  console.log(`   DeepSeek R1 (reasoning): ${hasDeepSeek ? '✅ Available' : '❌ Not found'}`);
  console.log(`   Qwen3 30B (prose):       ${hasQwen3 ? '✅ Available' : '❌ Not found'}`);
  
  // Return first required model as "primary" for backward compatibility
  if (hasDeepSeek) {
    return CONFIG.MODELS.reasoning;
  }
  if (hasQwen3) {
    return CONFIG.MODELS.prose;
  }
  
  // Fall back to any available model
  const fallbackModel = availableModels.find(m => 
    m.name.includes('qwen') || m.name.includes('llama')
  );
  
  if (fallbackModel) {
    console.log(`\n⚠️  Using fallback model: ${fallbackModel.name}`);
    return fallbackModel.name;
  }
  
  // Last resort: largest model
  const largest = availableModels.sort((a, b) => b.size - a.size)[0];
  console.log(`\n⚠️  Using largest model: ${largest.name}`);
  return largest.name;
}

/**
 * Select the appropriate model for a specific task type
 */
type TaskType = 'reasoning' | 'prose' | 'general';

async function selectModelForTask(task: TaskType): Promise<string> {
  const availableModels = await getOllamaModels();
  
  const hasModel = (name: string) => 
    availableModels.some(m => m.name.includes(name.split(':')[0]));
  
  switch (task) {
    case 'reasoning':
      // DeepSeek R1 for reasoning tasks
      if (hasModel(CONFIG.MODELS.reasoning)) return CONFIG.MODELS.reasoning;
      if (hasModel(CONFIG.MODELS.prose)) return CONFIG.MODELS.prose;
      break;
    case 'prose':
      // Qwen3 for prose generation
      if (hasModel(CONFIG.MODELS.prose)) return CONFIG.MODELS.prose;
      if (hasModel(CONFIG.MODELS.reasoning)) return CONFIG.MODELS.reasoning;
      break;
    default:
      break;
  }
  
  // Fallback chain
  if (hasModel(CONFIG.MODELS.fallback)) return CONFIG.MODELS.fallback;
  
  const largest = availableModels.sort((a, b) => b.size - a.size)[0];
  return largest?.name || 'qwen2.5:14b';
}

// ============================================================================
// OUTPUT CLEANING
// ============================================================================

/**
 * Clean DeepSeek R1's chain-of-thought output
 * DeepSeek outputs <think>...</think> blocks that need removal
 */
function cleanDeepSeekOutput(text: string): string {
  // Remove <think>...</think> blocks
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
  
  // Remove common reasoning artifacts
  cleaned = cleaned.replace(/^(Let me think|Let's analyze|First,? I'll|Okay,? so)\b[^.]*\./gmi, '');
  cleaned = cleaned.replace(/^(Step \d+:|First:|Second:|Third:|Finally:)/gmi, '');
  
  // Remove excessive newlines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  
  return cleaned.trim();
}

/**
 * Clean Qwen3's output (usually clean, but may have thinking tokens)
 */
function cleanQwenOutput(text: string): string {
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
  cleaned = cleaned.replace(/^(Thinking:|Let me think:?)\s*/gmi, '');
  cleaned = cleaned.replace(/\n{4,}/g, '\n\n\n');
  return cleaned.trim();
}

// ============================================================================
// LLM GENERATION
// ============================================================================

/**
 * Generate with the appropriate model for the task type
 */
async function generateForTask(
  task: TaskType,
  prompt: string,
  systemPrompt: string,
  maxRetries: number = 3
): Promise<string> {
  const modelName = await selectModelForTask(task);
  const result = await generateWithOllama(modelName, prompt, systemPrompt, maxRetries);
  
  // Apply model-specific cleaning
  if (modelName.includes('deepseek')) {
    return cleanDeepSeekOutput(result);
  } else if (modelName.includes('qwen')) {
    return cleanQwenOutput(result);
  }
  
  return result;
}

async function generateWithOllama(
  modelName: string,
  prompt: string,
  systemPrompt: string,
  maxRetries: number = 3
): Promise<string> {
  // Adjust temperature based on model
  const temperature = modelName.includes('deepseek') ? 0.3 : 0.7;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`   [Ollama] Generating with ${modelName} (attempt ${attempt}/${maxRetries})...`);
      
      const response = await fetch(`${CONFIG.OLLAMA_BASE_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelName,
          prompt: prompt,
          system: systemPrompt,
          stream: false,
          options: {
            temperature,
            top_p: 0.9,
            num_predict: 32000, // Allow long outputs
            num_ctx: 8192,      // Large context
          }
        }),
        signal: AbortSignal.timeout(600000) // 10 minutes timeout
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`HTTP ${response.status}: ${error}`);
      }
      
      const data = await response.json();
      return data.response || '';
    } catch (error) {
      console.error(`   ❌ Attempt ${attempt} failed:`, error instanceof Error ? error.message : error);
      if (attempt === maxRetries) throw error;
      await sleep(5000); // Wait before retry
    }
  }
  
  throw new Error('All retries exhausted');
}

// ============================================================================
// AI-POWERED IMAGE GENERATION (DeepSeek Analysis + Nano Banana Pro)
// ============================================================================

/**
 * Analyzes content with DeepSeek R1 to decide optimal image placement,
 * generates images with Nano Banana Pro, and inserts them into content.
 * 
 * Flow:
 * 1. DeepSeek R1 analyzes content structure and semantics
 * 2. Identifies key concepts needing visual representation
 * 3. Generates detailed prompts for each image
 * 4. Nano Banana Pro creates the educational illustrations
 * 5. Images are inserted at semantically appropriate positions
 */
async function generateAndInsertImages(
  content: string,
  moduleTitle: string,
  locale: 'en' | 'es'
): Promise<{ enhancedContent: string; imagesGenerated: number }> {
  if (!CONFIG.GENERATE_IMAGES) {
    return { enhancedContent: content, imagesGenerated: 0 };
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    console.log('   ⚠️  GEMINI_API_KEY not set, skipping image generation');
    return { enhancedContent: content, imagesGenerated: 0 };
  }

  try {
    // Step 1: DeepSeek analyzes content for optimal image placement
    console.log('   🧠 DeepSeek analyzing content for image placement...');
    const analysis = await analyzeModuleForImages(content, moduleTitle, locale);
    
    if (!analysis || analysis.insertionPoints.length === 0) {
      console.log('   ℹ️  No image insertion points identified');
      return { enhancedContent: content, imagesGenerated: 0 };
    }

    console.log(`   📍 Found ${analysis.insertionPoints.length} optimal insertion points`);
    
    // Log the analysis summary
    if (analysis.overallStrategy) {
      console.log(`   📝 Strategy: ${analysis.overallStrategy.substring(0, 100)}...`);
    }

    // Step 2: Generate images with Nano Banana Pro
    console.log(`   🖼️  Generating ${Math.min(CONFIG.MAX_IMAGES_PER_MODULE, analysis.insertionPoints.length)} illustrations with Nano Banana Pro...`);
    const images = await generateModuleImages(
      analysis, 
      locale, 
      CONFIG.MAX_IMAGES_PER_MODULE
    );

    if (images.size === 0) {
      console.log('   ⚠️  No images were generated');
      return { enhancedContent: content, imagesGenerated: 0 };
    }

    // Count successful images
    const successfulImages = Array.from(images.values()).filter(r => r.success).length;
    console.log(`   ✅ Generated ${successfulImages} illustrations`);

    // Step 3: Insert images into content at optimal positions
    console.log('   📐 Inserting images into content at optimal positions...');
    const enhancedContent = insertImagesIntoContent(content, analysis, images, locale);

    // Log image types generated
    const imageTypes = analysis.insertionPoints
      .filter(p => images.has(p.id) && images.get(p.id)?.success)
      .map(p => p.imageType)
      .join(', ');
    console.log(`   🎨 Image types: ${imageTypes}`);

    return { enhancedContent, imagesGenerated: successfulImages };

  } catch (error) {
    console.log(`   ⚠️  Image generation pipeline error:`, error instanceof Error ? error.message : error);
    return { enhancedContent: content, imagesGenerated: 0 };
  }
}

// ============================================================================
// CONTENT GENERATION
// ============================================================================

function buildTextbookPrompt(
  course: Course,
  module: Module,
  locale: 'en' | 'es'
): string {
  const isSpanish = locale === 'es';
  const courseTitle = isSpanish ? course.title_es : course.title_en;
  const courseDesc = isSpanish ? course.description_es : course.description_en;
  const moduleTitle = isSpanish ? module.title_es : module.title_en;
  
  return isSpanish ? `
Eres un profesor universitario de renombre mundial y autor de libros de texto con más de 30 años de experiencia. Tu tarea es escribir un CAPÍTULO COMPLETO de libro de texto universitario.

═══════════════════════════════════════════════════════════════════════════════
INFORMACIÓN DEL CURSO
═══════════════════════════════════════════════════════════════════════════════

CURSO: "${courseTitle}"
DESCRIPCIÓN: ${courseDesc}
DIFICULTAD: ${course.difficulty}
TEMAS CLAVE: ${course.topics?.join(', ') || 'IA, Machine Learning'}

CAPÍTULO/MÓDULO: "${moduleTitle}"
ORDEN EN EL CURSO: Módulo ${module.order_index + 1}

═══════════════════════════════════════════════════════════════════════════════
REQUISITOS DE CONTENIDO - CALIDAD DE LIBRO DE TEXTO
═══════════════════════════════════════════════════════════════════════════════

Genera un JSON estructurado con el siguiente contenido extenso:

1. **INTRODUCCIÓN Y CONTEXTO** (1000+ palabras)
   - Por qué este tema es fundamental
   - Conexión con conocimientos previos
   - Vista previa del viaje de aprendizaje
   - Relevancia en la industria actual

2. **CONCEPTOS FUNDAMENTALES** (2000+ palabras)
   - Definiciones precisas de términos clave
   - Fundamentos teóricos
   - Vocabulario técnico explicado
   - Evolución histórica del campo

3. **TEORÍA CENTRAL Y PRINCIPIOS** (3000+ palabras)
   - Explicación profunda de conceptos principales
   - Lógica y razonamiento subyacente
   - Relaciones entre elementos
   - Referencias a frameworks establecidos
   - Fórmulas matemáticas si aplica

4. **INMERSIÓN AVANZADA** (3000+ palabras)
   - Exploración de aspectos complejos
   - Técnicas y metodologías avanzadas
   - Desarrollos de vanguardia
   - Investigación emergente

5. **CASOS DE ESTUDIO** (mínimo 2 detallados)
   - Empresa/contexto real
   - Desafío específico enfrentado
   - Solución implementada
   - Resultados cuantitativos
   - Lecciones aprendidas

6. **GUÍA DE IMPLEMENTACIÓN PRÁCTICA** (2000+ palabras)
   - Procedimientos paso a paso
   - Herramientas y frameworks
   - Ejemplos de código
   - Errores comunes y cómo evitarlos

7. **CASOS LÍMITE Y LIMITACIONES** (1000+ palabras)
   - Cuándo NO usar este enfoque
   - Condiciones límite
   - Trade-offs y limitaciones
   - Consideraciones avanzadas

8. **RESUMEN E INTEGRACIÓN** (500+ palabras)
   - Síntesis de puntos clave
   - Conexión con el curso general
   - Qué practicar

9. **EJERCICIOS** (mínimo 10)
   - 3 básicos (múltiple opción, completar)
   - 4 intermedios (respuesta corta, análisis)
   - 2 avanzados (implementación, ensayo)
   - 1 desafío (proyecto)
   - Todos con solución y explicación detallada

10. **CAJAS "¿SABÍAS QUE?"** (mínimo 3)
    - Datos curiosos o históricos
    - Cada una con prompt para ilustración

11. **GLOSARIO** (mínimo 10 términos)
    - Definiciones precisas y concisas

12. **EXAMEN DEL CAPÍTULO** (mínimo 15 preguntas)
    - Sección A: Opción múltiple (5-7)
    - Sección B: Verdadero/Falso (3-4)
    - Sección C: Respuesta corta (3-4)
    - Sección D: Análisis (2-3)
    - Todas con respuesta y explicación

═══════════════════════════════════════════════════════════════════════════════
FORMATO DE RESPUESTA JSON
═══════════════════════════════════════════════════════════════════════════════

{
  "introduction": "texto markdown extenso...",
  "foundational_concepts": "texto markdown extenso...",
  "core_theory": "texto markdown extenso...",
  "advanced_deep_dive": "texto markdown extenso...",
  "case_studies": [
    {
      "title": "...",
      "company": "...",
      "background": "...",
      "challenge": "...",
      "solution": "...",
      "results": "...",
      "lessons": ["..."]
    }
  ],
  "practical_guide": "texto markdown extenso...",
  "edge_cases": "texto markdown extenso...",
  "summary": "texto markdown extenso...",
  "exercises": [
    {
      "type": "multiple_choice|short_answer|coding|essay",
      "difficulty": "basic|intermediate|advanced|challenge",
      "question": "...",
      "solution": "...",
      "explanation": "..."
    }
  ],
  "did_you_know": [
    {
      "title": "...",
      "content": "...",
      "illustration_prompt": "descripción para generar ilustración"
    }
  ],
  "key_terms": [
    { "term": "...", "definition": "..." }
  ],
  "exam_questions": [
    {
      "type": "multiple_choice|true_false|short_answer|essay",
      "question": "...",
      "options": ["A", "B", "C", "D"],
      "answer": "...",
      "explanation": "..."
    }
  ]
}

IMPORTANTE: 
- El contenido total debe superar las 15,000 palabras
- Escribe como un experto de la industria, no como una IA
- Incluye ejemplos específicos con nombres de empresas, métricas reales
- Usa código cuando sea apropiado (con sintaxis correcta)
- Las explicaciones deben ser exhaustivas, no superficiales
` : `
You are a world-renowned university professor and textbook author with over 30 years of experience. Your task is to write a COMPLETE university textbook CHAPTER.

═══════════════════════════════════════════════════════════════════════════════
COURSE INFORMATION
═══════════════════════════════════════════════════════════════════════════════

COURSE: "${courseTitle}"
DESCRIPTION: ${courseDesc}
DIFFICULTY: ${course.difficulty}
KEY TOPICS: ${course.topics?.join(', ') || 'AI, Machine Learning'}

CHAPTER/MODULE: "${moduleTitle}"
ORDER IN COURSE: Module ${module.order_index + 1}

═══════════════════════════════════════════════════════════════════════════════
CONTENT REQUIREMENTS - TEXTBOOK QUALITY
═══════════════════════════════════════════════════════════════════════════════

Generate a structured JSON with the following extensive content:

1. **INTRODUCTION & CONTEXT** (1000+ words)
   - Why this topic is fundamental
   - Connection to prior knowledge
   - Preview of the learning journey
   - Current industry relevance

2. **FOUNDATIONAL CONCEPTS** (2000+ words)
   - Precise definitions of key terms
   - Theoretical foundations
   - Technical vocabulary explained
   - Historical evolution of the field

3. **CORE THEORY & PRINCIPLES** (3000+ words)
   - Deep explanation of main concepts
   - Underlying logic and reasoning
   - Relationships between elements
   - References to established frameworks
   - Mathematical formulas if applicable

4. **ADVANCED DEEP DIVE** (3000+ words)
   - Exploration of complex aspects
   - Advanced techniques and methodologies
   - Cutting-edge developments
   - Emerging research

5. **CASE STUDIES** (minimum 2 detailed)
   - Real company/context
   - Specific challenge faced
   - Solution implemented
   - Quantitative results
   - Lessons learned

6. **PRACTICAL IMPLEMENTATION GUIDE** (2000+ words)
   - Step-by-step procedures
   - Tools and frameworks
   - Code examples
   - Common mistakes and how to avoid them

7. **EDGE CASES & LIMITATIONS** (1000+ words)
   - When NOT to use this approach
   - Boundary conditions
   - Trade-offs and limitations
   - Advanced considerations

8. **SUMMARY & INTEGRATION** (500+ words)
   - Synthesis of key points
   - Connection to overall course
   - What to practice

9. **EXERCISES** (minimum 10)
   - 3 basic (multiple choice, fill-in)
   - 4 intermediate (short answer, analysis)
   - 2 advanced (implementation, essay)
   - 1 challenge (project)
   - All with detailed solution and explanation

10. **"DID YOU KNOW?" BOXES** (minimum 3)
    - Curious facts or historical context
    - Each with illustration prompt

11. **GLOSSARY** (minimum 10 terms)
    - Precise, concise definitions

12. **CHAPTER EXAM** (minimum 15 questions)
    - Section A: Multiple choice (5-7)
    - Section B: True/False (3-4)
    - Section C: Short answer (3-4)
    - Section D: Analysis (2-3)
    - All with answer and explanation

═══════════════════════════════════════════════════════════════════════════════
JSON RESPONSE FORMAT
═══════════════════════════════════════════════════════════════════════════════

{
  "introduction": "extensive markdown text...",
  "foundational_concepts": "extensive markdown text...",
  "core_theory": "extensive markdown text...",
  "advanced_deep_dive": "extensive markdown text...",
  "case_studies": [
    {
      "title": "...",
      "company": "...",
      "background": "...",
      "challenge": "...",
      "solution": "...",
      "results": "...",
      "lessons": ["..."]
    }
  ],
  "practical_guide": "extensive markdown text...",
  "edge_cases": "extensive markdown text...",
  "summary": "extensive markdown text...",
  "exercises": [
    {
      "type": "multiple_choice|short_answer|coding|essay",
      "difficulty": "basic|intermediate|advanced|challenge",
      "question": "...",
      "solution": "...",
      "explanation": "..."
    }
  ],
  "did_you_know": [
    {
      "title": "...",
      "content": "...",
      "illustration_prompt": "description for generating illustration"
    }
  ],
  "key_terms": [
    { "term": "...", "definition": "..." }
  ],
  "exam_questions": [
    {
      "type": "multiple_choice|true_false|short_answer|essay",
      "question": "...",
      "options": ["A", "B", "C", "D"],
      "answer": "...",
      "explanation": "..."
    }
  ]
}

IMPORTANT: 
- Total content must exceed 15,000 words
- Write as an industry expert, not as an AI
- Include specific examples with company names, real metrics
- Use code when appropriate (with correct syntax)
- Explanations must be exhaustive, not superficial
`;
}

function assembleMarkdownContent(data: z.infer<typeof TextbookSectionSchema>, locale: 'en' | 'es'): string {
  const isSpanish = locale === 'es';
  const sections: string[] = [];
  
  // Introduction
  sections.push(`## ${isSpanish ? '📖 Introducción' : '📖 Introduction'}\n\n${data.introduction}\n`);
  
  // Foundational Concepts
  sections.push(`## ${isSpanish ? '🧠 Conceptos Fundamentales' : '🧠 Foundational Concepts'}\n\n${data.foundational_concepts}\n`);
  
  // Core Theory
  sections.push(`## ${isSpanish ? '📚 Teoría Central y Principios' : '📚 Core Theory & Principles'}\n\n${data.core_theory}\n`);
  
  // Advanced Deep Dive
  sections.push(`## ${isSpanish ? '🔬 Inmersión Avanzada' : '🔬 Advanced Deep Dive'}\n\n${data.advanced_deep_dive}\n`);
  
  // Case Studies
  sections.push(`## ${isSpanish ? '📊 Casos de Estudio' : '📊 Case Studies'}\n`);
  data.case_studies.forEach((cs, i) => {
    sections.push(`### ${isSpanish ? 'Caso' : 'Case'} ${i + 1}: ${cs.title}\n`);
    sections.push(`**${isSpanish ? 'Empresa/Contexto' : 'Company/Context'}:** ${cs.company}\n`);
    sections.push(`#### ${isSpanish ? 'Antecedentes' : 'Background'}\n${cs.background}\n`);
    sections.push(`#### ${isSpanish ? 'Desafío' : 'Challenge'}\n${cs.challenge}\n`);
    sections.push(`#### ${isSpanish ? 'Solución' : 'Solution'}\n${cs.solution}\n`);
    sections.push(`#### ${isSpanish ? 'Resultados' : 'Results'}\n${cs.results}\n`);
    sections.push(`#### ${isSpanish ? 'Lecciones Aprendidas' : 'Lessons Learned'}\n`);
    cs.lessons.forEach(lesson => sections.push(`- ${lesson}`));
    sections.push('\n');
  });
  
  // Practical Guide
  sections.push(`## ${isSpanish ? '⚙️ Guía de Implementación Práctica' : '⚙️ Practical Implementation Guide'}\n\n${data.practical_guide}\n`);
  
  // Edge Cases
  sections.push(`## ${isSpanish ? '⚠️ Casos Límite y Limitaciones' : '⚠️ Edge Cases & Limitations'}\n\n${data.edge_cases}\n`);
  
  // Did You Know boxes
  sections.push(`---\n`);
  data.did_you_know.forEach(dyk => {
    sections.push(`> ### 💡 ${isSpanish ? '¿Sabías que?' : 'Did You Know?'}: ${dyk.title}\n>`);
    sections.push(`> ${dyk.content}\n`);
  });
  
  // Key Terms / Glossary
  sections.push(`## ${isSpanish ? '📖 Glosario' : '📖 Glossary'}\n`);
  sections.push(`| ${isSpanish ? 'Término' : 'Term'} | ${isSpanish ? 'Definición' : 'Definition'} |`);
  sections.push('|--------|------------|');
  data.key_terms.forEach(kt => {
    sections.push(`| **${kt.term}** | ${kt.definition} |`);
  });
  sections.push('\n');
  
  // Exercises
  sections.push(`## ${isSpanish ? '🎯 Ejercicios de Práctica' : '🎯 Practice Exercises'}\n`);
  const difficultyEmoji: Record<string, string> = {
    basic: '🟢',
    intermediate: '🟡',
    advanced: '🟠',
    challenge: '🔴'
  };
  
  data.exercises.forEach((ex, i) => {
    sections.push(`### ${isSpanish ? 'Ejercicio' : 'Exercise'} ${i + 1} ${difficultyEmoji[ex.difficulty] || '⚪'}\n`);
    sections.push(`**${isSpanish ? 'Tipo' : 'Type'}:** ${ex.type} | **${isSpanish ? 'Dificultad' : 'Difficulty'}:** ${ex.difficulty}\n`);
    sections.push(`**${isSpanish ? 'Pregunta' : 'Question'}:** ${ex.question}\n`);
    sections.push(`<details>\n<summary>${isSpanish ? '✅ Ver Solución' : '✅ View Solution'}</summary>\n`);
    sections.push(`\n**${isSpanish ? 'Solución' : 'Solution'}:** ${ex.solution}\n`);
    sections.push(`**${isSpanish ? 'Explicación' : 'Explanation'}:** ${ex.explanation}\n`);
    sections.push(`</details>\n`);
  });
  
  // Summary
  sections.push(`## ${isSpanish ? '📋 Resumen del Capítulo' : '📋 Chapter Summary'}\n\n${data.summary}\n`);
  
  // Chapter Exam
  sections.push(`---\n## ${isSpanish ? '📝 Examen del Capítulo' : '📝 Chapter Exam'}\n`);
  data.exam_questions.forEach((q, i) => {
    sections.push(`**${i + 1}.** ${q.question}`);
    if (q.options && q.options.length > 0) {
      q.options.forEach((opt, oi) => {
        sections.push(`   ${String.fromCharCode(65 + oi)}. ${opt}`);
      });
    }
    sections.push('');
  });
  
  sections.push(`<details>\n<summary>${isSpanish ? '📋 Ver Respuestas' : '📋 View Answers'}</summary>\n`);
  data.exam_questions.forEach((q, i) => {
    sections.push(`**${i + 1}.** ${q.answer}`);
    sections.push(`   *${q.explanation}*\n`);
  });
  sections.push(`</details>\n`);
  
  return sections.join('\n');
}

// ============================================================================
// MAIN UPGRADE LOGIC
// ============================================================================

async function upgradeModule(
  course: Course,
  module: Module,
  _modelName: string, // Kept for backwards compatibility, but not used
  locale: 'en' | 'es'
): Promise<{ content: string; images: string[]; imagesGenerated: number }> {
  const prompt = buildTextbookPrompt(course, module, locale);
  const moduleTitle = locale === 'es' ? module.title_es : module.title_en;
  
  const systemPrompt = `You are a world-class university professor and textbook author. You write comprehensive, engaging educational content that rivals the best academic publishers.

CRITICAL: You MUST respond with ONLY valid JSON. No markdown fences, no commentary, no text before or after the JSON.

The JSON must follow the exact schema provided in the prompt.`;

  console.log(`   📝 Generating textbook content for ${locale.toUpperCase()}...`);
  console.log(`   🧠 Using Qwen3:30B for prose generation...`);
  const startTime = Date.now();
  
  // Use prose task for content generation (Qwen3:30B)
  const rawResponse = await generateForTask('prose', prompt, systemPrompt);
  
  // Extract JSON from response
  let jsonStr = rawResponse;
  const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    jsonStr = jsonMatch[0];
  }
  
  // Parse and validate
  let parsedData: z.infer<typeof TextbookSectionSchema>;
  try {
    parsedData = TextbookSectionSchema.parse(JSON.parse(jsonStr));
    console.log(`   ✅ Content validated (${((Date.now() - startTime) / 1000).toFixed(1)}s)`);
  } catch (parseError) {
    console.log(`   ⚠️  JSON validation failed, attempting to fix...`);
    // Try to fix common JSON issues
    jsonStr = jsonStr
      .replace(/,\s*}/g, '}')
      .replace(/,\s*]/g, ']')
      .replace(/'/g, '"')
      .replace(/\n/g, '\\n');
    
    try {
      parsedData = TextbookSectionSchema.parse(JSON.parse(jsonStr));
      console.log(`   ✅ Fixed and validated`);
    } catch {
      throw new Error(`JSON validation failed: ${parseError}`);
    }
  }
  
  // Assemble markdown content (without images yet)
  let markdownContent = assembleMarkdownContent(parsedData, locale);
  
  // AI-POWERED IMAGE GENERATION & INSERTION
  // DeepSeek analyzes content → decides image placement → Nano Banana Pro generates
  const { enhancedContent, imagesGenerated } = await generateAndInsertImages(
    markdownContent,
    moduleTitle,
    locale
  );
  
  return { content: enhancedContent, images: [], imagesGenerated };
}

async function upgradeCourse(
  course: Course,
  modelName: string,
  dryRun: boolean
): Promise<UpgradeResult> {
  const result: UpgradeResult = {
    courseId: course.id,
    courseTitle: course.title_en,
    modulesProcessed: 0,
    modulesUpgraded: 0,
    modulesFailed: 0,
    imagesGenerated: 0,
    totalTime: 0,
    errors: []
  };
  
  const startTime = Date.now();
  console.log(`\n${'═'.repeat(80)}`);
  console.log(`📚 UPGRADING COURSE: ${course.title_en}`);
  console.log(`${'═'.repeat(80)}`);
  console.log(`   Modules: ${course.course_modules?.length || 0}`);
  console.log(`   Difficulty: ${course.difficulty}`);
  console.log(`   Topics: ${course.topics?.join(', ') || 'N/A'}`);
  
  const modules = course.course_modules || [];
  
  for (let i = 0; i < modules.length; i++) {
    const module = modules[i];
    result.modulesProcessed++;
    
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`📖 Module ${i + 1}/${modules.length}: ${module.title_en}`);
    console.log(`${'─'.repeat(60)}`);
    
    // Check current content length
    const currentLengthEn = module.content_en?.length || 0;
    const currentLengthEs = module.content_es?.length || 0;
    
    console.log(`   Current content: EN=${currentLengthEn} chars, ES=${currentLengthEs} chars`);
    
    if (currentLengthEn >= CONFIG.MIN_CONTENT_LENGTH && currentLengthEs >= CONFIG.MIN_CONTENT_LENGTH) {
      console.log(`   ✅ Already meets minimum requirements, skipping`);
      continue;
    }
    
    try {
      // Generate English content
      console.log(`\n   [EN] Generating English content...`);
      const enResult = await upgradeModule(course, module, modelName, 'en');
      
      // Generate Spanish content
      console.log(`\n   [ES] Generating Spanish content...`);
      const esResult = await upgradeModule(course, module, modelName, 'es');
      
      // Update database
      if (!dryRun) {
        console.log(`   💾 Saving to database...`);
        
        const { error } = await supabase
          .from('course_modules')
          .update({
            content_en: enResult.content,
            content_es: esResult.content,
            // Store images as JSON in a new column or metadata
            // For now, we'll embed them as base64 in content if needed
          })
          .eq('id', module.id);
        
        if (error) {
          throw new Error(`Database update failed: ${error.message}`);
        }
        
        console.log(`   ✅ Module upgraded successfully!`);
        console.log(`      EN: ${enResult.content.length} chars`);
        console.log(`      ES: ${esResult.content.length} chars`);
        console.log(`      🖼️  Images: EN=${enResult.imagesGenerated}, ES=${esResult.imagesGenerated}`);
      } else {
        console.log(`   🔸 DRY RUN - Would update module with:`);
        console.log(`      EN: ${enResult.content.length} chars`);
        console.log(`      ES: ${esResult.content.length} chars`);
        console.log(`      🖼️  Images: EN=${enResult.imagesGenerated}, ES=${esResult.imagesGenerated}`);
      }
      
      result.modulesUpgraded++;
      result.imagesGenerated += enResult.imagesGenerated + esResult.imagesGenerated;
      
    } catch (error) {
      console.error(`   ❌ Failed to upgrade module:`, error);
      result.modulesFailed++;
      result.errors.push(`Module ${module.id}: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // Delay between modules
    if (i < modules.length - 1) {
      console.log(`   ⏳ Waiting ${CONFIG.DELAY_BETWEEN_MODULES_MS / 1000}s before next module...`);
      await sleep(CONFIG.DELAY_BETWEEN_MODULES_MS);
    }
  }
  
  result.totalTime = Date.now() - startTime;
  return result;
}

// ============================================================================
// UTILITIES
// ============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise(resolve => {
    rl.question(query, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

async function main() {
  console.log('\n' + '═'.repeat(80));
  console.log('📚 MASSIVE COURSE UPGRADE - TEXTBOOK QUALITY');
  console.log('═'.repeat(80));
  console.log('\nThis script will upgrade all courses to textbook-quality standards.');
  console.log('Each module will be expanded to 15,000+ words with case studies,');
  console.log('exercises, exams, and AI-generated illustrations.\n');
  
  // Parse CLI arguments
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const downloadModel = args.includes('--download-model');
  const courseIdArg = args.find(a => a.startsWith('--course-id='));
  const specificCourseId = courseIdArg?.split('=')[1];
  
  if (dryRun) {
    console.log('🔸 DRY RUN MODE - No changes will be saved\n');
  }
  
  // Check environment
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing Supabase credentials in .env.local');
    process.exit(1);
  }
  
  // Check Ollama
  console.log('🔍 Checking Ollama...');
  const ollamaRunning = await checkOllamaRunning();
  
  if (!ollamaRunning) {
    console.error('❌ Ollama is not running!');
    console.log('\n📋 To start Ollama:');
    console.log('   1. Install Ollama: https://ollama.ai');
    console.log('   2. Run: ollama serve');
    console.log('   3. Run this script again\n');
    process.exit(1);
  }
  
  console.log('✅ Ollama is running');
  
  // Select or download model
  let modelName = await selectBestModel();
  
  if (!modelName || downloadModel) {
    console.log(`\n⚠️  No suitable heavy model found.`);
    const answer = await askQuestion(
      `Would you like to download ${CONFIG.FALLBACK_MODEL_TO_DOWNLOAD}? (y/n): `
    );
    
    if (answer.toLowerCase() === 'y') {
      const success = await downloadOllamaModel(CONFIG.FALLBACK_MODEL_TO_DOWNLOAD);
      if (success) {
        modelName = CONFIG.FALLBACK_MODEL_TO_DOWNLOAD;
      } else {
        console.error('❌ Failed to download model');
        process.exit(1);
      }
    } else if (!modelName) {
      console.log('❌ No model available. Please download a model first.');
      console.log('   Run: ollama pull mistral-nemo:12b');
      process.exit(1);
    }
  }
  
  console.log(`\n✅ Using model: ${modelName}`);
  
  // Fetch courses
  console.log('\n🔍 Fetching courses from database...');
  
  let query = supabase
    .from('courses')
    .select(`
      id,
      title_en,
      title_es,
      description_en,
      description_es,
      difficulty,
      topics,
      course_modules (
        id,
        course_id,
        order_index,
        title_en,
        title_es,
        description_en,
        description_es,
        content_en,
        content_es,
        content_type,
        estimated_time,
        resources
      )
    `)
    .order('created_at', { ascending: true });
  
  if (specificCourseId) {
    query = query.eq('id', specificCourseId);
  }
  
  const { data: courses, error } = await query;
  
  if (error || !courses) {
    console.error('❌ Failed to fetch courses:', error);
    process.exit(1);
  }
  
  console.log(`✅ Found ${courses.length} course(s)\n`);
  
  if (courses.length === 0) {
    console.log('No courses to upgrade.');
    process.exit(0);
  }
  
  // Show summary
  let totalModules = 0;
  courses.forEach(c => {
    totalModules += c.course_modules?.length || 0;
    console.log(`   📚 ${c.title_en} (${c.course_modules?.length || 0} modules)`);
  });
  console.log(`\n   Total modules to process: ${totalModules}`);
  
  // Confirm
  if (!dryRun) {
    const confirm = await askQuestion('\n⚠️  This will modify your database. Continue? (yes/no): ');
    if (confirm.toLowerCase() !== 'yes') {
      console.log('Aborted.');
      process.exit(0);
    }
  }
  
  // Process courses
  const results: UpgradeResult[] = [];
  
  for (const course of courses) {
    const result = await upgradeCourse(course as Course, modelName!, dryRun);
    results.push(result);
  }
  
  // Final summary
  console.log('\n' + '═'.repeat(80));
  console.log('📊 UPGRADE COMPLETE - SUMMARY');
  console.log('═'.repeat(80));
  
  let totalUpgraded = 0;
  let totalFailed = 0;
  let totalImages = 0;
  let totalTime = 0;
  
  results.forEach(r => {
    console.log(`\n   📚 ${r.courseTitle}`);
    console.log(`      Modules processed: ${r.modulesProcessed}`);
    console.log(`      Modules upgraded: ${r.modulesUpgraded}`);
    console.log(`      Modules failed: ${r.modulesFailed}`);
    console.log(`      Images generated: ${r.imagesGenerated}`);
    console.log(`      Time: ${(r.totalTime / 1000 / 60).toFixed(1)} minutes`);
    
    if (r.errors.length > 0) {
      console.log(`      Errors:`);
      r.errors.forEach(e => console.log(`         ❌ ${e}`));
    }
    
    totalUpgraded += r.modulesUpgraded;
    totalFailed += r.modulesFailed;
    totalImages += r.imagesGenerated;
    totalTime += r.totalTime;
  });
  
  console.log('\n' + '─'.repeat(60));
  console.log(`   TOTALS:`);
  console.log(`   Courses processed: ${results.length}`);
  console.log(`   Modules upgraded: ${totalUpgraded}`);
  console.log(`   Modules failed: ${totalFailed}`);
  console.log(`   Images generated: ${totalImages}`);
  console.log(`   Total time: ${(totalTime / 1000 / 60).toFixed(1)} minutes`);
  console.log('═'.repeat(80) + '\n');
  
  if (dryRun) {
    console.log('🔸 This was a DRY RUN. No changes were saved.');
    console.log('   Run without --dry-run to apply changes.\n');
  }
}

// Run
main().catch(console.error);
