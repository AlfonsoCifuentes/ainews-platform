import { NextRequest, NextResponse } from 'next/server';
import { detectLocalModels, formatModelInfo } from '@/lib/ai/local-models';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * Detect and return available local AI models
 * GET /api/courses/detect-models
 */
export async function GET(_req: NextRequest) {
  console.log('[API] 🔍 Detecting local AI models...');

  try {
    const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    console.log('[API] ℹ️  Trying to detect Ollama at:', ollamaUrl);
    
    const setup = await detectLocalModels(ollamaUrl);

    console.log('[API] Detection result:', {
      hasOllama: setup.hasOllama,
      detectedUrl: setup.ollamaUrl,
      modelCount: setup.availableModels.length
    });

    const response = {
      success: true,
      hasOllama: setup.hasOllama,
      ollamaVersion: setup.ollamaVersion,
      ollamaUrl: setup.ollamaUrl,
      modelCount: setup.availableModels.length,
      models: setup.availableModels.map(m => ({
        name: m.name,
        size: `${m.size.toFixed(1)}GB`,
        speed: m.speedRating || 'unknown',
        isBestForJSON: m.isBestForJSON,
        contextLength: m.contextLength,
        info: formatModelInfo(m)
      })),
      recommendedModel: setup.recommendedModel
        ? {
            name: setup.recommendedModel.name,
            size: `${setup.recommendedModel.size.toFixed(1)}GB`,
            speed: setup.recommendedModel.speedRating,
            isBestForJSON: setup.recommendedModel.isBestForJSON,
            info: formatModelInfo(setup.recommendedModel)
          }
        : null,
      instructions: setup.instructions
    };

    console.log('[API] ✅ Model detection complete:', {
      hasOllama: setup.hasOllama,
      modelCount: setup.availableModels.length,
      hasRecommendation: !!setup.recommendedModel
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('[API] ❌ Model detection failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        hasOllama: false,
        models: [],
        instructions: 'Check server logs for details.'
      },
      { status: 500 }
    );
  }
}
