import { Buffer } from 'node:buffer';
import { getGeminiImageClient, buildEducationalIllustrationPrompt, type IllustrationStyle, type ImageGenerationResult } from './gemini-image';
import { GEMINI_MODELS } from './model-versions';
import type { VisualStyle } from '@/lib/types/illustrations';

export type ImageProviderName = 'moonshot' | 'gemini' | 'huggingface';

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

export const DEFAULT_PROVIDER_ORDER: ImageProviderName[] = ['moonshot', 'gemini', 'huggingface'];
const DEFAULT_HF_MODEL = process.env.HUGGINGFACE_IMAGE_MODEL ?? 'black-forest-labs/flux-schnell';

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
      let result: ImageGenerationResult;

      if (provider === 'moonshot') {
        result = await generateWithMoonshot(prompt, dimensions);
      } else if (provider === 'gemini') {
        result = await generateWithGemini(prompt, dimensions);
      } else {
        result = await generateWithHuggingFace(prompt, dimensions);
      }

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
    model: 'unavailable',
    error: 'All image providers failed',
    attempts,
    prompt,
  };
}

async function generateWithMoonshot(
  prompt: string,
  dimensions: ReturnType<typeof resolveDimensionsForStyle>
): Promise<ImageGenerationResult> {
  const apiKey = process.env.MOONSHOT_API_KEY;
  if (!apiKey) {
    throw new Error('MOONSHOT_API_KEY not configured');
  }

  const endpoint = process.env.MOONSHOT_IMAGE_ENDPOINT ?? 'https://api.moonshot.cn/v1/images/generations';
  const payload = {
    prompt,
    model: process.env.MOONSHOT_IMAGE_MODEL ?? 'moonshot-image-v1',
    size: `${dimensions.width}x${dimensions.height}`,
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Moonshot error ${response.status}: ${errorText}`);
  }

  const data = await response.json() as {
    data?: Array<{ b64_json?: string; base64_data?: string; mime_type?: string }>;
    model?: string;
    error?: string;
  };

  if (data.error) {
    throw new Error(data.error);
  }

  const images = (data.data ?? [])
    .map((entry) => {
      const base64 = entry.b64_json || entry.base64_data;
      if (!base64) return null;
      return {
        base64Data: base64,
        mimeType: entry.mime_type ?? 'image/png',
      };
    })
    .filter(Boolean) as ImageGenerationResult['images'];

  return {
    success: images.length > 0,
    images,
    model: data.model ?? 'moonshot-image-v1',
    error: images.length === 0 ? 'Moonshot returned no images' : undefined,
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
  if (!apiKey) {
    throw new Error('HUGGINGFACE_API_KEY not configured');
  }

  const endpoint = `https://api-inference.huggingface.co/models/${DEFAULT_HF_MODEL}`;
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
        num_inference_steps: 35,
        guidance_scale: 4.5,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Hugging Face error ${response.status}: ${errorText}`);
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    const json = await response.json() as { error?: string };
    throw new Error(json.error || 'Hugging Face returned JSON payload without image data');
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return {
    success: true,
    images: [
      {
        base64Data: buffer.toString('base64'),
        mimeType: contentType || 'image/png',
      },
    ],
    model: DEFAULT_HF_MODEL,
  };
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
