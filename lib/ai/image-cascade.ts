import { Buffer } from 'node:buffer';
import { getGeminiImageClient, buildEducationalIllustrationPrompt, type IllustrationStyle, type ImageGenerationResult } from './gemini-image';
import { GEMINI_MODELS, HUGGINGFACE_IMAGE_MODELS, QWEN_IMAGE_MODELS, RUNWARE_IMAGE_MODELS } from './model-versions';
import type { VisualStyle } from '@/lib/types/illustrations';

export type ImageProviderName = 'runware' | 'gemini' | 'huggingface' | 'qwen';

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

// Prefer Runware as the cheap default, then Gemini as precision fallback.
export const DEFAULT_PROVIDER_ORDER: ImageProviderName[] = ['runware', 'gemini'];

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

  const providerOrder: ImageProviderName[] = options.providerOrder && options.providerOrder.length > 0
    ? options.providerOrder
    : options.style === 'diagram' || options.style === 'schema'
      ? ['gemini']
      : DEFAULT_PROVIDER_ORDER;

  const attempts: CascadeAttempt[] = [];
  const dimensions = resolveDimensionsForStyle(options.style);

  for (const provider of providerOrder) {
    try {
      const result = provider === 'gemini'
        ? await generateWithGemini(prompt, dimensions)
        : provider === 'runware'
        ? await generateWithRunware(prompt, dimensions)
        : provider === 'qwen'
        ? await generateWithQwen(prompt, dimensions)
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
    model: HUGGINGFACE_IMAGE_MODELS.FLUX_1_DEV_GGUF,
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

async function generateWithRunware(
  prompt: string,
  dimensions: ReturnType<typeof resolveDimensionsForStyle>
): Promise<ImageGenerationResult> {
  const apiKey = process.env.RUNWARE_API_KEY;
  const model = process.env.RUNWARE_IMAGE_MODEL || RUNWARE_IMAGE_MODELS.RUNWARE_GEN_97;

  if (!apiKey) {
    return {
      success: false,
      images: [],
      model,
      error: 'RUNWARE_API_KEY not configured',
    };
  }

  try {
    const response = await fetch('https://api.runware.ai/v1/runs', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        input: {
          prompt,
          num_images: 1,
          width: dimensions.width,
          height: dimensions.height,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        images: [],
        model,
        error: `Runware error ${response.status}: ${errorText.slice(0, 300)}`,
      };
    }

    const data = (await response.json()) as Record<string, unknown>;
    const output = data.output as Record<string, unknown> | undefined;
    const nestedOutput = (data.data as Record<string, unknown> | undefined)?.output as
      | Record<string, unknown>
      | undefined;
    const resultOutput = data.result as Record<string, unknown> | undefined;
    const imagesRaw =
      (output?.images as unknown) ||
      (nestedOutput?.images as unknown) ||
      (data.images as unknown) ||
      (resultOutput?.images as unknown) ||
      [];
    const images = Array.isArray(imagesRaw) ? imagesRaw : [];

    const first = Array.isArray(images) ? images[0] : null;
    const base64 = first?.image_base64 || first?.base64 || first?.b64_json || first?.data;
    const url = first?.url || first?.image_url;

    if (!base64 && !url) {
      return {
        success: false,
        images: [],
        model,
        error: 'Runware returned no image payload',
      };
    }

    if (url && !base64) {
      const imgResponse = await fetch(url);
      const buffer = Buffer.from(await imgResponse.arrayBuffer());
      return {
        success: true,
        images: [
          {
            base64Data: buffer.toString('base64'),
            mimeType: imgResponse.headers.get('content-type') || 'image/png',
          },
        ],
        model,
      };
    }

    return {
      success: true,
      images: [
        {
          base64Data: base64 as string,
          mimeType: 'image/png',
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

async function generateWithHuggingFace(
  prompt: string,
  dimensions: ReturnType<typeof resolveDimensionsForStyle>
): Promise<ImageGenerationResult> {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  const configuredModel = process.env.HUGGINGFACE_IMAGE_MODEL;
  const model = HUGGINGFACE_IMAGE_MODELS.FLUX_1_DEV_GGUF;

  if (configuredModel && configuredModel !== model) {
    console.warn(`[ImageCascade] Forcing Flux model over configured ${configuredModel}`);
  }

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

async function generateWithQwen(
  prompt: string,
  dimensions: ReturnType<typeof resolveDimensionsForStyle>
): Promise<ImageGenerationResult> {
  const apiKey = process.env.QWEN_IMAGE_API_KEY;
  const model = process.env.QWEN_IMAGE_MODEL || QWEN_IMAGE_MODELS.QWEN_IMAGE_V1;

  if (!apiKey) {
    return {
      success: false,
      images: [],
      model,
      error: 'QWEN_IMAGE_API_KEY not configured',
    };
  }

  try {
    const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/image-generation/text2image', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        input: { prompt },
        parameters: {
          size: `${dimensions.width}*${dimensions.height}`,
          n: 1,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        images: [],
        model,
        error: `Qwen-Image error ${response.status}: ${errorText.slice(0, 300)}`,
      };
    }

    const data = await response.json() as {
      output?: {
        results?: Array<{ image_base64?: string; url?: string; mime_type?: string }>;
      };
      code?: string;
      message?: string;
    };

    const first = data.output?.results?.[0];
    const base64 = first?.image_base64;
    const url = first?.url;

    if (!base64 && !url) {
      return {
        success: false,
        images: [],
        model,
        error: data.message || 'Qwen-Image returned no image',
      };
    }

    if (url && !base64) {
      // If only URL returned, fetch and convert to base64 to keep interface consistent
      const imgResponse = await fetch(url);
      const buffer = Buffer.from(await imgResponse.arrayBuffer());
      return {
        success: true,
        images: [
          {
            base64Data: buffer.toString('base64'),
            mimeType: imgResponse.headers.get('content-type') || 'image/png',
          },
        ],
        model,
      };
    }

    return {
      success: true,
      images: [
        {
          base64Data: base64 as string,
          mimeType: first?.mime_type || 'image/png',
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
  // Lower resolutions to reduce storage and cost
  switch (style) {
    case 'header':
      return { width: 1280, height: 720, aspectRatio: '16:9' as const };
    case 'diagram':
      return { width: 1200, height: 900, aspectRatio: '4:3' as const };
    case 'infographic':
      return { width: 1024, height: 683, aspectRatio: '3:2' as const };
    case 'schema':
      return { width: 1200, height: 900, aspectRatio: '4:3' as const };
    default:
      return { width: 1024, height: 576, aspectRatio: '16:9' as const };
  }
}
