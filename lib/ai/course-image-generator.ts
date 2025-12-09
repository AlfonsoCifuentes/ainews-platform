/**
 * Course Image Generator
 * Generates course covers and module illustrations automatically
 * Called when a new course is created
 * 
 * Uses:
 * - LLM for planning prompts
 * - Runware for general images and covers
 * - Gemini for diagrams (optional)
 */
import { randomUUID } from 'crypto';
import { planCourseIllustrations } from './image-plan';
import { persistModuleIllustration, fetchLatestModuleIllustration } from '@/lib/db/module-illustrations';
import { persistCourseCover, courseCoverExists } from '@/lib/db/course-covers';

const RUNWARE_MODEL = process.env.RUNWARE_IMAGE_MODEL || 'runware:97@3';

// ============================================================================
// Types
// ============================================================================

export interface CourseImageGeneratorInput {
  courseId: string;
  title: string;
  description?: string;
  locale: 'en' | 'es';
  modules: Array<{
    id: string;
    title: string;
    content: string;
  }>;
}

export interface GenerationResult {
  coverGenerated: boolean;
  coverUrl?: string;
  modulesProcessed: number;
  modulesGenerated: number;
  errors: string[];
}

// ============================================================================
// Runware Image Generation
// ============================================================================

interface RunwareResult {
  success: boolean;
  base64Data?: string;
  mimeType?: string;
  error?: string;
}

async function generateWithRunware(
  prompt: string,
  width: number,
  height: number
): Promise<RunwareResult> {
  const apiKey = process.env.RUNWARE_API_KEY;
  if (!apiKey) {
    return { success: false, error: 'RUNWARE_API_KEY not configured' };
  }

  try {
    const response = await fetch('https://api.runware.ai/v1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([
        { taskType: 'authentication', apiKey },
        {
          taskType: 'imageInference',
          taskUUID: randomUUID(),
          model: RUNWARE_MODEL,
          positivePrompt: prompt,
          width,
          height,
          numberResults: 1,
          outputFormat: 'WEBP',
          outputType: 'base64Data',
        },
      ]),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `Runware HTTP ${response.status}: ${errorText.slice(0, 200)}` };
    }

    const data = await response.json() as {
      data?: Array<{ taskType: string; imageBase64Data?: string; error?: string }>;
    };

    const imageResult = data.data?.find((d) => d.taskType === 'imageInference');

    if (!imageResult) {
      return { success: false, error: 'No imageInference result in response' };
    }

    if (imageResult.error) {
      return { success: false, error: imageResult.error };
    }

    if (!imageResult.imageBase64Data) {
      return { success: false, error: 'No image data in response' };
    }

    return {
      success: true,
      base64Data: imageResult.imageBase64Data,
      mimeType: 'image/webp',
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

// ============================================================================
// Check existing illustrations
// ============================================================================

async function moduleIllustrationExists(
  moduleId: string,
  locale: 'en' | 'es',
  style: string
): Promise<boolean> {
  const existing = await fetchLatestModuleIllustration({
    moduleId,
    locale,
    style,
    visualStyle: 'photorealistic',
  });
  return !!existing;
}

// ============================================================================
// Main Generator Function
// ============================================================================

/**
 * Generate images for a course (cover + module illustrations)
 * This is called automatically when a new course is created.
 * 
 * It's designed to be non-blocking - errors are logged but don't stop the process.
 */
export async function generateCourseImages(
  input: CourseImageGeneratorInput
): Promise<GenerationResult> {
  const result: GenerationResult = {
    coverGenerated: false,
    modulesProcessed: 0,
    modulesGenerated: 0,
    errors: [],
  };

  console.log(`[CourseImageGenerator] Starting for course: ${input.title}`);
  console.log(`[CourseImageGenerator] ${input.modules.length} modules, locale: ${input.locale}`);

  // Skip if no Runware API key
  if (!process.env.RUNWARE_API_KEY) {
    console.warn('[CourseImageGenerator] RUNWARE_API_KEY not configured, skipping image generation');
    result.errors.push('RUNWARE_API_KEY not configured');
    return result;
  }

  try {
    // Step 1: Use LLM to plan illustrations
    console.log('[CourseImageGenerator] Planning illustrations with LLM...');
    const plan = await planCourseIllustrations({
      courseId: input.courseId,
      title: input.title,
      description: input.description,
      locale: input.locale,
      modules: input.modules.map((m) => ({
        id: m.id,
        title: m.title,
        content: m.content.slice(0, 6000), // Limit content for LLM
      })),
    });

    console.log(`[CourseImageGenerator] Plan ready: cover + ${plan.modules.length} module plans`);

    // Step 2: Generate course cover
    if (plan.courseCover?.prompt) {
      const coverAlreadyExists = await courseCoverExists(input.courseId, input.locale);
      
      if (coverAlreadyExists) {
        console.log('[CourseImageGenerator] Cover already exists, skipping');
      } else {
        console.log('[CourseImageGenerator] Generating cover...');
        const coverResult = await generateWithRunware(plan.courseCover.prompt, 768, 512);

        if (coverResult.success && coverResult.base64Data) {
          try {
            const saved = await persistCourseCover({
              courseId: input.courseId,
              locale: input.locale,
              prompt: plan.courseCover.prompt.slice(0, 2000),
              model: RUNWARE_MODEL,
              provider: 'runware',
              base64Data: coverResult.base64Data,
              mimeType: coverResult.mimeType || 'image/webp',
              source: 'api',
            });
            result.coverGenerated = true;
            result.coverUrl = saved.image_url;
            console.log('[CourseImageGenerator] Cover saved');
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            result.errors.push(`Cover persist failed: ${msg}`);
            console.error('[CourseImageGenerator] Cover persist failed:', msg);
          }
        } else {
          result.errors.push(`Cover generation failed: ${coverResult.error}`);
          console.error('[CourseImageGenerator] Cover generation failed:', coverResult.error);
        }
      }
    }

    // Step 3: Generate module images
    for (const modulePlan of plan.modules) {
      result.modulesProcessed++;

      const mod = input.modules.find((m) => m.id === modulePlan.moduleId)
        ?? input.modules.find((m) => m.title === modulePlan.moduleTitle);

      if (!mod) {
        result.errors.push(`Module not found: ${modulePlan.moduleTitle}`);
        continue;
      }

      // Generate general image with Runware
      const generalPrompt = modulePlan.images[0]?.prompt;
      if (generalPrompt) {
        const exists = await moduleIllustrationExists(mod.id, input.locale, 'textbook');

        if (exists) {
          console.log(`[CourseImageGenerator] Module ${mod.id} image exists, skipping`);
        } else {
          console.log(`[CourseImageGenerator] Generating image for: ${mod.title.slice(0, 40)}...`);
          const imgResult = await generateWithRunware(generalPrompt, 512, 512);

          if (imgResult.success && imgResult.base64Data) {
            try {
              await persistModuleIllustration({
                moduleId: mod.id,
                locale: input.locale,
                style: 'textbook',
                visualStyle: 'photorealistic',
                model: RUNWARE_MODEL,
                provider: 'runware',
                prompt: generalPrompt.slice(0, 2000),
                base64Data: imgResult.base64Data,
                mimeType: imgResult.mimeType || 'image/webp',
                source: 'api',
                metadata: {},
              });
              result.modulesGenerated++;
              console.log(`[CourseImageGenerator] Module image saved`);
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err);
              result.errors.push(`Module ${mod.id} persist failed: ${msg}`);
            }
          } else {
            result.errors.push(`Module ${mod.id} generation failed: ${imgResult.error}`);
          }
        }
      }
    }

    console.log(`[CourseImageGenerator] Complete: cover=${result.coverGenerated}, modules=${result.modulesGenerated}/${result.modulesProcessed}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    result.errors.push(`Fatal error: ${msg}`);
    console.error('[CourseImageGenerator] Fatal error:', msg);
  }

  return result;
}

/**
 * Fire-and-forget version - doesn't block the response
 * Use this in API endpoints to not delay the course creation response
 */
export function generateCourseImagesAsync(input: CourseImageGeneratorInput): void {
  // Run in background, don't await
  generateCourseImages(input)
    .then((result) => {
      if (result.errors.length > 0) {
        console.warn('[CourseImageGenerator] Completed with errors:', result.errors);
      }
    })
    .catch((err) => {
      console.error('[CourseImageGenerator] Background generation failed:', err);
    });
}
