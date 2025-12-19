import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { fetchLatestModuleIllustration } from '@/lib/db/module-illustrations';
import { VISUAL_STYLES } from '@/lib/types/illustrations';

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

    // Non-diagram illustrations must be shared across locales (same image in EN/ES).
    // Diagrams can contain text and must remain locale-specific.
    const localesToTry: Array<'en' | 'es'> = isTextBearing ? [locale] : ['en', 'es'];

    const tryFetch = async (requestedStyle: string, requestedSlotId: string | null) => {
      for (const candidateLocale of localesToTry) {
        const found = await fetchLatestModuleIllustration({
          moduleId,
          locale: candidateLocale,
          style: requestedStyle,
          visualStyle,
          slotId: requestedSlotId,
        });
        if (found) return found;
      }
      return null;
    };

    // Try exact style first.
    let record = await tryFetch(style, slotId ?? null);
    
    // If no result and style is 'header', try 'textbook' as fallback
    if (!record && style === 'header') {
      record = await tryFetch('textbook', null); // textbook illustrations don't have slots
    }

    // If no result and style is 'conceptual', try 'textbook' as a compatibility fallback
    // (older generators only produced textbook illustrations).
    if (!record && style === 'conceptual') {
      record = await tryFetch('textbook', slotId ?? null);
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
