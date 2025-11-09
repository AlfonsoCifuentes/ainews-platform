import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ultralyticsVision } from '@/lib/services/ultralytics-vision';

const AnalyzeImageSchema = z.object({
  imageUrl: z.string().url('Must be a valid URL'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageUrl } = AnalyzeImageSchema.parse(body);

    console.log(`[API] Analyzing image: ${imageUrl}`);

    // Analyze image with Ultralytics
    const analysis = await ultralyticsVision.analyzeImage(imageUrl);

    // Get accessibility description
    const description = await ultralyticsVision.getImageDescription(imageUrl);

    return NextResponse.json({
      success: true,
      analysis: {
        isValid: analysis.isValid,
        confidence: analysis.confidence,
        detectedObjects: analysis.detectedObjects,
        hasRelevantContent: analysis.hasRelevantContent,
        reasoning: analysis.reasoning,
        metadata: analysis.metadata,
        accessibilityDescription: description
      }
    });

  } catch (error) {
    console.error('[API] Image analysis failed:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request',
          details: error.errors
        },
        { status: 400 }
      );
    }

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

export async function GET() {
  return NextResponse.json({
    success: true,
    service: 'Ultralytics Computer Vision API',
    available: ultralyticsVision.isAvailable(),
    description: 'Analyze images for relevant visual content using YOLO object detection'
  });
}