import { NextRequest, NextResponse } from 'next/server';

/**
 * Simple test endpoint that doesn't use LLM
 * Returns a mock course to verify the endpoint works
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { topic, difficulty, duration, locale } = body;

    // Verify we got the data
    console.log('[Mock Course] Generating mock course:', { topic, difficulty, duration, locale });

    // Return a mock course
    const course = {
      success: true,
      data: {
        course_id: 'mock-' + Date.now(),
        title: `[MOCK] ${topic} - ${difficulty}`,
        modules_count: 3,
        estimated_duration_minutes: 45,
      },
    };

    return NextResponse.json(course);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'mock_error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
