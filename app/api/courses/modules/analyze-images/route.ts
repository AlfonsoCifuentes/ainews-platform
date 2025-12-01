/**
 * API Route: Analyze Module Content for Image Insertion
 * 
 * Uses AI to analyze module content and determine:
 * 1. Optimal image placement positions
 * 2. Image types needed (schema, diagram, infographic, etc.)
 * 3. Detailed prompts for Nano Banana Pro
 * 
 * Model Strategy (Online):
 * - First tries local Ollama (DeepSeek R1 70B)
 * - Falls back to cloud LLMs in order: Claude → GPT-4o → Gemini → Groq
 * 
 * @endpoint POST /api/courses/modules/analyze-images
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  analyzeModuleForImages,
  generateModuleImages,
  insertImagesIntoContent,
  checkLocalModelsAvailable,
  getBestModelForImageAnalysis
} from '@/lib/ai/image-insertion-ai';

// ============================================================================
// SCHEMAS
// ============================================================================

const AnalyzeRequestSchema = z.object({
  content: z.string().min(100).describe('Module content in markdown format'),
  title: z.string().min(1).describe('Module title'),
  locale: z.enum(['en', 'es']).default('en'),
  maxImages: z.number().min(1).max(10).default(6),
  generateImages: z.boolean().default(false).describe('If true, also generates images'),
  insertImages: z.boolean().default(false).describe('If true, inserts images into content')
});

// ============================================================================
// HANDLERS
// ============================================================================

/**
 * POST /api/courses/modules/analyze-images
 * 
 * Analyzes module content for optimal image placement
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const params = AnalyzeRequestSchema.parse(body);
    
    console.log(`[API] Analyzing module "${params.title}" for images...`);
    
    // Step 1: Analyze content for image insertion points
    const analysis = await analyzeModuleForImages(
      params.content,
      params.title,
      params.locale
    );
    
    if (!analysis) {
      return NextResponse.json(
        { 
          error: 'Failed to analyze content for images',
          details: 'No analysis result returned. Check LLM configuration.'
        },
        { status: 500 }
      );
    }
    
    // If user only wants analysis, return it
    if (!params.generateImages) {
      return NextResponse.json({
        success: true,
        analysis: {
          moduleTitle: analysis.moduleTitle,
          totalRecommendedImages: analysis.totalRecommendedImages,
          overallStrategy: analysis.overallStrategy,
          keyConceptsToVisualize: analysis.keyConceptsToVisualize,
          insertionPoints: analysis.insertionPoints.map(p => ({
            id: p.id,
            imageType: p.imageType,
            purpose: p.purpose,
            insertAfterHeading: p.insertAfterHeading,
            priority: p.priority,
            estimatedComplexity: p.estimatedComplexity,
            promptPreview: p.nanoBananaPrompt.substring(0, 200) + '...'
          }))
        },
        imagesGenerated: false
      });
    }
    
    // Step 2: Generate images with Nano Banana Pro
    console.log(`[API] Generating ${Math.min(params.maxImages, analysis.insertionPoints.length)} images...`);
    const images = await generateModuleImages(analysis, params.locale, params.maxImages);
    
    const successfulImages = Array.from(images.values()).filter(r => r.success).length;
    
    // If user doesn't want insertion, return images separately
    if (!params.insertImages) {
      const imageData = Array.from(images.entries())
        .filter(([_, r]) => r.success)
        .map(([id, result]) => ({
          id,
          success: result.success,
          imageCount: result.images.length,
          mimeType: result.images[0]?.mimeType
        }));
      
      return NextResponse.json({
        success: true,
        analysis: {
          moduleTitle: analysis.moduleTitle,
          totalRecommendedImages: analysis.totalRecommendedImages,
          overallStrategy: analysis.overallStrategy,
          insertionPointsCount: analysis.insertionPoints.length
        },
        imagesGenerated: true,
        imagesCount: successfulImages,
        images: imageData
      });
    }
    
    // Step 3: Insert images into content
    console.log(`[API] Inserting ${successfulImages} images into content...`);
    const enhancedContent = insertImagesIntoContent(
      params.content,
      analysis,
      images,
      params.locale
    );
    
    return NextResponse.json({
      success: true,
      analysis: {
        moduleTitle: analysis.moduleTitle,
        totalRecommendedImages: analysis.totalRecommendedImages,
        overallStrategy: analysis.overallStrategy
      },
      imagesGenerated: true,
      imagesInserted: true,
      imagesCount: successfulImages,
      enhancedContent,
      contentLengthBefore: params.content.length,
      contentLengthAfter: enhancedContent.length
    });
    
  } catch (error) {
    console.error('[API] Error analyzing module for images:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid request parameters',
          details: error.errors 
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to analyze module for images',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/courses/modules/analyze-images
 * 
 * Returns available models for image analysis
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const checkLocal = searchParams.get('checkLocal') !== 'false';
    const checkCloud = searchParams.get('checkCloud') !== 'false';
    
    const result: {
      localModels: { available: boolean; models?: string[] } | null;
      cloudModels: { available: boolean; providers: string[] };
      recommended: { provider: string; model: string; description: string } | null;
    } = {
      localModels: null,
      cloudModels: { available: false, providers: [] },
      recommended: null
    };
    
    // Check local Ollama models
    if (checkLocal) {
      const localCheck = await checkLocalModelsAvailable();
      result.localModels = {
        available: localCheck.available,
        models: localCheck.models
      };
    }
    
    // Check cloud API keys
    if (checkCloud) {
      const cloudProviders: string[] = [];
      
      if (process.env.ANTHROPIC_API_KEY) cloudProviders.push('anthropic');
      if (process.env.OPENAI_API_KEY) cloudProviders.push('openai');
      if (process.env.GEMINI_API_KEY) cloudProviders.push('gemini');
      if (process.env.GROQ_API_KEY) cloudProviders.push('groq');
      if (process.env.OPENROUTER_API_KEY) cloudProviders.push('openrouter');
      
      result.cloudModels = {
        available: cloudProviders.length > 0,
        providers: cloudProviders
      };
    }
    
    // Get recommended model
    try {
      result.recommended = await getBestModelForImageAnalysis();
    } catch {
      result.recommended = null;
    }
    
    return NextResponse.json({
      success: true,
      ...result,
      hasImageGeneration: !!process.env.GEMINI_API_KEY,
      instructions: !result.localModels?.available && !result.cloudModels.available
        ? {
            local: 'Install Ollama and run: ollama pull deepseek-r1:70b',
            cloud: 'Set one of: ANTHROPIC_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY, GROQ_API_KEY'
          }
        : null
    });
    
  } catch (error) {
    console.error('[API] Error checking models:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check available models',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
