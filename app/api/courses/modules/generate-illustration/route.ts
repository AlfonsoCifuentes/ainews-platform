import { NextRequest, NextResponse } from 'next/server';
import { getGeminiImageClient } from '@/lib/ai/gemini-image';
import { z } from 'zod';

const RequestSchema = z.object({
  content: z.string().min(10, 'Content must be at least 10 characters'),
  locale: z.enum(['en', 'es']).default('en'),
  style: z.enum(['schema', 'infographic', 'conceptual', 'textbook']).default('textbook'),
  moduleId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = RequestSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid request', details: validated.error.errors },
        { status: 400 }
      );
    }

    const { content, locale, style } = validated.data;
    const client = getGeminiImageClient();

    console.log(`[API/generate-illustration] Generating ${style} illustration for ${locale}`);
    console.log(`[API/generate-illustration] Content length: ${content.length} chars`);

    const result = await client.generateEducationalIllustration(content, locale, style);

    if (!result.success) {
      console.error('[API/generate-illustration] Generation failed:', result.error);
      return NextResponse.json(
        { success: false, error: result.error, model: result.model },
        { status: 500 }
      );
    }

    // Return the first image as base64
    const image = result.images[0];
    
    return NextResponse.json({
      success: true,
      image: {
        data: image.base64Data,
        mimeType: image.mimeType,
        text: image.text,
      },
      model: result.model,
      thoughtProcess: result.thoughtProcess,
    });
  } catch (error) {
    console.error('[API/generate-illustration] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
