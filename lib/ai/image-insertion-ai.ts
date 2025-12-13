/**
 * AI-Powered Image Insertion System
 * 
 * Uses LLM to analyze module content and determine:
 * 1. WHERE images should be inserted (specific positions in markdown)
 * 2. WHAT type of image (schema, diagram, infographic, conceptual)
 * 3. DETAILED prompts for Nano Banana Pro image generation
 * 
 * Model Strategy:
 * - DeepSeek R1 70B (local): Best for structural analysis and detailed prompts
 * - Claude/GPT-4o (online): Fallback for content analysis
 * - Qwen3 30B: Alternative for prompt generation
 */

import { z } from 'zod';
import { 
  selectModelForTask, 
  executeWithModel,
  cleanDeepSeekOutput
} from './model-strategy';
import { getGeminiImageClient, type ImageGenerationResult } from './gemini-image';

// ============================================================================
// SCHEMAS
// ============================================================================

/**
 * Schema for image insertion points identified by AI
 */
export const ImageInsertionPointSchema = z.object({
  id: z.string().describe('Unique identifier for this image'),
  insertAfterHeading: z.string().describe('The exact heading text after which to insert the image'),
  insertAfterParagraph: z.string().optional().describe('Optional: specific paragraph text to insert after'),
  imageType: z.enum([
    'schema',           // Technical diagram, flowchart, architecture
    'infographic',      // Data visualization, statistics, comparison
    'conceptual',       // Abstract concept illustration
    'process',          // Step-by-step process diagram
    'comparison',       // Side-by-side comparison
    'timeline',         // Historical or sequential timeline
    'mindmap',          // Concept relationships
    'example',          // Real-world example illustration
    'didyouknow',       // Fun fact illustration
    'exercise'          // Exercise/quiz illustration
  ]),
  purpose: z.string().describe('Educational purpose of this image'),
  contentToVisualize: z.string().describe('The specific content/concept this image should visualize'),
  nanoBananaPrompt: z.string().min(100).describe('Detailed prompt for Nano Banana Pro to generate the image'),
  priority: z.enum(['essential', 'recommended', 'optional']),
  estimatedComplexity: z.enum(['simple', 'moderate', 'complex']),
  altText: z.string().describe('Accessibility alt text for the image'),
  caption: z.string().describe('Caption to display under the image')
});

export type ImageInsertionPoint = z.infer<typeof ImageInsertionPointSchema>;

export const ImageAnalysisResultSchema = z.object({
  moduleTitle: z.string(),
  totalRecommendedImages: z.number(),
  insertionPoints: z.array(ImageInsertionPointSchema).min(1).max(10),
  overallStrategy: z.string().describe('Brief description of the image strategy for this module'),
  keyConceptsToVisualize: z.array(z.string()).min(3)
});

export type ImageAnalysisResult = z.infer<typeof ImageAnalysisResultSchema>;

// ============================================================================
// IMAGE ANALYSIS PROMPTS
// ============================================================================

const IMAGE_ANALYSIS_PROMPT_EN = `You are an expert educational content designer and visual learning specialist. 
Analyze the following module content and determine the optimal placement for educational images.

Your task:
1. Identify 4-8 strategic points where images would significantly enhance understanding
2. For each point, create a detailed prompt for AI image generation (Nano Banana Pro)
3. Consider the "textbook" style - images should enhance comprehension, not just decorate

Guidelines for image placement:
- After complex concept introductions (schema/diagram)
- After process descriptions (flowchart/process diagram)
- For "Did You Know?" sections (engaging illustration)
- Before/after case studies (infographic/example)
- For comparisons (side-by-side comparison visual)
- At section transitions (conceptual illustration)

Guidelines for Nano Banana Pro prompts:
- Be VERY specific and detailed (150+ words per prompt)
- Describe visual elements, layout, colors (prefer dark theme friendly)
- Include educational mascots where appropriate (curious cat, wise owl, person with lightbulb)
- Specify the educational purpose clearly
- Request clean, professional textbook-quality style
- Request annotations and labels where helpful

MODULE CONTENT:
---
{CONTENT}
---

Respond with ONLY valid JSON matching this schema:
{
  "moduleTitle": "string",
  "totalRecommendedImages": number,
  "overallStrategy": "string describing the image strategy",
  "keyConceptsToVisualize": ["concept1", "concept2", ...],
  "insertionPoints": [
    {
      "id": "img-1",
      "insertAfterHeading": "exact heading text",
      "insertAfterParagraph": "optional specific paragraph",
      "imageType": "schema|infographic|conceptual|process|comparison|timeline|mindmap|example|didyouknow|exercise",
      "purpose": "educational purpose",
      "contentToVisualize": "specific content to visualize",
      "nanoBananaPrompt": "DETAILED prompt for Nano Banana Pro (150+ words)...",
      "priority": "essential|recommended|optional",
      "estimatedComplexity": "simple|moderate|complex",
      "altText": "accessibility description",
      "caption": "figure caption"
    }
  ]
}`;

const IMAGE_ANALYSIS_PROMPT_ES = `Eres un experto en diseño de contenido educativo y especialista en aprendizaje visual.
Analiza el siguiente contenido del módulo y determina la ubicación óptima para imágenes educativas.

Tu tarea:
1. Identificar 4-8 puntos estratégicos donde las imágenes mejorarían significativamente la comprensión
2. Para cada punto, crear un prompt detallado para generación de imágenes AI (Nano Banana Pro)
3. Considera el estilo "libro de texto" - las imágenes deben mejorar la comprensión, no solo decorar

Guías para ubicación de imágenes:
- Después de introducciones de conceptos complejos (esquema/diagrama)
- Después de descripciones de procesos (diagrama de flujo/proceso)
- Para secciones "¿Sabías que?" (ilustración atractiva)
- Antes/después de casos de estudio (infografía/ejemplo)
- Para comparaciones (visual comparativa lado a lado)
- En transiciones de sección (ilustración conceptual)

Guías para prompts de Nano Banana Pro:
- Sé MUY específico y detallado (150+ palabras por prompt)
- Describe elementos visuales, diseño, colores (preferir tema oscuro)
- Incluye mascotas educativas donde sea apropiado (gato curioso, búho sabio, persona con bombilla)
- Especifica claramente el propósito educativo
- Solicita estilo de libro de texto profesional y limpio
- Solicita anotaciones y etiquetas donde sea útil

CONTENIDO DEL MÓDULO:
---
{CONTENT}
---

Responde SOLO con JSON válido siguiendo este esquema:
{
  "moduleTitle": "string",
  "totalRecommendedImages": number,
  "overallStrategy": "string describiendo la estrategia de imágenes",
  "keyConceptsToVisualize": ["concepto1", "concepto2", ...],
  "insertionPoints": [
    {
      "id": "img-1",
      "insertAfterHeading": "texto exacto del encabezado",
      "insertAfterParagraph": "párrafo específico opcional",
      "imageType": "schema|infographic|conceptual|process|comparison|timeline|mindmap|example|didyouknow|exercise",
      "purpose": "propósito educativo",
      "contentToVisualize": "contenido específico a visualizar",
      "nanoBananaPrompt": "Prompt DETALLADO para Nano Banana Pro (150+ palabras)...",
      "priority": "essential|recommended|optional",
      "estimatedComplexity": "simple|moderate|complex",
      "altText": "descripción de accesibilidad",
      "caption": "pie de figura"
    }
  ]
}`;

// ============================================================================
// IMAGE ANALYSIS & GENERATION
// ============================================================================

/**
 * Analyze module content and get image insertion recommendations
 */
export async function analyzeModuleForImages(
  moduleContent: string,
  moduleTitle: string,
  locale: 'en' | 'es' = 'en'
): Promise<ImageAnalysisResult> {
  const prompt = (locale === 'es' ? IMAGE_ANALYSIS_PROMPT_ES : IMAGE_ANALYSIS_PROMPT_EN)
    .replace('{CONTENT}', moduleContent);

  const systemPrompt = `You are an expert in educational content design. 
Analyze content and return ONLY valid JSON. No markdown, no commentary.
Focus on creating prompts that will generate high-quality, educational illustrations.`;

  console.log(`[ImageAnalysis] Analyzing "${moduleTitle}" for image insertion points...`);
  
  // Visual planning task: decide where images go and produce prompts (no Mermaid/code)
  const model = await selectModelForTask('visual_planning');
  const result = await executeWithModel(model, prompt, systemPrompt);
  
  // Clean DeepSeek output (remove thinking blocks)
  let cleanedContent = result.content;
  if (model.model.includes('deepseek')) {
    cleanedContent = cleanDeepSeekOutput(cleanedContent);
  }
  
  // Extract JSON
  const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No valid JSON found in response');
  }
  
  const parsed = JSON.parse(jsonMatch[0]);
  const validated = ImageAnalysisResultSchema.parse(parsed);
  
  console.log(`[ImageAnalysis] Found ${validated.insertionPoints.length} image insertion points`);
  console.log(`[ImageAnalysis] Strategy: ${validated.overallStrategy}`);
  
  return validated;
}

/**
 * Generate all images for a module based on analysis
 */
export async function generateModuleImages(
  analysis: ImageAnalysisResult,
  locale: 'en' | 'es' = 'en',
  maxImages: number = 6
): Promise<Map<string, ImageGenerationResult>> {
  const client = getGeminiImageClient();
  const results = new Map<string, ImageGenerationResult>();
  
  // Sort by priority: essential > recommended > optional
  const priorityOrder = { essential: 0, recommended: 1, optional: 2 };
  const sortedPoints = [...analysis.insertionPoints]
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
    .slice(0, maxImages);
  
  console.log(`[ImageGeneration] Generating ${sortedPoints.length} images for "${analysis.moduleTitle}"...`);
  
  for (const point of sortedPoints) {
    console.log(`[ImageGeneration] Generating "${point.id}" (${point.imageType})...`);
    
    try {
      // Enhance prompt based on image type
      const enhancedPrompt = buildEnhancedPrompt(point, locale);
      
      const result = await client.generateImage(enhancedPrompt, {
        model: 'gemini-3-pro-image-preview', // Use Nano Banana Pro for quality
        aspectRatio: getAspectRatioForType(point.imageType),
        imageSize: point.estimatedComplexity === 'complex' ? '4K' : '2K',
      });
      
      results.set(point.id, result);
      
      if (result.success) {
        console.log(`[ImageGeneration] ✅ Generated "${point.id}"`);
      } else {
        console.log(`[ImageGeneration] ⚠️ Failed "${point.id}": ${result.error}`);
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`[ImageGeneration] ❌ Error generating "${point.id}":`, error);
      results.set(point.id, {
        success: false,
        images: [],
        error: error instanceof Error ? error.message : String(error),
        model: 'gemini-3-pro-image-preview'
      });
    }
  }
  
  const successCount = Array.from(results.values()).filter(r => r.success).length;
  console.log(`[ImageGeneration] Completed: ${successCount}/${sortedPoints.length} images generated`);
  
  return results;
}

/**
 * Insert generated images into markdown content
 */
export function insertImagesIntoContent(
  content: string,
  analysis: ImageAnalysisResult,
  images: Map<string, ImageGenerationResult>,
  locale: 'en' | 'es' = 'en'
): string {
  let modifiedContent = content;
  
  // Process insertion points in reverse order (to preserve positions)
  const sortedPoints = [...analysis.insertionPoints]
    .filter(p => images.has(p.id) && images.get(p.id)?.success)
    .sort((a, b) => {
      const posA = content.indexOf(a.insertAfterHeading);
      const posB = content.indexOf(b.insertAfterHeading);
      return posB - posA; // Reverse order
    });
  
  for (const point of sortedPoints) {
    const imageResult = images.get(point.id);
    if (!imageResult?.success || imageResult.images.length === 0) continue;
    
    const image = imageResult.images[0];
    const imageMarkdown = buildImageMarkdown(point, image, locale);
    
    // Find insertion point
    const headingPattern = new RegExp(`(#{1,6}\\s*${escapeRegex(point.insertAfterHeading)}[^\\n]*\\n)`, 'i');
    const headingMatch = modifiedContent.match(headingPattern);
    
    if (headingMatch) {
      // Find the end of the next paragraph or section after the heading
      const headingPos = modifiedContent.indexOf(headingMatch[0]);
      const afterHeading = modifiedContent.substring(headingPos + headingMatch[0].length);
      
      // Find first paragraph break after heading
      const paragraphBreak = afterHeading.search(/\n\n/);
      
      if (paragraphBreak !== -1) {
        const insertPos = headingPos + headingMatch[0].length + paragraphBreak + 2;
        modifiedContent = 
          modifiedContent.substring(0, insertPos) +
          '\n' + imageMarkdown + '\n\n' +
          modifiedContent.substring(insertPos);
      } else {
        // Insert right after heading
        const insertPos = headingPos + headingMatch[0].length;
        modifiedContent = 
          modifiedContent.substring(0, insertPos) +
          '\n' + imageMarkdown + '\n\n' +
          modifiedContent.substring(insertPos);
      }
      
      console.log(`[ImageInsertion] Inserted "${point.id}" after "${point.insertAfterHeading}"`);
    } else {
      console.warn(`[ImageInsertion] Could not find heading: "${point.insertAfterHeading}"`);
    }
  }
  
  return modifiedContent;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function buildEnhancedPrompt(point: ImageInsertionPoint, locale: 'en' | 'es'): string {
  const styleGuide = locale === 'es'
    ? `Estilo: Ilustración de libro de texto premium, fondo oscuro (#0a0f1a), colores profesionales (azules, teales), líneas limpias, etiquetas claras, accesible para estudiantes.`
    : `Style: Premium textbook illustration, dark background (#0a0f1a), professional colors (blues, teals), clean lines, clear labels, accessible for students.`;
  
  const mascotHint = point.imageType === 'didyouknow'
    ? (locale === 'es' 
        ? 'Incluye un gato curioso con expresión de descubrimiento o una bombilla brillante.'
        : 'Include a curious cat with discovery expression or a glowing lightbulb.')
    : (locale === 'es'
        ? 'Puede incluir mascotas educativas sutiles si mejora la comprensión.'
        : 'May include subtle educational mascots if it enhances understanding.');
  
  return `${point.nanoBananaPrompt}

${styleGuide}
${mascotHint}

Technical requirements:
- High contrast for readability
- Clear visual hierarchy
- Professional textbook quality
- Dark theme compatible
- Educational purpose: ${point.purpose}`;
}

function getAspectRatioForType(imageType: string): '16:9' | '4:3' | '3:2' | '1:1' | '21:9' {
  switch (imageType) {
    case 'timeline':
    case 'process':
      return '21:9'; // Wide for horizontal flow
    case 'comparison':
      return '16:9';
    case 'schema':
    case 'mindmap':
      return '16:9';
    case 'infographic':
      return '3:2';
    case 'didyouknow':
    case 'exercise':
      return '4:3';
    case 'example':
    case 'conceptual':
    default:
      return '16:9';
  }
}

function buildImageMarkdown(
  point: ImageInsertionPoint,
  image: { base64Data: string; mimeType: string },
  locale: 'en' | 'es'
): string {
  const figureLabel = locale === 'es' ? 'Figura' : 'Figure';
  const figureNum = point.id.replace('img-', '');
  
  return `<figure class="module-illustration my-8">
  <img 
    src="data:${image.mimeType};base64,${image.base64Data}" 
    alt="${point.altText}"
    class="w-full max-w-4xl mx-auto rounded-xl shadow-lg"
    loading="lazy"
  />
  <figcaption class="text-center text-sm text-muted-foreground mt-3 italic">
    <strong>${figureLabel} ${figureNum}:</strong> ${point.caption}
  </figcaption>
</figure>`;
}

function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ============================================================================
// ONLINE MODE (for Vercel deployment)
// ============================================================================

/**
 * Check if configured cloud models are available
 */
export async function checkLocalModelsAvailable(): Promise<{
  available: boolean;
  models: string[];
  hasDeepSeek: boolean;
  hasQwen: boolean;
}> {
  try {
    const response = await fetch('http://localhost:11434/api/tags', {
      signal: AbortSignal.timeout(2000)
    });
    
    if (!response.ok) {
      return { available: false, models: [], hasDeepSeek: false, hasQwen: false };
    }
    
    const data = await response.json() as { models?: Array<{ name: string }> };
    const models = data.models?.map(m => m.name) || [];
    
    return {
      available: models.length > 0,
      models,
      hasDeepSeek: models.some(m => m.includes('deepseek')),
      hasQwen: models.some(m => m.includes('qwen'))
    };
  } catch {
    return { available: false, models: [], hasDeepSeek: false, hasQwen: false };
  }
}

/**
 * Get the best available model for image analysis
 * Falls back to cloud providers if local models unavailable
 */
export async function getBestModelForImageAnalysis(): Promise<{
  provider: 'local' | 'cloud';
  model: string;
  description: string;
}> {
  const localCheck = await checkLocalModelsAvailable();
  
  if (localCheck.hasDeepSeek) {
    return {
      provider: 'local',
      model: 'deepseek-r1:70b',
      description: 'DeepSeek R1 70B (local) - Best for structural analysis'
    };
  }
  
  if (localCheck.hasQwen) {
    return {
      provider: 'local',
      model: 'qwen3:30b',
      description: 'Qwen3 30B (local) - Good for content analysis'
    };
  }
  
  // Fall back to cloud providers
  if (process.env.ANTHROPIC_API_KEY) {
    return {
      provider: 'cloud',
      model: 'claude-3-5-sonnet-20241022',
      description: 'Claude 3.5 Sonnet (cloud) - Excellent analysis capabilities'
    };
  }
  
  if (process.env.OPENAI_API_KEY) {
    return {
      provider: 'cloud',
      model: 'gpt-4o',
      description: 'GPT-4o (cloud) - Strong general analysis'
    };
  }
  
  if (process.env.GEMINI_API_KEY) {
    return {
      provider: 'cloud',
      model: 'gemini-1.5-pro',
      description: 'Gemini 1.5 Pro (cloud) - Good multimodal understanding'
    };
  }
  
  if (process.env.GROQ_API_KEY) {
    return {
      provider: 'cloud',
      model: 'llama-3.3-70b-versatile',
      description: 'Llama 3.3 70B via Groq (cloud) - Fast inference'
    };
  }
  
  throw new Error('No models available. Please configure API keys or install local models.');
}
