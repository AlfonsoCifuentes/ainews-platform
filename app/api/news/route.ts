import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { defaultLocale, locales, type Locale } from '@/i18n';
import { fetchLatestNews } from '@/lib/db/news';

const QuerySchema = z.object({
  locale: z.enum(locales).default(defaultLocale),
  limit: z.coerce.number().min(1).max(50).default(12),
  category: z.string().min(1).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const parsed = QuerySchema.parse({
      locale: searchParams.get('locale') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
      category: searchParams.get('category') ?? undefined,
    });

    const { locale, limit, category } = parsed;

    const articles = await fetchLatestNews({
      locale: locale as Locale,
      limit,
      category,
    });

    return NextResponse.json({ data: articles });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.flatten() },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
