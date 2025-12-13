import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/db/supabase';
import { z } from 'zod';

// Logger utility (inline for API routes)
const logger = {
  info: (label: string, data: unknown): void => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [COURSES-API] ${label}`, JSON.stringify(data, null, 2));
  },
  error: (label: string, error: unknown): void => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] [COURSES-API] ERROR: ${label}`, error);
  },
  debug: (label: string, data: unknown): void => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [COURSES-API-DEBUG] ${label}`, JSON.stringify(data, null, 2));
  }
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const QuerySchema = z.object({
  category: z.string().optional(),
  difficulty: z.string().optional(),
  search: z.string().optional(),
  locale: z.enum(['en', 'es']).default('en'),
  sort: z.enum(['newest', 'popular', 'rating', 'oldest']).default('newest'),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

function isMissingColumnError(err: unknown): boolean {
  const anyErr = err as { code?: string; message?: string; details?: string };
  const msg = `${anyErr?.message ?? ''} ${anyErr?.details ?? ''}`.toLowerCase();
  return anyErr?.code === '42703' || (msg.includes('column') && msg.includes('does not exist'));
}

function isMissingRelationError(err: unknown): boolean {
  const anyErr = err as { code?: string; message?: string; details?: string };
  const msg = `${anyErr?.message ?? ''} ${anyErr?.details ?? ''}`.toLowerCase();
  return anyErr?.code === '42P01' || (msg.includes('relation') && msg.includes('does not exist'));
}

type CourseRow = Record<string, unknown>;

function getRowId(row: CourseRow): string | null {
  const v = row.id;
  if (typeof v === 'string' && v.trim() !== '') return v;
  if (v === null || v === undefined) return null;
  const s = String(v);
  return s.trim() ? s : null;
}

export async function GET(req: NextRequest) {
  try {
    logger.info('GET request received', { url: req.url });
    
    const db = getSupabaseServerClient();
    const { searchParams } = req.nextUrl;

    const parsed = QuerySchema.parse(Object.fromEntries(searchParams));

    // Parse query parameters
    const category = parsed.category;
    const difficulty = parsed.difficulty;
    const search = parsed.search;
    const locale = parsed.locale;
    const sort = parsed.sort; // newest, popular, rating, oldest
    const limit = parsed.limit;
    const offset = parsed.offset;
    
    logger.info('Query parameters parsed', {
      category,
      difficulty,
      search,
      locale,
      sort,
      limit,
      offset
    });
    
    // Build query
    logger.info('Building database query', {
      note: 'Schema-flexible select(*) to support older Supabase schemas',
      reasoning: 'Some deployments may not have newer columns like category/view_count/thumbnail_url yet',
    });
    
    // Apply filters
    logger.info('Applying filters', {
      hasCategoryFilter: !!category && category !== 'all',
      hasDifficultyFilter: !!difficulty && difficulty !== 'all',
      hasSearchFilter: !!search && search.trim(),
    });

    const searchColumn = locale === 'es' ? 'title_es' : 'title_en';
    const trimmedSearch = (search ?? '').trim();

    const includeCategoryCandidates = category && category !== 'all' ? [true, false] : [false];
    const orderCandidates: Array<{ column: string; ascending: boolean; note: string }> = (() => {
      switch (sort) {
        case 'popular':
          return [
            { column: 'view_count', ascending: false, note: 'popular by view_count' },
            { column: 'enrollment_count', ascending: false, note: 'popular by enrollment_count' },
            { column: 'created_at', ascending: false, note: 'fallback newest' },
          ];
        case 'rating':
          return [
            { column: 'rating_avg', ascending: false, note: 'rating' },
            { column: 'created_at', ascending: false, note: 'fallback newest' },
          ];
        case 'oldest':
          return [{ column: 'created_at', ascending: true, note: 'oldest' }];
        case 'newest':
        default:
          return [{ column: 'created_at', ascending: false, note: 'newest' }];
      }
    })();

    let courses: CourseRow[] | null = null;
    let lastError: unknown = null;

    for (const includeCategory of includeCategoryCandidates) {
      for (const order of orderCandidates) {
        logger.info('Executing query to Supabase', {
          timestamp: new Date().toISOString(),
          includeCategory,
          orderBy: order.column,
          orderNote: order.note,
        });

        let query = db.from('courses').select('*');

        if (includeCategory && category && category !== 'all') {
          query = query.eq('category', category);
          logger.debug('Category filter applied', { category });
        }

        if (difficulty && difficulty !== 'all') {
          query = query.eq('difficulty', difficulty);
          logger.debug('Difficulty filter applied', { difficulty });
        }

        if (trimmedSearch) {
          query = query.ilike(searchColumn, `%${trimmedSearch}%`);
          logger.debug('Search filter applied', { searchColumn, searchTerm: trimmedSearch });
        }

        query = query.order(order.column, { ascending: order.ascending });

        // Apply pagination
        query = query.range(offset, offset + limit - 1);
        logger.info('Pagination applied', { offset, limit, range: `${offset}-${offset + limit - 1}` });

        const res = await query;

        if (res.error) {
          lastError = res.error;
          const typedError = res.error as { code?: string; message?: string; details?: string };
          logger.error('Database error', {
            code: typedError.code,
            message: typedError.message,
            details: typedError.details,
          });

          // Retry on schema mismatches (missing columns)
          if (isMissingColumnError(res.error)) {
            continue;
          }

          return NextResponse.json({ success: false, error: 'Failed to fetch courses' }, { status: 500 });
        }

        const rows = (res.data as unknown as CourseRow[] | null) ?? [];
        courses = rows;
        lastError = null;
        logger.info('Query executed', {
          coursesCount: courses.length,
          hasError: false,
          timestamp: new Date().toISOString(),
        });
        break;
      }
      if (courses) break;
    }

    if (!courses) {
      logger.error('Database error (exhausted fallbacks)', lastError);
      return NextResponse.json({ success: false, error: 'Failed to fetch courses' }, { status: 500 });
    }
    
    // Fetch covers for all courses
    const courseIds = courses.map(getRowId).filter((id): id is string => typeof id === 'string');
    let coversMap: Record<string, string> = {};
    
    if (courseIds.length > 0) {
      const coversRes = await db
        .from('course_covers')
        .select('course_id, image_url')
        .in('course_id', courseIds)
        .eq('locale', locale);

      if (coversRes.error) {
        // Older schemas may not have course_covers yet.
        if (!isMissingRelationError(coversRes.error) && !isMissingColumnError(coversRes.error)) {
          logger.error('Covers query error', coversRes.error);
        }
      }

      type CoverRow = { course_id: string; image_url: string };
      const covers = (coversRes.data as unknown as CoverRow[] | null) ?? null;
      
      if (covers) {
        coversMap = covers.reduce((acc, c) => {
          acc[c.course_id] = c.image_url;
          return acc;
        }, {} as Record<string, string>);
      }
      logger.info('Covers fetched', { coversCount: Object.keys(coversMap).length });
    }
    
    // Merge covers into courses
    const coursesWithCovers = courses.map((c) => {
      const id = getRowId(c);
      return {
        ...c,
        thumbnail_url: id ? coversMap[id] || null : null,
      };
    });
    
    // Get total count for pagination
    logger.info('Fetching total count', { timestamp: new Date().toISOString() });

    let totalCount: number | null = null;
    let countLastError: unknown = null;

    for (const includeCategory of includeCategoryCandidates) {
      let countQuery = db.from('courses').select('*', { count: 'exact', head: true });
      if (includeCategory && category && category !== 'all') {
        countQuery = countQuery.eq('category', category);
      }
      if (difficulty && difficulty !== 'all') {
        countQuery = countQuery.eq('difficulty', difficulty);
      }
      if (trimmedSearch) {
        countQuery = countQuery.ilike(searchColumn, `%${trimmedSearch}%`);
      }

      const countRes = await countQuery;
      if (countRes.error) {
        countLastError = countRes.error;
        if (isMissingColumnError(countRes.error)) {
          continue;
        }
        logger.error('Count query error', countRes.error);
        break;
      }
      totalCount = countRes.count ?? 0;
      countLastError = null;
      break;
    }

    if (totalCount === null) {
      logger.error('Count query error (exhausted fallbacks)', countLastError);
      totalCount = courses.length;
    }
    
    logger.info('Total count retrieved', {
      totalCount,
      currentBatchCount: courses?.length || 0,
      hasMore: (offset + limit) < (totalCount || 0)
    });
    
    const responseData = {
      success: true,
      data: coursesWithCovers,
      courses: coursesWithCovers, // Backwards compatible
      pagination: {
        total: totalCount || 0,
        limit,
        offset,
        hasMore: (offset + limit) < (totalCount || 0)
      }
    };
    
    logger.info('Returning response', {
      success: true,
      coursesCount: responseData.data.length,
      totalCount: responseData.pagination.total
    });
    
    return NextResponse.json(responseData);
    
  } catch (error) {
    logger.error('Unexpected exception', {
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

