/**
 * Redirect endpoint for course generation
 * Forwards all requests to /api/courses/generate-full
 * 
 * This endpoint exists for backward compatibility with the old CourseGenerator component
 */

import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 120;
export const dynamic = 'force-dynamic';

/**
 * Forward POST requests to the new complete endpoint
 * This ensures backward compatibility with old code calling /api/generate-course-simple
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Forward request to the new endpoint
    const newEndpointUrl = new URL('/api/courses/generate-full', req.nextUrl.origin);
    
    const response = await fetch(newEndpointUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[Course Generation Redirect] Error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Course generation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
