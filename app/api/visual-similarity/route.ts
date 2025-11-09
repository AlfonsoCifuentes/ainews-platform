/**
 * API Route: Visual Similarity Statistics and Analysis
 *
 * GET /api/visual-similarity/stats - Get similarity statistics
 * POST /api/visual-similarity/analyze - Analyze image similarity
 */

import { NextRequest, NextResponse } from 'next/server';
import { visualSimilarity } from '../../../lib/services/visual-similarity';
import { z } from 'zod';

const AnalyzeRequestSchema = z.object({
  imageUrl: z.string().url(),
  options: z.object({
    duplicateThreshold: z.number().min(0).max(64).default(0),
    similarThreshold: z.number().min(0).max(64).default(5),
    maxResults: z.number().min(1).max(10).default(5)
  }).optional()
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'stats') {
      // Get statistics
      const stats = await visualSimilarity.getStatistics();

      return NextResponse.json({
        success: true,
        data: stats
      });
    }

    // Default: return service status
    return NextResponse.json({
      success: true,
      data: {
        service: 'visual-similarity',
        status: 'operational',
        description: 'Detects duplicate and similar images using perceptual hashing'
      }
    });

  } catch (error) {
    console.error('[API] Visual similarity error:', error);
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageUrl, options } = AnalyzeRequestSchema.parse(body);

    console.log(`[API] Analyzing visual similarity for: ${imageUrl.slice(0, 60)}...`);

    const result = await visualSimilarity.checkSimilarity(imageUrl, options);

    console.log(`[API] Analysis complete - Duplicate: ${result.isDuplicate}, Similar: ${result.isSimilar}`);

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request data',
          details: error.errors
        },
        { status: 400 }
      );
    }

    console.error('[API] Visual similarity analysis error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Analysis failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}