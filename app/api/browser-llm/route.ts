import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const runtime = 'edge'; // Edge runtime for better performance

const GenerateRequestSchema = z.object({
  prompt: z.string().min(10),
  systemPrompt: z.string().optional(),
  maxTokens: z.number().min(100).max(4000).optional(),
  temperature: z.number().min(0).max(2).optional(),
});

/**
 * API endpoint for browser-based LLM generation
 * 
 * This is a minimal endpoint that validates input and returns it
 * The actual generation happens in the browser using Transformers.js
 * 
 * This endpoint is used to:
 * 1. Validate request parameters
 * 2. Log usage (optional)
 * 3. Return structured response
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = GenerateRequestSchema.parse(body);

    // Log browser LLM usage (for analytics)
    console.log('[Browser LLM API] Request received:', {
      promptLength: validated.prompt.length,
      maxTokens: validated.maxTokens,
      temperature: validated.temperature,
    });

    // Return validated params (actual generation happens in browser)
    return NextResponse.json({
      success: true,
      message: 'Request validated. Generate in browser using BrowserLLM class.',
      params: validated,
      cost: 0, // Always $0.00
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request parameters',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    console.error('[Browser LLM API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check if browser LLM is recommended
 */
export async function GET() {
  return NextResponse.json({
    recommended: true,
    models: {
      premium: {
        id: 'Xenova/Phi-3.5-mini-instruct',
        size: '3.8GB',
        quality: 'Excellent',
        speed: 'Fast',
      },
      balanced: {
        id: 'Xenova/Qwen2-1.5B-Instruct',
        size: '1.5GB',
        quality: 'Very Good',
        speed: 'Very Fast',
      },
      fast: {
        id: 'Xenova/TinyLlama-1.1B-Chat-v1.0',
        size: '637MB',
        quality: 'Good',
        speed: 'Ultra Fast',
      },
    },
    benefits: [
      '$0.00 API costs after download',
      '100% private - nothing leaves browser',
      'Works offline after first download',
      'WebGPU accelerated on modern GPUs',
      'No rate limits',
    ],
  });
}
