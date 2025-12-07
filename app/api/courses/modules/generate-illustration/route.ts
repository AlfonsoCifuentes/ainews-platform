import { NextRequest, NextResponse } from 'next/server';
import { generateIllustrationWithCascade } from '@/lib/ai/image-cascade';
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
  promptOverride: z.string().min(10).max(4000).optional(),
  variants: z.array(z.enum(VISUAL_STYLES)).min(1).max(10).optional(),
  metadata: z.record(z.any()).optional(),
  providerOrder: z.array(z.enum(['huggingface', 'qwen', 'gemini'])).optional(),
});

type GenerateIllustrationRequest = z.infer<typeof RequestSchema>;

const DEFAULT_VARIANTS: GenerateIllustrationRequest['visualStyle'][] = ['photorealistic', 'anime', 'comic', 'pixel-art'];

function resolveVariantList(style: GenerateIllustrationRequest['style'], requested?: (typeof VISUAL_STYLES)[number][]) {
  const base = style === 'diagram' ? ['photorealistic'] : DEFAULT_VARIANTS;
  if (!requested || !requested.length) return base;
  const filtered = requested.filter((variant) => (style === 'diagram' ? variant === 'photorealistic' : true));
  const unique = Array.from(new Set(filtered.length ? filtered : base));
  return unique;
}

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

    const { content, locale, style, moduleId, visualStyle, slotId, anchor, checksum, promptOverride, metadata, variants, providerOrder } = validated.data;

    const variantList = resolveVariantList(style, variants);
    const order: ('huggingface' | 'qwen' | 'gemini')[] = providerOrder && providerOrder.length ? providerOrder : ['huggingface', 'qwen'];
    console.log(`[API/generate-illustration] Generating ${style} with variants: ${variantList.join(', ')} | providers: ${order.join(' > ')}`);

    const generatedResults: Array<{
      visualStyle: GenerateIllustrationRequest['visualStyle'];
      url: string | null;
      mimeType: string;
      model: string | null;
      provider: string | null;
      checksum: string;
      persisted: unknown;
      attempts: unknown;
      thoughtProcess: unknown;
      text?: string | undefined;
    }> = [];
    const errors: string[] = [];

    for (const variant of variantList) {
      const cascadeResult = await generateIllustrationWithCascade({
        moduleContent: content,
        locale,
        style,
        visualStyle: variant as GenerateIllustrationRequest['visualStyle'],
        providerOrder: order,
        promptOverride,
      });

      const variantChecksum = checksum ?? computeIllustrationChecksum({
        moduleId,
        content,
        locale,
        style,
        visualStyle: variant as GenerateIllustrationRequest['visualStyle'],
        slotId: slotId ?? null,
        anchor: anchor ?? null,
      });

      if (!cascadeResult.success || !cascadeResult.images.length) {
        errors.push(`variant ${variant}: ${cascadeResult.error ?? 'Gemini failed'}`);
        continue;
      }

      const image = cascadeResult.images[0];
      let persisted = null;

      if (moduleId) {
        persisted = await persistModuleIllustration({
          moduleId,
          locale,
          style,
          visualStyle: variant as GenerateIllustrationRequest['visualStyle'],
          model: cascadeResult.model,
          provider: cascadeResult.provider,
          base64Data: image.base64Data,
          mimeType: image.mimeType,
          prompt: cascadeResult.prompt.slice(0, 2000),
          source: 'api',
          slotId: slotId ?? null,
          anchor: anchor ?? null,
          checksum: variantChecksum,
          metadata: {
            ...(metadata ?? {}),
            cascadeAttempts: cascadeResult.attempts,
            locale,
            style,
            visualStyle: variant,
          },
        });
      }

      generatedResults.push({
        visualStyle: variant as GenerateIllustrationRequest['visualStyle'],
        url: persisted?.image_url ?? null,
        mimeType: image.mimeType,
        model: cascadeResult.model,
        provider: cascadeResult.provider ?? null,
        checksum: variantChecksum,
        persisted,
        attempts: cascadeResult.attempts,
        thoughtProcess: cascadeResult.thoughtProcess,
        text: image.text,
      });
    }

    if (!generatedResults.length) {
      return NextResponse.json(
        { success: false, error: errors.join(' | ') || 'Gemini image generation failed' },
        { status: 502 }
      );
    }

    const primary = generatedResults.find((entry) => entry.visualStyle === visualStyle) ?? generatedResults[0];

    return NextResponse.json({
      success: true,
      provider: primary.provider ?? 'gemini',
      model: primary.model,
      primary,
      variants: generatedResults,
    });
  } catch (error) {
    console.error('[API/generate-illustration] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
