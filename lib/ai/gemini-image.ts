/**
 * Gemini Image Generation Client
 * 
 * ⚠️ USING LATEST GEMINI MODELS (2025):
 * - Nano Banana Pro (gemini-3-pro-image-preview): Most intelligent, 4K resolution, complex prompts
 * - Nano Banana (gemini-2.5-flash-image): Fast, efficient, high-volume generation
 * 
 * 📅 LAST UPDATED: 2025-01-XX
 * 
 * @see https://ai.google.dev/gemini-api/docs/image-generation
 */

import { z } from 'zod';
import { GEMINI_MODELS } from './model-versions';
import type { VisualStyle } from '@/lib/types/illustrations';

// ============================================================================
// Types & Schemas
// ============================================================================

export type IllustrationStyle = 'schema' | 'infographic' | 'conceptual' | 'textbook' | 'header' | 'diagram';

export const ImageGenerationConfigSchema = z.object({
  model: z.enum([
    'gemini-3-pro-image-preview',  // Nano Banana Pro - Most intelligent
    'gemini-2.5-flash-image',      // Nano Banana - Fast
  ]).default('gemini-3-pro-image-preview'),
  aspectRatio: z.enum(['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9']).default('16:9'),
  imageSize: z.enum(['1K', '2K', '4K']).optional(), // Only for gemini-3-pro-image-preview
  responseModalities: z.array(z.enum(['TEXT', 'IMAGE'])).default(['TEXT', 'IMAGE']),
});

export type ImageGenerationConfig = z.infer<typeof ImageGenerationConfigSchema>;

export interface GeneratedImage {
  base64Data: string;
  mimeType: string;
  text?: string;
}

export interface ImageGenerationResult {
  success: boolean;
  images: GeneratedImage[];
  error?: string;
  model: string;
  thoughtProcess?: string;
}

const STYLE_PROMPTS: Record<IllustrationStyle, Record<'en' | 'es', string>> = {
  schema: {
    en: `Create a clear, educational diagram/schema explaining the following content. Use visual metaphors like lightbulbs for ideas, question marks for concepts to explore, arrows for processes, and friendly mascot characters (like a curious cat or wise owl) to make it engaging. Style: clean, modern textbook illustration with dark background that works well on dark themes. Include labeled sections and visual hierarchy.`,
    es: `Crea un diagrama/esquema educativo claro explicando el siguiente contenido. Usa metáforas visuales como bombillas para ideas, signos de interrogación para conceptos a explorar, flechas para procesos, y personajes mascota amigables (como un gato curioso o un búho sabio) para hacerlo atractivo. Estilo: ilustración de libro de texto limpia y moderna con fondo oscuro que funcione bien en temas oscuros. Incluye secciones etiquetadas y jerarquía visual.`,
  },
  infographic: {
    en: `Design a modern infographic visualizing this educational content. Include icons, charts, timelines where relevant, and visual metaphors. A person with a lightbulb above their head for "aha moments", a cat with a question mark for curious exploration sections. Style: dark theme friendly, professional yet engaging like a premium textbook.`,
    es: `Diseña una infografía moderna visualizando este contenido educativo. Incluye iconos, gráficos, líneas de tiempo donde sea relevante, y metáforas visuales. Una persona con una bombilla sobre su cabeza para "momentos eureka", un gato con un signo de interrogación para secciones de exploración curiosa. Estilo: amigable con tema oscuro, profesional pero atractivo como un libro de texto premium.`,
  },
  conceptual: {
    en: `Create a conceptual illustration that captures the essence of this educational topic. Use abstract visual metaphors, flowing connections between ideas, and subtle educational mascots (owl for wisdom, lightbulb for innovation). Dark background, modern minimalist style with pops of blue accent color.`,
    es: `Crea una ilustración conceptual que capture la esencia de este tema educativo. Usa metáforas visuales abstractas, conexiones fluidas entre ideas, y mascotas educativas sutiles (búho para sabiduría, bombilla para innovación). Fondo oscuro, estilo minimalista moderno con toques de color azul como acento.`,
  },
  textbook: {
    en: `Generate a premium textbook-quality illustration for this content. Combine the rigor of an academic publication with the visual appeal of a modern educational book for young adults. Include: clear visual hierarchy, helpful annotations, friendly educational mascots (curious cat with question marks, person with lightbulb for ideas), process diagrams where applicable. Style: Dark theme compatible, professional blues and teals, clean lines.`,
    es: `Genera una ilustración de calidad de libro de texto premium para este contenido. Combina el rigor de una publicación académica con el atractivo visual de un libro educativo moderno para jóvenes adultos. Incluye: jerarquía visual clara, anotaciones útiles, mascotas educativas amigables (gato curioso con signos de interrogación, persona con bombilla para ideas), diagramas de proceso donde aplique. Estilo: Compatible con tema oscuro, azules y teales profesionales, líneas limpias.`,
  },
  header: {
    en: `Create a stunning cinematic header image for a course chapter. The image should be photorealistic or high-quality digital art, showing the main subject in action. For example, if it's about tattooing, show hands doing professional tattoo work with a tattoo machine on skin. If it's about programming, show elegant code visualizations. If it's about cooking, show a chef's hands preparing food. Style: Cinematic lighting, dramatic composition, professional photography style, dark moody tones with blue/teal accents. NO text or labels in the image. Focus on the visual impact and emotion.`,
    es: `Crea una impresionante imagen de encabezado cinematográfica para un capítulo de curso. La imagen debe ser fotorrealista o arte digital de alta calidad, mostrando el tema principal en acción. Por ejemplo, si es sobre tatuaje, mostrar manos haciendo trabajo profesional de tatuaje con una máquina de tatuar sobre piel. Si es sobre programación, mostrar visualizaciones elegantes de código. Si es sobre cocina, mostrar manos de un chef preparando comida. Estilo: Iluminación cinematográfica, composición dramática, estilo de fotografía profesional, tonos oscuros y dramáticos con acentos azul/teal. SIN texto ni etiquetas en la imagen. Enfoque en el impacto visual y la emoción.`,
  },
  diagram: {
    en: `Create a clear technical diagram explaining this concept. Use flowchart elements, boxes with labels, arrows showing relationships and processes. Style: Clean white or light background for maximum clarity, professional technical drawing style like engineering or architecture diagrams. Include legends if needed.`,
    es: `Crea un diagrama técnico claro explicando este concepto. Usa elementos de diagrama de flujo, cajas con etiquetas, flechas mostrando relaciones y procesos. Estilo: Fondo blanco o claro para máxima claridad, estilo de dibujo técnico profesional como diagramas de ingeniería o arquitectura. Incluye leyendas si es necesario.`,
  },
};

const VISUAL_STYLE_PROMPTS: Record<VisualStyle, Record<'en' | 'es', string>> = {
  photorealistic: {
    en: 'Render this scene with cinematic photorealism, dramatic lighting, tactile textures, and subtle blue/teal accents that match the platform art direction.',
    es: 'Renderiza la escena con fotorrealismo cinematográfico, iluminación dramática, texturas táctiles y sutiles acentos azul/teal que coincidan con la dirección de arte de la plataforma.'
  },
  anime: {
    en: 'Adopt a premium anime style inspired by modern feature films: clean line art, expressive characters, cel-shaded lighting, dynamic composition, and glowing kinetic effects.',
    es: 'Adopta un estilo anime premium inspirado en largometrajes modernos: líneas limpias, personajes expresivos, iluminación cel shading, composición dinámica y efectos cinéticos luminosos.'
  }
};

export function buildEducationalIllustrationPrompt(
  moduleContent: string,
  locale: 'en' | 'es',
  style: IllustrationStyle,
  visualStyle: VisualStyle
): string {
  const contentSummary = moduleContent.length > 2000
    ? `${moduleContent.substring(0, 2000)}...`
    : moduleContent;

  const stylePrompt = STYLE_PROMPTS[style]?.[locale] ?? STYLE_PROMPTS.textbook[locale];
  const visualPrompt = VISUAL_STYLE_PROMPTS[visualStyle]?.[locale] ?? VISUAL_STYLE_PROMPTS.photorealistic[locale];

  if (style === 'header') {
    return `${stylePrompt}

Course/Chapter subject: ${contentSummary}

Visual aesthetic: ${visualPrompt}

Generate a visually striking image that immediately communicates what this chapter is about.`;
  }

  return `${stylePrompt}

Content to illustrate:
${contentSummary}

Important: The image should be self-explanatory and enhance understanding of the topic. Use visual metaphors and friendly characters to make complex concepts accessible.

Visual aesthetic: ${visualPrompt}`;
}

// ============================================================================
// Gemini Image Client
// ============================================================================

export class GeminiImageClient {
  private apiKey: string;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  constructor(apiKey?: string) {
    // Allow a secondary Nano Banana key to bypass quota exhaustion on the primary Gemini key
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || process.env.NANOBANANA_API_KEY || '';
    if (!this.apiKey) {
      console.warn('[GeminiImage] No GEMINI_API_KEY or NANOBANANA_API_KEY found. Image generation will fail.');
    }
  }

  /**
   * Generate images from a text prompt using Nano Banana Pro or Nano Banana
   */
  async generateImage(
    prompt: string,
    config: Partial<ImageGenerationConfig> = {}
  ): Promise<ImageGenerationResult> {
    const validatedConfig = ImageGenerationConfigSchema.parse(config);
    const model = validatedConfig.model;

    if (!this.apiKey) {
      return {
        success: false,
        images: [],
        error: 'GEMINI_API_KEY not configured',
        model,
      };
    }

    try {
      const endpoint = `${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`;

      // Build request body
      const requestBody: Record<string, unknown> = {
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          responseModalities: validatedConfig.responseModalities,
        },
      };

      // Add image configuration
      const imageConfig: Record<string, string> = {
        aspectRatio: validatedConfig.aspectRatio,
      };

      // Only Nano Banana Pro (gemini-3-pro-image-preview) supports 2K/4K resolution
      if (model === 'gemini-3-pro-image-preview' && validatedConfig.imageSize) {
        imageConfig.imageSize = validatedConfig.imageSize;
      }

      (requestBody.generationConfig as Record<string, unknown>).imageConfig = imageConfig;

      console.log(`[GeminiImage] Generating with ${model}...`);
      console.log(`[GeminiImage] Prompt: ${prompt.substring(0, 100)}...`);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[GeminiImage] API Error: ${response.status}`, errorText);
        return {
          success: false,
          images: [],
          error: `API Error ${response.status}: ${errorText.substring(0, 200)}`,
          model,
        };
      }

      const data = await response.json();
      return this.parseResponse(data, model);
    } catch (error) {
      console.error('[GeminiImage] Generation failed:', error);
      return {
        success: false,
        images: [],
        error: error instanceof Error ? error.message : String(error),
        model,
      };
    }
  }

  /**
   * Generate educational illustration for course content
   */
  async generateEducationalIllustration(
    moduleContent: string,
    locale: 'en' | 'es' = 'en',
    style: IllustrationStyle = 'textbook',
    visualStyle: VisualStyle = 'photorealistic'
  ): Promise<ImageGenerationResult> {
    const prompt = buildEducationalIllustrationPrompt(moduleContent, locale, style, visualStyle);

    return this.generateImage(prompt, {
      model: GEMINI_MODELS.GEMINI_3_PRO_IMAGE, // Use Nano Banana Pro for educational content
      aspectRatio: '16:9',
      imageSize: '2K',
    });
  }

  /**
   * Generate a "Did You Know?" style illustration
   */
  async generateDidYouKnowIllustration(
    fact: string,
    locale: 'en' | 'es' = 'en'
  ): Promise<ImageGenerationResult> {
    const prompt = locale === 'en'
      ? `Create a fun, engaging "Did You Know?" style illustration for this fact: "${fact}". Include a curious cartoon character (like a cat or owl) with an excited expression, lightbulb or spark effects to indicate discovery, and visual representation of the fact itself. Style: Modern, dark-theme friendly, educational but playful, similar to premium textbook sidebars.`
      : `Crea una ilustración estilo "¿Sabías que?" divertida y atractiva para este dato: "${fact}". Incluye un personaje de dibujos animados curioso (como un gato o búho) con expresión emocionada, efectos de bombilla o chispas para indicar descubrimiento, y representación visual del dato en sí. Estilo: Moderno, amigable con tema oscuro, educativo pero juguetón, similar a los recuadros de libros de texto premium.`;

    return this.generateImage(prompt, {
      model: GEMINI_MODELS.GEMINI_2_5_FLASH_IMAGE, // Use faster model for simple illustrations
      aspectRatio: '4:3',
    });
  }

  /**
   * Generate exercise/quiz illustration
   */
  async generateExerciseIllustration(
    exerciseDescription: string,
    locale: 'en' | 'es' = 'en'
  ): Promise<ImageGenerationResult> {
    const prompt = locale === 'en'
      ? `Create an illustration for an educational exercise/quiz: "${exerciseDescription}". Include a thinking character (person with hand on chin, question marks floating), a pencil or notepad icon, and visual hints about the exercise topic. Style: Clean, modern textbook illustration, dark theme compatible, encouraging and non-intimidating.`
      : `Crea una ilustración para un ejercicio/cuestionario educativo: "${exerciseDescription}". Incluye un personaje pensativo (persona con mano en la barbilla, signos de interrogación flotando), un icono de lápiz o libreta, y pistas visuales sobre el tema del ejercicio. Estilo: Ilustración de libro de texto limpia y moderna, compatible con tema oscuro, alentadora y no intimidante.`;

    return this.generateImage(prompt, {
      model: GEMINI_MODELS.GEMINI_2_5_FLASH_IMAGE, // Use faster model for exercise illustrations
      aspectRatio: '3:2',
    });
  }

  /**
   * Parse Gemini API response
   */
  private parseResponse(data: unknown, model: string): ImageGenerationResult {
    const images: GeneratedImage[] = [];
    let thoughtProcess: string | undefined;
    let textContent: string | undefined;

    try {
      const response = data as {
        candidates?: Array<{
          content?: {
            parts?: Array<{
              text?: string;
              inlineData?: {
                mimeType: string;
                data: string;
              };
              thought?: boolean;
            }>;
          };
        }>;
      };

      const parts = response.candidates?.[0]?.content?.parts || [];

      for (const part of parts) {
        // Collect thought process (Nano Banana Pro feature)
        if (part.thought && part.text) {
          thoughtProcess = (thoughtProcess || '') + part.text + '\n';
          continue;
        }

        // Collect text
        if (part.text && !part.thought) {
          textContent = part.text;
        }

        // Collect images
        if (part.inlineData) {
          images.push({
            base64Data: part.inlineData.data,
            mimeType: part.inlineData.mimeType,
            text: textContent,
          });
        }
      }

      return {
        success: images.length > 0,
        images,
        model,
        thoughtProcess,
        error: images.length === 0 ? 'No images generated' : undefined,
      };
    } catch (error) {
      return {
        success: false,
        images: [],
        model,
        error: `Failed to parse response: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
}

// ============================================================================
// Singleton & Factory
// ============================================================================

let geminiImageClient: GeminiImageClient | null = null;

export function getGeminiImageClient(): GeminiImageClient {
  if (!geminiImageClient) {
    geminiImageClient = new GeminiImageClient();
  }
  return geminiImageClient;
}

/**
 * Quick helper to generate an educational illustration
 */
export async function generateEducationalImage(
  content: string,
  locale: 'en' | 'es' = 'en',
  style: 'schema' | 'infographic' | 'conceptual' | 'textbook' = 'textbook',
  visualStyle: VisualStyle = 'photorealistic'
): Promise<ImageGenerationResult> {
  const client = getGeminiImageClient();
  return client.generateEducationalIllustration(content, locale, style, visualStyle);
}
