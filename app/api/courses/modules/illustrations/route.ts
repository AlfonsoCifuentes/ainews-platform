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
    // Try exact style first, then fall back to 'textbook' if not found
    let record = await fetchLatestModuleIllustration({
      moduleId,
      locale,
      style,
      visualStyle,
      slotId: slotId ?? null,
    });
    
    // If no result and style is 'header', try 'textbook' as fallback
    if (!record && style === 'header') {
      record = await fetchLatestModuleIllustration({
        moduleId,
        locale,
        style: 'textbook',
        visualStyle,
        slotId: null, // textbook illustrations don't have slots
      });
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
