/**
 * Gemini Image Generation Client
 * 
 * Supports:
 * - Nano Banana Pro (gemini-3-pro-image-preview): Advanced reasoning, 4K resolution, complex prompts
 * - Nano Banana (gemini-2.5-flash-image): Fast, efficient, high-volume generation
 * 
 * @see https://ai.google.dev/gemini-api/docs/image-generation
 */

import { z } from 'zod';

// ============================================================================
// Types & Schemas
// ============================================================================

export const ImageGenerationConfigSchema = z.object({
  model: z.enum(['gemini-3-pro-image-preview', 'gemini-2.5-flash-image']).default('gemini-3-pro-image-preview'),
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

// ============================================================================
// Gemini Image Client
// ============================================================================

export class GeminiImageClient {
  private apiKey: string;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || '';
    if (!this.apiKey) {
      console.warn('[GeminiImage] No GEMINI_API_KEY found. Image generation will fail.');
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
    style: 'schema' | 'infographic' | 'conceptual' | 'textbook' = 'textbook'
  ): Promise<ImageGenerationResult> {
    const stylePrompts = {
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
    };

    // Truncate content to fit in prompt while keeping key information
    const contentSummary = moduleContent.length > 2000 
      ? moduleContent.substring(0, 2000) + '...'
      : moduleContent;

    const prompt = `${stylePrompts[style][locale]}

Content to illustrate:
${contentSummary}

Important: The image should be self-explanatory and enhance understanding of the topic. Use visual metaphors and friendly characters to make complex concepts accessible.`;

    return this.generateImage(prompt, {
      model: 'gemini-3-pro-image-preview', // Use Nano Banana Pro for educational content
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
      model: 'gemini-2.5-flash-image', // Use faster model for simple illustrations
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
      model: 'gemini-2.5-flash-image',
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
  style: 'schema' | 'infographic' | 'conceptual' | 'textbook' = 'textbook'
): Promise<ImageGenerationResult> {
  const client = getGeminiImageClient();
  return client.generateEducationalIllustration(content, locale, style);
}
