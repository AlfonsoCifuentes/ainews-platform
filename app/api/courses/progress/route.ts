import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createApiClient } from '@/lib/db/supabase-api';

const ProgressSchema = z.object({
  courseId: z.string().uuid(),
  moduleId: z.string().uuid(),
  completed: z.boolean(),
  score: z.number().min(0).max(100).optional(),
  timeSpent: z.number().min(0).optional(),
  notes: z.string().optional(),
});

/**
 * POST /api/courses/progress
 * Updates module progress for authenticated user
 */
export async function POST(req: NextRequest) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log('\n' + '='.repeat(80));
  console.log(`[PROGRESS API] [${requestId}] ====== REQUEST START ======`);
  console.log(`[PROGRESS API] [${requestId}] Timestamp: ${new Date().toISOString()}`);
  
  let sanitizedBodySummary: { courseId?: string; moduleId?: string; completed?: boolean } = {};
  try {
    // Step 1: Create API client from request cookies
    console.log(`[PROGRESS API] [${requestId}] Step 1: Creating API client from request...`);
    const supabase = createApiClient(req);
    console.log(`[PROGRESS API] [${requestId}] Step 1 Complete: API client created`);
    
    // Log cookies and header summary for debugging
    const cookieHeader = req.headers.get('cookie') || '';
    const headersSummary = {
      'user-agent': req.headers.get('user-agent') || 'unknown',
      'content-type': req.headers.get('content-type') || 'unknown',
      hasCookieHeader: !!cookieHeader,
      hasSbCookies: cookieHeader.includes('sb-'),
    };
    console.log(`[PROGRESS API] [${requestId}] Headers summary:`, headersSummary);
    
    // Step 2: Get authenticated user
    console.log(`[PROGRESS API] [${requestId}] Step 2: Getting authenticated user...`);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    console.log(`[PROGRESS API] [${requestId}] Step 2 Result:`, {
      hasUser: !!user,
      userId: user?.id || 'NULL',
      userEmail: user?.email || 'NULL',
      authError: authError?.message || 'none'
    });

    if (authError || !user) {
      console.log(`[PROGRESS API] [${requestId}] ❌ UNAUTHORIZED - No user session found`);
      console.log(`[PROGRESS API] [${requestId}] ====== REQUEST END (401) ======\n`);
      return NextResponse.json({ 
        error: 'Unauthorized',
        debug: { requestId, reason: authError?.message || 'No authenticated user session', headers: headersSummary }
      }, { status: 401 });
    }

    // Step 2: Parse request body
    console.log(`[PROGRESS API] [${requestId}] Step 2: Parsing request body...`);
    const body = await req.json();
    // Sanitize body summary (only include allowed fields to avoid leaking user data)
    sanitizedBodySummary = {
      courseId: body?.courseId,
      moduleId: body?.moduleId,
      completed: body?.completed,
    };
    console.log(`[PROGRESS API] [${requestId}] Step 2 Raw body:`, JSON.stringify(body, null, 2));
    console.log(`[PROGRESS API] [${requestId}] Step 2 Body summary:`, sanitizedBodySummary);

    // Step 3: Validate with Zod
    console.log(`[PROGRESS API] [${requestId}] Step 3: Validating with Zod schema...`);
    const { courseId, moduleId, completed, score, timeSpent, notes } =
      ProgressSchema.parse(body);
    console.log(`[PROGRESS API] [${requestId}] Step 3 Validated:`, {
      courseId,
      moduleId,
      completed,
      score: score ?? 'undefined',
      timeSpent: timeSpent ?? 'undefined'
    });

    // Step 4: Use the same SSR client for database operations
    console.log(`[PROGRESS API] [${requestId}] Step 4: Using SSR client for DB operations...`);
    const db = supabase; // Use the same client that has the auth context
    console.log(`[PROGRESS API] [${requestId}] Step 4 Complete: Using authenticated SSR client`);

    // Step 5: Check if module exists
    console.log(`[PROGRESS API] [${requestId}] Step 5: Verifying module exists...`);
    const { data: moduleCheck, error: moduleCheckError } = await db
      .from('course_modules')
      .select('id, course_id')
      .eq('id', moduleId)
      .single();
    
    if (moduleCheckError || !moduleCheck) {
      console.log(`[PROGRESS API] [${requestId}] ❌ Module not found:`, moduleCheckError);
      return NextResponse.json({ 
        error: 'Module not found',
        debug: { requestId, moduleId, error: moduleCheckError?.message, sanitizedBodySummary }
      }, { status: 404 });
    }
    console.log(`[PROGRESS API] [${requestId}] Step 5 Complete: Module verified`, moduleCheck);

    // Step 6: Check existing progress
    console.log(`[PROGRESS API] [${requestId}] Step 6: Checking existing progress record...`);
    console.log(`[PROGRESS API] [${requestId}] Query params:`, {
      user_id: user.id,
      course_id: courseId,
      module_id: moduleId
    });

    // Check if progress record exists
    const { data: existing, error: existingError } = await db
      .from('user_progress')
      .select('*')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .eq('module_id', moduleId)
      .maybeSingle(); // Use maybeSingle to not error when no record exists

    if (existingError) {
      console.log(`[PROGRESS API] [${requestId}] Step 6 Warning - Error checking existing:`, existingError);
    }
    
    console.log(`[PROGRESS API] [${requestId}] Step 6 Result:`, {
      exists: !!existing,
      existingId: existing?.id || 'N/A',
      existingCompleted: existing?.completed || false
    });

    let data;
    let error;

    // Step 7: Insert or Update progress
    if (existing) {
      console.log(`[PROGRESS API] [${requestId}] Step 7: UPDATING existing record (id: ${existing.id})`);
      const updatePayload = {
        completed,
        score: score !== undefined ? score : existing.score,
        time_spent: timeSpent !== undefined ? timeSpent : existing.time_spent,
        notes: notes !== undefined ? notes : existing.notes,
        completed_at: completed ? new Date().toISOString() : existing.completed_at,
        updated_at: new Date().toISOString(),
      };
      console.log(`[PROGRESS API] [${requestId}] Update payload:`, updatePayload);
      
      ({ data, error } = await db
        .from('user_progress')
        .update(updatePayload)
        .eq('id', existing.id)
        .select()
        .single());
    } else {
      console.log(`[PROGRESS API] [${requestId}] Step 7: INSERTING new record`);
      const insertPayload = {
        user_id: user.id,
        course_id: courseId,
        module_id: moduleId,
        completed,
        score: score || null,
        time_spent: timeSpent || 0,
        notes: notes || null,
        completed_at: completed ? new Date().toISOString() : null,
      };
      console.log(`[PROGRESS API] [${requestId}] Insert payload:`, insertPayload);
      
      ({ data, error } = await db
        .from('user_progress')
        .insert(insertPayload)
        .select()
        .single());
    }

    if (error) {
      console.error(`[PROGRESS API] [${requestId}] ❌ Step 7 FAILED - Database error:`);
      console.error(`[PROGRESS API] [${requestId}]   Message: ${error.message}`);
      console.error(`[PROGRESS API] [${requestId}]   Code: ${error.code}`);
      console.error(`[PROGRESS API] [${requestId}]   Details: ${error.details}`);
      console.error(`[PROGRESS API] [${requestId}]   Hint: ${error.hint}`);
      console.log(`[PROGRESS API] [${requestId}] ====== REQUEST END (500) ======\n`);
      const headersSummary = {
        'user-agent': req.headers.get('user-agent') || 'unknown',
        'content-type': req.headers.get('content-type') || 'unknown',
        hasCookieHeader: !!cookieHeader,
        hasSbCookies: cookieHeader.includes('sb-'),
      };

      return NextResponse.json(
        { 
          error: 'Failed to update progress',
          debug: {
            requestId,
            dbError: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
            headers: headersSummary,
            sanitizedBodySummary,
            userId: user?.id ? String(user?.id).slice(0, 8) + '...' : 'unknown'
          }
        },
        { status: 500 }
      );
    }

    // Step 8: Success!
    console.log(`[PROGRESS API] [${requestId}] ✅ Step 7 SUCCESS - Progress saved`);
    console.log(`[PROGRESS API] [${requestId}] Result:`, {
      progressId: data?.id,
      completed: data?.completed,
      completedAt: data?.completed_at
    });

    // The database trigger will automatically:
    // - Update course progress percentage
    // - Award XP for module completion
    // - Check for achievements

    console.log(`[PROGRESS API] [${requestId}] ====== REQUEST END (200) ======\n`);

    return NextResponse.json({
      success: true,
      progress: data,
      message: 'Progress updated successfully',
      debug: { requestId }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error(`[PROGRESS API] [${requestId}] ❌ Zod validation error:`, error.errors);
      console.log(`[PROGRESS API] [${requestId}] ====== REQUEST END (400) ======\n`);
      const headersSummary = {
        'user-agent': req.headers.get('user-agent') || 'unknown',
        'content-type': req.headers.get('content-type') || 'unknown',
        hasCookieHeader: !!(req.headers.get('cookie') || ''),
        hasSbCookies: (req.headers.get('cookie') || '').includes('sb-'),
      };
      return NextResponse.json(
        { 
          error: 'Invalid request', 
          details: error.errors,
          debug: { requestId, zodErrors: error.errors, headers: headersSummary, sanitizedBodySummary }
        },
        { status: 400 }
      );
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : 'N/A';
    
    console.error(`[PROGRESS API] [${requestId}] ❌ Unexpected error:`, errorMessage);
    console.error(`[PROGRESS API] [${requestId}] Stack:`, errorStack);
    console.log(`[PROGRESS API] [${requestId}] ====== REQUEST END (500) ======\n`);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        debug: { requestId, message: errorMessage }
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/courses/progress?courseId=xxx
 * Gets all progress for a course
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = createApiClient(req);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('courseId');

    if (!courseId) {
      return NextResponse.json(
        { error: 'courseId is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Get progress error:', error);
      return NextResponse.json(
        { error: 'Failed to get progress' },
        { status: 500 }
      );
    }

    return NextResponse.json({ progress: data });
  } catch (error) {
    console.error('Get progress API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
