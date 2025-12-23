import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { fetchLatestModuleIllustration } from '@/lib/db/module-illustrations';
import { getSupabaseServerClient } from '@/lib/db/supabase';
import { VISUAL_STYLES, type VisualStyle } from '@/lib/types/illustrations';

const QuerySchema = z.object({
  moduleId: z.string().uuid(),
  locale: z.enum(['en', 'es']).default('en'),
  style: z.string().default('textbook'),
  visualStyle: z.enum(VISUAL_STYLES).default('photorealistic'),
  slotId: z.string().uuid().optional(),
});

export async function GET(req: NextRequest) {
  const parsed = QuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Invalid query', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { moduleId, locale, style, visualStyle, slotId } = parsed.data;

  try {
    const isTextBearing = style === 'diagram' || style === 'schema' || style === 'infographic';
    const db = getSupabaseServerClient();

    // Non-diagram illustrations must be shared across locales (same image in EN/ES).
    // Diagrams can contain text and must remain locale-specific.
    const localesToTry: Array<'en' | 'es'> = isTextBearing ? [locale] : ['en', 'es'];

    const visualStylesToTry: Array<VisualStyle | undefined> = [
      visualStyle,
      ...(visualStyle !== 'photorealistic' ? (['photorealistic'] as const) : []),
      undefined,
    ];

    const tryFetch = async (
      requestedStyle: string,
      requestedSlotId: string | null,
      requestedVisualStyle: VisualStyle | undefined
    ) => {
      for (const candidateLocale of localesToTry) {
        const found = await fetchLatestModuleIllustration({
          moduleId,
          locale: candidateLocale,
          style: requestedStyle,
          visualStyle: requestedVisualStyle,
          slotId: requestedSlotId,
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

    const resolveSlotOrder = async (): Promise<number | null> => {
      if (!slotId) return null;
      try {
        const { data, error } = await db
          .from('module_visual_slots')
          .select('id, slot_type, block_index, created_at')
          .eq('module_id', moduleId)
          .eq('locale', locale);

        if (error || !Array.isArray(data) || data.length === 0) return null;
        const slot = data.find((row) => row.id === slotId);
        if (!slot) return null;

        const sameType = data.filter((row) => row.slot_type === slot.slot_type);
        sameType.sort((a, b) => {
          const aIndex = typeof a.block_index === 'number' ? a.block_index : Number.POSITIVE_INFINITY;
          const bIndex = typeof b.block_index === 'number' ? b.block_index : Number.POSITIVE_INFINITY;
          if (aIndex !== bIndex) return aIndex - bIndex;
          const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
          const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
          return aTime - bTime;
        });

        const index = sameType.findIndex((row) => row.id === slotId);
        return index >= 0 ? index : null;
      } catch (error) {
        console.warn('[API/module-illustrations] Slot order lookup failed', error);
        return null;
      }
    };

    const tryFetchBySlotOrder = async (requestedStyle: string, slotOrder: number | null) => {
      if (slotOrder === null || isTextBearing) return null;

      for (const candidateVisualStyle of visualStylesToTry) {
        for (const candidateLocale of localesToTry) {
          let query = db
            .from('module_illustrations')
            .select('*')
            .eq('module_id', moduleId)
            .eq('locale', candidateLocale)
            .eq('style', requestedStyle);

          if (candidateVisualStyle) {
            query = query.eq('visual_style', candidateVisualStyle);
          }

          query = query.eq('metadata->>slotOrder', String(slotOrder));

          const { data, error } = await query.order('created_at', { ascending: false }).limit(1).maybeSingle();
          if (error) {
            console.warn('[API/module-illustrations] Slot order fetch failed', error);
            continue;
          }
          if (data) return data;
        }
      }

      return null;
    };

    const slotOrder = await resolveSlotOrder();
    let record = slotOrder !== null ? await tryFetchBySlotOrder(style, slotOrder) : null;

    // Try exact style first.
    if (!record) {
      record = await tryFetchWithFallbackVisualStyle(style, slotId ?? null);
    }

    // If a slot-specific illustration doesn't exist yet, fall back to the module-level illustration.
    // This is important for eagerly generated images (which are stored without a slot_id).
    if (!record && slotId) {
      record = await tryFetchWithFallbackVisualStyle(style, null);
    }
    
    // If no result and style is 'header', try 'textbook' as fallback
    if (!record && style === 'header') {
      record = await tryFetchWithFallbackVisualStyle('textbook', null); // textbook illustrations don't have slots
      if (!record) {
        // Prefer a module-level conceptual illustration when present.
        record = await tryFetchWithFallbackVisualStyle('conceptual', slotId ?? null);
        if (!record && slotId) {
          record = await tryFetchWithFallbackVisualStyle('conceptual', null);
        }
      }
    }

    // If no result and style is 'textbook', try 'conceptual' as fallback
    // (new generators often store only conceptual illustrations and the UI can reuse them).
    if (!record && style === 'textbook') {
      record = await tryFetchWithFallbackVisualStyle('conceptual', slotId ?? null);
      if (!record && slotId) {
        record = await tryFetchWithFallbackVisualStyle('conceptual', null);
      }
    }

    // If no result and style is 'conceptual', try 'textbook' as a compatibility fallback
    // (older generators only produced textbook illustrations).
    if (!record && style === 'conceptual') {
      record = await tryFetchWithFallbackVisualStyle('textbook', slotId ?? null);
      if (!record && slotId) {
        record = await tryFetchWithFallbackVisualStyle('textbook', null);
      }
    }

    if (!record) {
      return NextResponse.json({ success: true, illustration: null }, { status: 200 });
    }

    return NextResponse.json({ success: true, illustration: record });
  } catch (error) {
    console.error('[API/module-illustrations] Fetch failed', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch illustration' },
      { status: 500 }
    );
  }
}
