import { NextRequest, NextResponse } from 'next/server';
import { generateIllustrationWithCascade } from '@/lib/ai/image-cascade';
import { computeIllustrationChecksum } from '@/lib/ai/illustration-utils';
import { fetchLatestModuleIllustration, persistModuleIllustration } from '@/lib/db/module-illustrations';
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
  negativePromptOverride: z.string().min(1).max(2000).optional(),
  variants: z.array(z.enum(VISUAL_STYLES)).min(1).max(10).optional(),
  metadata: z.record(z.any()).optional(),
  providerOrder: z.array(z.enum(['runware', 'gemini', 'huggingface', 'qwen'])).optional(),
});

type GenerateIllustrationRequest = z.infer<typeof RequestSchema>;

const DEFAULT_VARIANTS: GenerateIllustrationRequest['visualStyle'][] = ['photorealistic', 'anime'];

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

    const {
      content,
      locale: requestedLocale,
      style,
      moduleId,
      visualStyle,
      slotId,
      anchor,
      checksum,
      promptOverride,
      negativePromptOverride,
      metadata,
      variants,
      providerOrder: _providerOrder,
    } = validated.data;

    if (style === 'diagram') {
      return NextResponse.json(
        {
          success: false,
          code: 'DIAGRAMS_DISABLED',
          error: 'Diagram generation has been disabled for new content.',
        },
        { status: 200 }
      );
    }

    if (style === 'schema' || style === 'infographic') {
      return NextResponse.json(
        {
          success: false,
          code: 'TEXT_VISUALS_DISABLED',
          error: 'Text-bearing visuals (schemas/infographics) are disabled for now.',
        },
        { status: 200 }
      );
    }

    // Non-diagram images must be shared between locales so EN/ES show the same illustration.
    // Only text-bearing visuals remain locale-specific.
    const locale = 'en';
    const isTextBearing = false; // Diagrams/Schemas are disabled above, so this is always false

    if (moduleId) {
      const localesToTry: Array<'en' | 'es'> = isTextBearing ? [requestedLocale] : ['en', 'es'];
      const visualStylesToTry: Array<(typeof VISUAL_STYLES)[number] | undefined> = [
        visualStyle,
        ...(visualStyle !== 'photorealistic' ? (['photorealistic'] as const) : []),
        undefined,
      ];
      const styleFallbacks = style === 'header'
        ? ['header', 'textbook', 'conceptual']
        : style === 'textbook'
        ? ['textbook', 'conceptual']
        : style === 'conceptual'
        ? ['conceptual', 'textbook']
        : [style];

      const tryFetch = async (
        requestedStyle: string,
        requestedSlotId: string | null,
        requestedVisualStyle: (typeof VISUAL_STYLES)[number] | undefined
      ) => {
        for (const candidateLocale of localesToTry) {
          const found = await fetchLatestModuleIllustration({
            moduleId,
            locale: candidateLocale,
            style: requestedStyle,
            visualStyle: requestedVisualStyle,
            slotId: requestedSlotId ?? null,
          });
          if (found) return found;
        }
        return null;
      };

      const tryFetchWithFallbackVisualStyle = async (requestedStyle: string, requestedSlotId: string | null) => {
        for (const candidateVisualStyle of visualStylesToTry) {
          const found = await tryFetch(requestedStyle, requestedSlotId, candidateVisualStyle);
          if (found) return found;
        }
        return null;
      };

      let existing = null as Awaited<ReturnType<typeof fetchLatestModuleIllustration>>;
      for (const candidateStyle of styleFallbacks) {
        existing = await tryFetchWithFallbackVisualStyle(candidateStyle, slotId ?? null);
        if (existing) break;
      }

      if (!existing && slotId) {
        for (const candidateStyle of styleFallbacks) {
          existing = await tryFetchWithFallbackVisualStyle(candidateStyle, null);
          if (existing) break;
        }
      }

      if (existing) {
        const mimeType =
          typeof existing.metadata?.['mimeType'] === 'string'
            ? (existing.metadata?.['mimeType'] as string)
            : 'image/webp';

        return NextResponse.json({
          success: true,
          provider: existing.provider ?? 'runware',
          model: existing.model,
          primary: {
            visualStyle: existing.visual_style ?? visualStyle,
            url: existing.image_url,
            mimeType,
            model: existing.model,
            provider: existing.provider,
            checksum: existing.checksum ?? undefined,
            persisted: existing,
          },
          variants: [
            {
              visualStyle: existing.visual_style ?? visualStyle,
              url: existing.image_url,
              mimeType,
              model: existing.model,
              provider: existing.provider,
              checksum: existing.checksum ?? undefined,
              persisted: existing,
            },
          ],
          reused: true,
        });
      }
    }

    const variantList = resolveVariantList(style, variants);
    const order: NonNullable<GenerateIllustrationRequest['providerOrder']> = ['runware'];
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
        negativePromptOverride,
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
            requestedLocale,
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
        {
          success: false,
          code: 'NO_ILLUSTRATION_GENERATED',
          error: errors.join(' | ') || 'No illustration could be generated with the configured providers',
        },
        // Returning 200 prevents client-side network error logging (502/5xx) for an expected
        // failure mode (e.g., providers disabled/misconfigured). The UI already handles `success:false`.
        { status: 200 }
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
