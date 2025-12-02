import { NextRequest, NextResponse } from 'next/server';
import { generateIllustrationWithCascade, DEFAULT_PROVIDER_ORDER, type ImageProviderName } from '@/lib/ai/image-cascade';
import { computeIllustrationChecksum } from '@/lib/ai/illustration-utils';
import { persistModuleIllustration } from '@/lib/db/module-illustrations';
import { generateFallbackImage } from '@/lib/utils/generate-fallback-image';
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

    const resolvedChecksum = checksum ?? computeIllustrationChecksum({
      moduleId,
      content,
      locale,
      style,
      visualStyle,
      slotId: slotId ?? null,
      anchor: anchor ?? null,
    });

    if (!cascadeResult.success || cascadeResult.images.length === 0) {
      console.error('[API/generate-illustration] All providers failed', cascadeResult.attempts);
      const fallback = buildFallbackIllustration({
        content,
        style,
        locale,
        metadata,
      });

      let persistedFallback = null;
      if (moduleId) {
        try {
          persistedFallback = await persistModuleIllustration({
            moduleId,
            locale,
            style,
            visualStyle,
            model: 'svg-fallback',
            provider: 'fallback',
            base64Data: fallback.base64Data,
            mimeType: fallback.mimeType,
            prompt: fallback.title,
            source: 'fallback',
            slotId: slotId ?? null,
            anchor: anchor ?? null,
            checksum: resolvedChecksum,
            metadata: {
              ...(metadata ?? {}),
              fallback: true,
              cascadeError: cascadeResult.error ?? 'All providers failed',
              attempts: cascadeResult.attempts,
            },
          });
        } catch (persistError) {
          console.error('[API/generate-illustration] Fallback persist failed:', persistError);
        }
      }

      return NextResponse.json({
        success: true,
        fallback: true,
        reason: cascadeResult.error ?? 'No providers were able to generate an image',
        image: {
          data: fallback.base64Data,
          mimeType: fallback.mimeType,
          url: persistedFallback?.image_url ?? fallback.dataUrl,
        },
        provider: 'fallback',
        model: 'svg-fallback',
        attempts: cascadeResult.attempts,
        thoughtProcess: null,
        checksum: resolvedChecksum,
        persisted: persistedFallback,
      });
    }

    const image = cascadeResult.images[0];

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

const FALLBACK_CATEGORY_MAP: Record<string, string> = {
  header: 'research',
  diagram: 'machine-learning',
  schema: 'machine-learning',
  infographic: 'tools',
  conceptual: 'models',
  textbook: 'models',
};

interface FallbackInput {
  content: string;
  style: string;
  locale: 'en' | 'es';
  metadata?: Record<string, unknown>;
}

function buildFallbackIllustration(input: FallbackInput) {
  const fallbackTitle = deriveFallbackTitle(input.content, input.metadata);
  const category = FALLBACK_CATEGORY_MAP[input.style] ?? 'default';
  const isHeader = input.style === 'header';
  const dataUrl = generateFallbackImage({
    title: fallbackTitle,
    category,
    width: isHeader ? 1920 : 1400,
    height: isHeader ? 1080 : 840,
  });

  const [prefix, base64Data] = dataUrl.split(',', 2);
  const mimeMatch = prefix.match(/^data:(.*?);base64$/);
  return {
    dataUrl,
    base64Data: base64Data ?? '',
    mimeType: mimeMatch?.[1] ?? 'image/svg+xml',
    title: fallbackTitle,
    category,
  };
}

function deriveFallbackTitle(content: string, metadata?: Record<string, unknown>) {
  const candidates = [
    typeof metadata?.summary === 'string' ? metadata.summary : null,
    typeof metadata?.reason === 'string' ? metadata.reason : null,
  ];

  const normalized = content
    .replace(/\s+/g, ' ')
    .trim();

  if (normalized) {
    const firstSentenceMatch = normalized.match(/[^.!?]+[.!?]?/);
    if (firstSentenceMatch) {
      candidates.push(firstSentenceMatch[0]);
    } else {
      candidates.push(normalized);
    }
  }

  const fallback = candidates.find((value) => typeof value === 'string' && value.trim().length > 0);
  const finalTitle = fallback ? fallback.trim() : 'AI-powered course illustration';
  return finalTitle.length > 160 ? `${finalTitle.slice(0, 157)}...` : finalTitle;
}
