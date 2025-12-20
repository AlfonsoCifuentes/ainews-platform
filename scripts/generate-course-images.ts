#!/usr/bin/env tsx
/**
 * Script para generar imágenes de cursos usando:
 * - LLM (DeepSeek/OpenAI/Claude) para planificar qué imágenes generar
 * - Runware (runware:97@3) exclusivamente para imágenes generales y portadas
 * - Gemini 3 Pro Image exclusivamente para diagramas y esquemas
 */
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local explicitly
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

import { randomUUID } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { planCourseIllustrations } from '../lib/ai/image-plan';
import { persistModuleIllustration } from '../lib/db/module-illustrations';
import { copyCourseCoverLocale, persistCourseCoverShared } from '../lib/db/course-covers';

// ============================================================================
// Types
// ============================================================================

interface CourseRecord {
  id: string;
  title_en: string;
  title_es: string;
  description_en: string | null;
  description_es: string | null;
  course_modules: ModuleRecord[];
}

interface ModuleRecord {
  id: string;
  course_id: string;
  order_index: number;
  title_en: string;
  title_es: string;
  content_en: string | null;
  content_es: string | null;
}

type Locale = 'en' | 'es';

// ============================================================================
// Supabase Client
// ============================================================================

function getSupabase() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient(url, serviceRole, { auth: { persistSession: false } });
}

// ============================================================================
// Check for existing images (avoid regenerating)
// ============================================================================

async function coverExists(courseId: string, locale: Locale): Promise<boolean> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('course_covers')
    .select('id')
    .eq('course_id', courseId)
    .eq('locale', locale)
    .maybeSingle();
  return !!data;
}

async function moduleIllustrationExists(moduleId: string, locale: Locale, style: string): Promise<boolean> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('module_illustrations')
    .select('id')
    .eq('module_id', moduleId)
    .eq('locale', locale)
    .eq('style', style)
    .maybeSingle();
  return !!data;
}

// ============================================================================
// Runware Image Generation (ONLY for general images & covers)
// ============================================================================

const RUNWARE_MODEL = 'runware:97@3';

interface RunwareResult {
  success: boolean;
  base64Data?: string;
  mimeType?: string;
  error?: string;
}

async function generateWithRunware(prompt: string, width: number, height: number): Promise<RunwareResult> {
  const apiKey = process.env.RUNWARE_API_KEY;
  if (!apiKey) {
    return { success: false, error: 'RUNWARE_API_KEY not configured' };
  }

  console.log(`  [Runware] Generating ${width}x${height}...`);

  try {
    const response = await fetch('https://api.runware.ai/v1', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        {
          taskType: 'authentication',
          apiKey,
        },
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

    const data = await response.json() as { data?: Array<{ taskType: string; imageBase64Data?: string; error?: string }> };
    
    // Find the imageInference result
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
// Course Processing
// ============================================================================

function pickLocale(course: CourseRecord): Locale {
  return course.title_en ? 'en' : 'es';
}

function moduleContent(mod: ModuleRecord, locale: Locale): string {
  const raw = locale === 'en' ? mod.content_en : mod.content_es;
  return (raw ?? '').slice(0, 6000);
}

async function processCourse(course: CourseRecord) {
  const locale = pickLocale(course);
  const modules = [...(course.course_modules || [])].sort((a, b) => a.order_index - b.order_index);
  
  if (!modules.length) {
    console.log(`  ⚠️ No modules found, skipping`);
    return;
  }

  const courseTitle = locale === 'en' ? course.title_en : course.title_es;
  console.log(`\n📚 Processing: ${courseTitle}`);
  console.log(`   ${modules.length} modules, locale: ${locale}`);

  // Step 1: Use LLM to plan illustrations
  console.log(`\n  🤖 Planning illustrations with LLM...`);
  const plan = await planCourseIllustrations({
    courseId: course.id,
    title: courseTitle,
    description: locale === 'en' ? course.description_en ?? undefined : course.description_es ?? undefined,
    locale,
    modules: modules.map((m) => ({
      id: m.id,
      title: locale === 'en' ? m.title_en : m.title_es,
      content: moduleContent(m, locale),
    })),
  });

  console.log(`  ✓ Plan: cover + ${plan.modules.length} module plans (model: ${plan.model})`);

  // Step 2: Generate course cover with Runware (768x512 - safe dimensions)
  if (plan.courseCover?.prompt) {
    const hasEn = await coverExists(course.id, 'en');
    const hasEs = await coverExists(course.id, 'es');

    if (hasEn && !hasEs) {
      console.log(`\n  🖼️ Cover exists (en). Copying to es...`);
      await copyCourseCoverLocale({ courseId: course.id, fromLocale: 'en', toLocale: 'es', source: 'script' });
      console.log(`  ✓ Cover copied to es`);
    } else if (!hasEn && hasEs) {
      console.log(`\n  🖼️ Cover exists (es). Copying to en...`);
      await copyCourseCoverLocale({ courseId: course.id, fromLocale: 'es', toLocale: 'en', source: 'script' });
      console.log(`  ✓ Cover copied to en`);
    } else if (hasEn && hasEs) {
      console.log(`\n  🖼️ Cover already exists for en+es, skipping`);
    } else {
      console.log(`\n  🖼️ Generating cover (shared en+es)...`);
      const coverResult = await generateWithRunware(plan.courseCover.prompt, 768, 512);

      if (coverResult.success && coverResult.base64Data) {
        await persistCourseCoverShared({
          courseId: course.id,
          locales: ['en', 'es'],
          prompt: plan.courseCover.prompt.slice(0, 2000),
          model: RUNWARE_MODEL,
          provider: 'runware',
          base64Data: coverResult.base64Data,
          mimeType: coverResult.mimeType || 'image/webp',
          source: 'script',
        });
        console.log(`  ✓ Cover saved (shared)`);
      } else {
        console.log(`  ✗ Cover failed: ${coverResult.error}`);
      }
    }
  }

  // Step 3: Generate module images
  for (const modulePlan of plan.modules) {
    const mod = modules.find((m) => m.id === modulePlan.moduleId) 
      ?? modules.find((m) => m.title_en === modulePlan.moduleTitle || m.title_es === modulePlan.moduleTitle);
    
    if (!mod) {
      console.log(`  ⚠️ Module not found: ${modulePlan.moduleTitle}`);
      continue;
    }

    const modTitle = locale === 'en' ? mod.title_en : mod.title_es;
    console.log(`\n  📖 Module: ${modTitle}`);

    // Generate general image with Runware (512x512 - safe dimensions)
    const generalPrompt = modulePlan.images[0]?.prompt;
    if (generalPrompt) {
      // Check if image already exists
      if (await moduleIllustrationExists(mod.id, locale, 'textbook')) {
        console.log(`    ⏭️ Image already exists, skipping`);
      } else {
        const imgResult = await generateWithRunware(generalPrompt, 512, 512);
        
        if (imgResult.success && imgResult.base64Data) {
          await persistModuleIllustration({
            moduleId: mod.id,
            locale,
            style: 'textbook',
            visualStyle: 'photorealistic',
            model: RUNWARE_MODEL,
            provider: 'runware',
            prompt: generalPrompt.slice(0, 2000),
            base64Data: imgResult.base64Data,
            mimeType: imgResult.mimeType || 'image/webp',
            source: 'script',
            metadata: {},
          });
          console.log(`    ✓ Image saved`);
        } else {
          console.log(`    ✗ Image failed: ${imgResult.error}`);
        }
      }
    }

    // Generate diagram with Gemini (only if planned)
    const diagramPrompt = null;
    if (diagramPrompt) {
      // Check if diagram already exists
      if (await moduleIllustrationExists(mod.id, locale, 'diagram')) {
        console.log(`    ⏭️ Diagram already exists, skipping`);
      } else {
        const diagResult = await generateDiagramWithGemini(diagramPrompt);
        
        if (diagResult.success && diagResult.base64Data) {
          await persistModuleIllustration({
            moduleId: mod.id,
            locale,
            style: 'diagram',
            visualStyle: 'photorealistic',
            model: GEMINI_MODELS.GEMINI_3_PRO_IMAGE,
            provider: 'gemini',
            prompt: diagramPrompt.slice(0, 2000),
            base64Data: diagResult.base64Data,
            mimeType: diagResult.mimeType || 'image/png',
            source: 'script',
            metadata: {},
          });
          console.log(`    ✓ Diagram saved`);
        } else {
          console.log(`    ✗ Diagram failed: ${diagResult.error}`);
        }
      }
    }
  }
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log('🚀 Course Image Generation Script');
  console.log('================================');
  console.log(`Runware model: ${RUNWARE_MODEL}`);
  console.log('Diagrams: disabled (existing diagrams preserved)');

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('courses')
    .select('id,title_en,title_es,description_en,description_es,course_modules(*)');

  if (error) throw error;
  if (!data || !data.length) {
    console.log('No courses found');
    return;
  }

  console.log(`\nFound ${data.length} courses to process\n`);

  for (const course of data as CourseRecord[]) {
    try {
      await processCourse(course);
    } catch (err) {
      console.error(`\n❌ Error processing course ${course.id}:`, err);
    }
  }

  console.log('\n\n✅ Image generation complete!');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
