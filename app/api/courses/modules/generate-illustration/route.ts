import { NextRequest, NextResponse } from 'next/server';
import { generateIllustrationWithCascade, DEFAULT_PROVIDER_ORDER, type ImageProviderName } from '@/lib/ai/image-cascade';
import { computeIllustrationChecksum } from '@/lib/ai/illustration-utils';
import { persistModuleIllustration } from '@/lib/db/module-illustrations';
import { VISUAL_STYLES } from '@/lib/types/illustrations';
import { z } from 'zod';

const RequestSchema = z.object({
  content: z.string().min(10, 'Content must be at least 10 characters'),
  locale: z.enum(['en', 'es']).default('en'),
  style: z.enum(['schema', 'infographic', 'conceptual', 'textbook', 'header', 'diagram']).default('textbook'),
  visualStyle: z.enum(VISUAL_STYLES).default('photorealistic'),
  moduleId: z.string().optional(),
  slotId: z.string().uuid().optional(),
  anchor: z.record(z.any()).optional(),
  checksum: z.string().optional(),
  providerOrder: z.array(z.enum(['moonshot', 'gemini', 'huggingface'] as const)).min(1).max(3).optional(),
  promptOverride: z.string().min(10).max(4000).optional(),
  metadata: z.record(z.any()).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = RequestSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid request', details: validated.error.errors },
        { status: 400 }
      );
    }

    const { content, locale, style, moduleId, visualStyle, slotId, anchor, checksum, providerOrder, promptOverride, metadata } = validated.data;

    console.log(`[API/generate-illustration] Generating ${style} illustration with cascade (${providerOrder?.join(' -> ') ?? DEFAULT_PROVIDER_ORDER.join(' -> ')})`);

    const cascadeResult = await generateIllustrationWithCascade({
      moduleContent: content,
      locale,
      style,
      visualStyle,
      providerOrder: providerOrder as ImageProviderName[] | undefined,
      promptOverride,
    });

    if (!cascadeResult.success || cascadeResult.images.length === 0) {
      console.error('[API/generate-illustration] All providers failed', cascadeResult.attempts);
      return NextResponse.json(
        {
          success: false,
          error: cascadeResult.error ?? 'No providers were able to generate an image',
          attempts: cascadeResult.attempts,
        },
        { status: 502 }
      );
    }

    const image = cascadeResult.images[0];
    const resolvedChecksum = checksum ?? computeIllustrationChecksum({
      moduleId,
      content,
      locale,
      style,
      visualStyle,
      slotId: slotId ?? null,
      anchor: anchor ?? null,
    });

    let persisted = null;
    if (moduleId) {
      try {
        persisted = await persistModuleIllustration({
          moduleId,
          locale,
          style,
          visualStyle,
          model: cascadeResult.model,
          provider: cascadeResult.provider,
          base64Data: image.base64Data,
          mimeType: image.mimeType,
          prompt: cascadeResult.prompt.slice(0, 2000),
          source: 'api',
          slotId: slotId ?? null,
          anchor: anchor ?? null,
          checksum: resolvedChecksum,
          metadata: {
            ...(metadata ?? {}),
            cascadeAttempts: cascadeResult.attempts,
            locale,
            style,
            visualStyle,
          },
        });
      } catch (persistError) {
        console.error('[API/generate-illustration] Persist failed:', persistError);
      }
    }

    return NextResponse.json({
      success: true,
      image: {
        data: image.base64Data,
        mimeType: image.mimeType,
        text: image.text,
        url: persisted?.image_url ?? null,
      },
      model: cascadeResult.model,
      provider: cascadeResult.provider,
      attempts: cascadeResult.attempts,
      thoughtProcess: cascadeResult.thoughtProcess,
      checksum: resolvedChecksum,
      persisted,
    });
  } catch (error) {
    console.error('[API/generate-illustration] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
