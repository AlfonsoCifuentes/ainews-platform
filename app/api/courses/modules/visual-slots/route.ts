import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { replaceModuleVisualSlots, fetchModuleVisualSlots } from '@/lib/db/module-visual-slots';
import { VISUAL_DENSITIES, VISUAL_STYLES } from '@/lib/types/illustrations';
import type { ModuleVisualSlotType } from '@/lib/types/visual-slots';

const QuerySchema = z.object({
  moduleId: z.string().uuid(),
  locale: z.enum(['en', 'es']).default('en'),
  slotType: z.enum(['header', 'diagram', 'inline'] as const).optional(),
  limit: z.coerce.number().min(1).max(50).optional(),
});

const SlotSchema = z.object({
  slotType: z.enum(['header', 'diagram', 'inline'] as const),
  density: z.enum(VISUAL_DENSITIES).optional(),
  suggestedVisualStyle: z.enum(VISUAL_STYLES).optional(),
  blockIndex: z.number().int().min(0).nullable().optional(),
  heading: z.string().min(1).max(280).optional(),
  summary: z.string().min(1).max(2000).optional(),
  reason: z.string().min(1).max(2000).optional(),
  llmPayload: z.record(z.any()).optional(),
  provider: z.string().optional(),
  model: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
});

const BodySchema = z.object({
  moduleId: z.string().uuid(),
  locale: z.enum(['en', 'es']),
  slots: z.array(SlotSchema),
});

function shouldFallbackToEmpty(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  const message = ((error as { message?: string } | null)?.message || '').toLowerCase();

  // Gracefully degrade when the table is missing or RLS blocks access (seen in early deploys)
  return (
    code === '42P01' || // table does not exist
    code === '42501' || // insufficient_privilege
    message.includes('permission denied') ||
    message.includes('does not exist')
  );
}

export async function GET(request: NextRequest) {
  try {
    const params = QuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    let slots;

    try {
      slots = await fetchModuleVisualSlots({
        moduleId: params.moduleId,
        locale: params.locale,
        slotType: params.slotType as ModuleVisualSlotType | undefined,
        limit: params.limit,
      });
    } catch (fetchError) {
      console.warn('[API/visual-slots] GET fallback to empty', fetchError);
      if (!shouldFallbackToEmpty(fetchError)) {
        throw fetchError;
      }
      slots = [];
    }

    return NextResponse.json({ success: true, slots });
  } catch (error) {
    console.error('[API/visual-slots] GET error', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Invalid query', details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: 'Failed to fetch visual slots' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = BodySchema.parse(body);

    const slotsPayload = parsed.slots.map((slot) => ({
      moduleId: parsed.moduleId,
      locale: parsed.locale,
      slotType: slot.slotType,
      density: slot.density,
      suggestedVisualStyle: slot.suggestedVisualStyle,
      blockIndex: slot.blockIndex ?? null,
      heading: slot.heading ?? null,
      summary: slot.summary ?? null,
      reason: slot.reason ?? null,
      llmPayload: slot.llmPayload ?? null,
      provider: slot.provider ?? 'cascade',
      model: slot.model ?? null,
      confidence: slot.confidence ?? 0.75,
    }));

    const stored = await replaceModuleVisualSlots(parsed.moduleId, parsed.locale, slotsPayload);

    return NextResponse.json({ success: true, slots: stored });
  } catch (error) {
    console.error('[API/visual-slots] POST error', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Invalid payload', details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: 'Failed to save visual slots' }, { status: 500 });
  }
}
