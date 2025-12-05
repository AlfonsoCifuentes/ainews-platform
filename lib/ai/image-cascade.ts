import { Buffer } from 'node:buffer';
import { getGeminiImageClient, buildEducationalIllustrationPrompt, type IllustrationStyle, type ImageGenerationResult } from './gemini-image';
import { GEMINI_MODELS } from './model-versions';
import type { VisualStyle } from '@/lib/types/illustrations';

export type ImageProviderName = 'gemini' | 'huggingface';

export interface IllustrationCascadeOptions {
  moduleContent: string;
  locale: 'en' | 'es';
  style: IllustrationStyle;
  visualStyle?: VisualStyle;
  providerOrder?: ImageProviderName[];
  promptOverride?: string;
}

export interface CascadeAttempt {
  provider: ImageProviderName;
  success: boolean;
  error?: string;
}

export interface IllustrationCascadeResult extends ImageGenerationResult {
  provider?: ImageProviderName;
  attempts: CascadeAttempt[];
  prompt: string;
}

// Default to Gemini only; fallback providers can be re-enabled via providerOrder when explicitly passed.
export const DEFAULT_PROVIDER_ORDER: ImageProviderName[] = ['gemini'];

export async function generateIllustrationWithCascade(
  options: IllustrationCascadeOptions
): Promise<IllustrationCascadeResult> {
  const prompt = options.promptOverride
    ? options.promptOverride
    : buildEducationalIllustrationPrompt(
        options.moduleContent,
        options.locale,
        options.style,
        options.visualStyle ?? 'photorealistic'
      );

  const providerOrder = options.providerOrder && options.providerOrder.length > 0
    ? options.providerOrder
    : DEFAULT_PROVIDER_ORDER;

  const attempts: CascadeAttempt[] = [];
  const dimensions = resolveDimensionsForStyle(options.style);

  for (const provider of providerOrder) {
    try {
      const result = provider === 'gemini'
        ? await generateWithGemini(prompt, dimensions)
        : await generateWithHuggingFace(prompt, dimensions);

      attempts.push({ provider, success: result.success, error: result.error });

      if (result.success) {
        return {
          ...result,
          provider,
          attempts,
          prompt,
        };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      attempts.push({ provider, success: false, error: message });
    }
  }

  return {
    success: false,
    images: [],
    model: GEMINI_MODELS.GEMINI_3_PRO_IMAGE,
    error: 'All image providers failed',
    attempts,
    prompt,
  };
}

async function generateWithGemini(
  prompt: string,
  dimensions: ReturnType<typeof resolveDimensionsForStyle>
): Promise<ImageGenerationResult> {
  const client = getGeminiImageClient();
  return client.generateImage(prompt, {
    model: GEMINI_MODELS.GEMINI_3_PRO_IMAGE,
    aspectRatio: dimensions.aspectRatio,
    imageSize: dimensions.height >= 1080 ? '2K' : '1K',
  });
}

async function generateWithHuggingFace(
  prompt: string,
  dimensions: ReturnType<typeof resolveDimensionsForStyle>
): Promise<ImageGenerationResult> {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  const model = process.env.HUGGINGFACE_IMAGE_MODEL;

  if (!apiKey) {
    return {
      success: false,
      images: [],
      model: 'huggingface-missing-key',
      error: 'HUGGINGFACE_API_KEY not configured',
    };
  }

  if (!model) {
    return {
      success: false,
      images: [],
      model: 'huggingface-missing-model',
      error: 'HUGGINGFACE_IMAGE_MODEL not configured (expected Flux2 GGUF repo id)',
    };
  }

  const endpoint = `https://router.huggingface.co/models/${model}`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          width: dimensions.width,
          height: dimensions.height,
          guidance_scale: 4.5,
          num_inference_steps: 28,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        images: [],
        model,
        error: `HuggingFace error ${response.status}: ${errorText.slice(0, 300)}`,
      };
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      const json = await response.json() as { error?: string };
      return {
        success: false,
        images: [],
        model,
        error: json.error || 'HuggingFace returned JSON payload without image data',
      };
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    return {
      success: true,
      images: [
        {
          base64Data: buffer.toString('base64'),
          mimeType: contentType || 'image/png',
        },
      ],
      model,
    };
  } catch (error) {
    return {
      success: false,
      images: [],
      model,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function resolveDimensionsForStyle(style: IllustrationStyle) {
  switch (style) {
    case 'header':
      return { width: 1920, height: 1080, aspectRatio: '16:9' as const };
    case 'diagram':
      return { width: 1600, height: 1200, aspectRatio: '4:3' as const };
    case 'infographic':
      return { width: 1536, height: 1024, aspectRatio: '3:2' as const };
    default:
      return { width: 1536, height: 864, aspectRatio: '16:9' as const };
  }
}
