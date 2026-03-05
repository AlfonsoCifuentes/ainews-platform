import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ultralyticsVision } from '@/lib/services/ultralytics-vision';
import { getServerAuthUser } from '@/lib/auth/auth-config';

const AnalyzeImageSchema = z.object({
  imageUrl: z.string().url('Must be a valid URL'),
});

/** Block private/internal IPs to prevent SSRF */
function isPrivateUrl(urlStr: string): boolean {
  try {
    const url = new URL(urlStr);
    // Only allow https
    if (url.protocol !== 'https:') return true;
    const hostname = url.hostname.toLowerCase();
    // Block localhost, internal IPs, metadata endpoints
    const blocked = [
      /^localhost$/,
      /^127\./,
      /^10\./,
      /^172\.(1[6-9]|2\d|3[01])\./,
      /^192\.168\./,
      /^169\.254\./,
      /^0\./,
      /^\[::1\]$/,
      /^\[fc/,
      /^\[fd/,
      /^\[fe80/,
      /^metadata\.google/,
    ];
    return blocked.some(pattern => pattern.test(hostname));
  } catch {
    return true;
  }
}

export async function POST(req: NextRequest) {
  try {
    // Require authentication
    const user = await getServerAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { imageUrl } = AnalyzeImageSchema.parse(body);

    // SSRF protection: block private/internal URLs
    if (isPrivateUrl(imageUrl)) {
      return NextResponse.json(
        { success: false, error: 'Invalid image URL: only public HTTPS URLs are allowed' },
        { status: 400 }
      );
    }

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
        error: 'Analysis failed'
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