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
import type { CourseIllustrationPlan } from './image-plan';
import { generateIllustrationWithCascade } from '@/lib/ai/image-cascade';
import { persistModuleIllustration, fetchLatestModuleIllustration } from '@/lib/db/module-illustrations';
import { copyCourseCoverLocale, persistCourseCoverShared, courseCoverExists } from '@/lib/db/course-covers';
import { getSupabaseServerClient } from '@/lib/db/supabase';
import { COURSE_COVER_NEGATIVE_PROMPT, enforceNoTextCoverPrompt } from './course-cover-no-text';

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

export interface GenerateCourseImagesOptions {
  /**
   * When `false`, skips the LLM-based image planning step and uses a deterministic
   * heuristic plan (faster and more reliable in serverless environments).
   */
  useLLMPlan?: boolean;
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

type ModuleContentRow = {
  id: string;
  title_en: string | null;
  title_es: string | null;
  content_en: string | null;
  content_es: string | null;
};

async function generateWithRunware(
  prompt: string,
  negativePrompt: string | undefined,
  width: number,
  height: number
): Promise<RunwareResult> {
  const apiKey = process.env.RUNWARE_API_KEY;
  if (!apiKey) {
    return { success: false, error: 'RUNWARE_API_KEY not configured' };
  }

  try {
    const trimmedNegative = typeof negativePrompt === 'string' ? negativePrompt.trim() : '';
    const response = await fetch('https://api.runware.ai/v1', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([
        {
          taskType: 'imageInference',
          taskUUID: randomUUID(),
          model: RUNWARE_MODEL,
          positivePrompt: prompt,
          ...(trimmedNegative.length >= 2 ? { negativePrompt: trimmedNegative } : {}),
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

async function moduleIllustrationExistsAnyLocale(moduleId: string, style: string): Promise<boolean> {
  const [en, es] = await Promise.all([
    moduleIllustrationExists(moduleId, 'en', style),
    moduleIllustrationExists(moduleId, 'es', style),
  ]);
  return en || es;
}

async function fetchModulesForGeneration(moduleIds: string[]): Promise<ModuleContentRow[]> {
  if (!moduleIds.length) return [];

  const db = getSupabaseServerClient();
  const { data, error } = await db
    .from('course_modules')
    .select('id, title_en, title_es, content_en, content_es')
    .in('id', moduleIds);

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as ModuleContentRow[];
  const byId = new Map(rows.map((row) => [row.id, row]));
  return moduleIds.map((id) => byId.get(id)).filter(Boolean) as ModuleContentRow[];
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
  input: CourseImageGeneratorInput,
  options: GenerateCourseImagesOptions = {}
): Promise<GenerationResult> {
  const result: GenerationResult = {
    coverGenerated: false,
    modulesProcessed: 0,
    modulesGenerated: 0,
    errors: [],
  };

  console.log(`[CourseImageGenerator] Starting for course: ${input.title}`);
  console.log(`[CourseImageGenerator] ${input.modules.length} modules, locale: ${input.locale}`);

  const hasRunware = Boolean(process.env.RUNWARE_API_KEY);
  if (!hasRunware) {
    console.warn('[CourseImageGenerator] RUNWARE_API_KEY not configured; cover generation may be skipped.');
    result.errors.push('RUNWARE_API_KEY not configured');
  }

  try {
    const useLLMPlan = options.useLLMPlan !== false;

    const plan: CourseIllustrationPlan = await (useLLMPlan
      ? (() => {
          console.log('[CourseImageGenerator] Planning illustrations with LLM...');
          return planCourseIllustrations({
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
        })()
      : (() => {
          console.log('[CourseImageGenerator] Using heuristic illustration plan (no LLM)...');
          const coverSubject = input.description ? `${input.title} — ${input.description}` : input.title;
          return Promise.resolve({
            courseCover: {
              prompt: enforceNoTextCoverPrompt(
                `${coverSubject}, minimalist dark editorial course cover, cinematic lighting, abstract symbolic composition, high contrast, no text, no letters, no typography, no logos, no watermarks`
              ),
              rationale: 'Heuristic cover prompt',
            },
            modules: input.modules.map((m) => ({
              moduleId: m.id,
              moduleTitle: m.title,
              images: [
                {
                  prompt: `Editorial textbook illustration for "${m.title}", dark mode aesthetic, minimalist, cinematic lighting, high contrast, no text, no letters, no typography, no logos, no watermarks`,
                  rationale: 'Heuristic module prompt',
                },
              ],
              diagrams: [],
            })),
            provider: 'heuristic',
            model: undefined,
          } satisfies CourseIllustrationPlan);
        })());

    console.log(`[CourseImageGenerator] Plan ready: cover + ${plan.modules.length} module plans`);

    // Step 2: Generate course cover
    if (plan.courseCover?.prompt) {
      const hasEn = await courseCoverExists(input.courseId, 'en');
      const hasEs = await courseCoverExists(input.courseId, 'es');

      // Enforce: same cover across locales.
      if (hasEn && !hasEs) {
        console.log('[CourseImageGenerator] Cover exists (en). Copying to es...');
        try {
          const saved = await copyCourseCoverLocale({
            courseId: input.courseId,
            fromLocale: 'en',
            toLocale: 'es',
            source: 'api',
          });
          if (saved) {
            result.coverGenerated = true;
            result.coverUrl = saved.image_url;
            console.log('[CourseImageGenerator] Cover copied to es');
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          result.errors.push(`Cover copy failed: ${msg}`);
          console.error('[CourseImageGenerator] Cover copy failed:', msg);
        }
      } else if (!hasEn && hasEs) {
        console.log('[CourseImageGenerator] Cover exists (es). Copying to en...');
        try {
          const saved = await copyCourseCoverLocale({
            courseId: input.courseId,
            fromLocale: 'es',
            toLocale: 'en',
            source: 'api',
          });
          if (saved) {
            result.coverGenerated = true;
            result.coverUrl = saved.image_url;
            console.log('[CourseImageGenerator] Cover copied to en');
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          result.errors.push(`Cover copy failed: ${msg}`);
          console.error('[CourseImageGenerator] Cover copy failed:', msg);
        }
      } else if (hasEn && hasEs) {
        console.log('[CourseImageGenerator] Cover already exists for en+es, skipping');
      } else {
        if (!hasRunware) {
          console.warn('[CourseImageGenerator] Skipping cover generation (Runware unavailable)');
        } else {
          console.log('[CourseImageGenerator] Generating cover (shared en+es)...');
          const coverPrompt = enforceNoTextCoverPrompt(plan.courseCover.prompt);
          const coverResult = await generateWithRunware(coverPrompt, COURSE_COVER_NEGATIVE_PROMPT, 768, 512);

          if (coverResult.success && coverResult.base64Data) {
            try {
              const saved = await persistCourseCoverShared({
                courseId: input.courseId,
                locales: ['en', 'es'],
                prompt: coverPrompt.slice(0, 2000),
                model: RUNWARE_MODEL,
                provider: 'runware',
                base64Data: coverResult.base64Data,
                mimeType: coverResult.mimeType || 'image/webp',
                source: 'api',
              });
              result.coverGenerated = saved.length > 0;
              result.coverUrl = saved[0]?.image_url;
              console.log('[CourseImageGenerator] Shared cover saved for en+es');
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
    }

    // Step 3: Generate module illustrations eagerly (integrated reading experience)
    // - Conceptual/textbook/header images are shared across locales.
    // - Diagram/schema/infographic images remain locale-specific (text-bearing).
    const moduleIds = input.modules.map((m) => m.id).filter(Boolean);

    let moduleRows: ModuleContentRow[] = [];
    try {
      moduleRows = await fetchModulesForGeneration(moduleIds);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('[CourseImageGenerator] Failed to fetch module contents from DB:', msg);
      result.errors.push(`Module fetch failed: ${msg}`);
      moduleRows = input.modules.map((m) => ({
        id: m.id,
        title_en: input.locale === 'en' ? m.title : null,
        title_es: input.locale === 'es' ? m.title : null,
        content_en: input.locale === 'en' ? m.content : null,
        content_es: input.locale === 'es' ? m.content : null,
      }));
    }

    for (const moduleRow of moduleRows) {
      result.modulesProcessed += 1;

      const contentEn = String(moduleRow.content_en ?? '').trim();
      const contentEs = String(moduleRow.content_es ?? '').trim();
      const titleEn = String(moduleRow.title_en ?? '').trim();
      const titleEs = String(moduleRow.title_es ?? '').trim();

      const conceptualExists = await moduleIllustrationExistsAnyLocale(moduleRow.id, 'conceptual');
      if (!conceptualExists) {
        const baseContent = contentEn || contentEs;
        const subject = titleEn || titleEs || input.title;
        if (baseContent) {
          console.log(`[CourseImageGenerator] Generating conceptual illustration for module: ${subject.slice(0, 60)}...`);
          const cascadeResult = await generateIllustrationWithCascade({
            moduleContent: `${subject}\n\n${baseContent}`.slice(0, 6000),
            locale: 'en',
            style: 'conceptual',
            visualStyle: 'photorealistic',
          });

          if (cascadeResult.success && cascadeResult.images.length) {
            const image = cascadeResult.images[0];
            const saved = await persistModuleIllustration({
              moduleId: moduleRow.id,
              locale: 'en',
              style: 'conceptual',
              visualStyle: 'photorealistic',
              model: cascadeResult.model,
              provider: cascadeResult.provider,
              base64Data: image.base64Data,
              mimeType: image.mimeType,
              prompt: cascadeResult.prompt.slice(0, 2000),
              source: 'api',
              metadata: {
                kind: 'conceptual',
                sharedAcrossLocales: true,
                courseId: input.courseId,
              },
            });

            if (saved) {
              result.modulesGenerated += 1;
            }
          } else {
            result.errors.push(`Module ${moduleRow.id} conceptual generation failed: ${cascadeResult.error ?? 'No image'}`);
          }
        }
      }

      const ensureDiagram = async (locale: 'en' | 'es', content: string, title: string) => {
        if (!content) return;
        const exists = await moduleIllustrationExists(moduleRow.id, locale, 'diagram');
        if (exists) return;

        console.log(`[CourseImageGenerator] Generating diagram (${locale}) for module: ${title.slice(0, 60)}...`);
        const cascadeResult = await generateIllustrationWithCascade({
          moduleContent: `${title}\n\n${content}`.slice(0, 6000),
          locale,
          style: 'diagram',
          visualStyle: 'photorealistic',
          providerOrder: ['gemini'],
        });

        if (!cascadeResult.success || !cascadeResult.images.length) {
          result.errors.push(`Module ${moduleRow.id} diagram (${locale}) failed: ${cascadeResult.error ?? 'No image'}`);
          return;
        }

        const image = cascadeResult.images[0];
        const saved = await persistModuleIllustration({
          moduleId: moduleRow.id,
          locale,
          style: 'diagram',
          visualStyle: 'photorealistic',
          model: cascadeResult.model,
          provider: cascadeResult.provider,
          base64Data: image.base64Data,
          mimeType: image.mimeType,
          prompt: cascadeResult.prompt.slice(0, 2000),
          source: 'api',
          metadata: {
            kind: 'diagram',
            sharedAcrossLocales: false,
            courseId: input.courseId,
            text: image.text ?? null,
          },
        });

        if (saved) {
          result.modulesGenerated += 1;
        }
      };

      await ensureDiagram('en', contentEn, titleEn || titleEs || input.title);
      await ensureDiagram('es', contentEs, titleEs || titleEn || input.title);
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
