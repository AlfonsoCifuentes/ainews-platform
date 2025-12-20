import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServerClient } from '@/lib/db/supabase';
import { generateCourseWithDetailedPrompts } from '@/lib/ai/course-generator-advanced';
import { categorizeCourse } from '@/lib/ai/course-categorizer';
import { sanitizeAndFixJSON, parseJSON } from '@/lib/utils/json-fixer';
import { normalizeEditorialMarkdown } from '@/lib/courses/editorial-style';
import { translateMarkdown, translateText } from '@/lib/ai/translator';
import { generateCourseImages } from '@/lib/ai/course-image-generator';

export const maxDuration = 300; // 5 minutes - Vercel hobby plan limit
export const dynamic = 'force-dynamic';

const GenerateRequestSchema = z.object({
  topic: z.string().min(3).max(200),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  duration: z.enum(['short', 'medium', 'long']),
  locale: z.enum(['en', 'es'])
});

const OutlineSchema = z.object({
  title: z.string(),
  description: z.string(),
  modules: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      topics: z.array(z.string()),
      estimated_minutes: z.number()
    })
  )
});

// Map duration to module count
function getDurationModuleCount(duration: string): { min: number; max: number } {
  const map = {
    short: { min: 2, max: 3 },
    medium: { min: 4, max: 6 },
    long: { min: 7, max: 10 }
  };
  return map[duration as keyof typeof map] || map.medium;
}

async function generateCourseOutline(
  topic: string,
  difficulty: string,
  duration: string,
  languageName: string
): Promise<z.infer<typeof OutlineSchema>> {
  const { min: minModules, max: maxModules } = getDurationModuleCount(duration);

  const outlinePrompt = `Create a cutting-edge AI course outline on "${topic}".

Audience difficulty: ${difficulty}
Module count: ${minModules} to ${maxModules} modules
Duration: ${duration}
Language: ${languageName}

Return ONLY valid JSON matching this schema:
{
  "title": "Course title",
  "description": "Comprehensive course description",
  "modules": [
    {
      "title": "Module title",
      "description": "What this module covers",
      "topics": ["topic1", "topic2", "topic3"],
      "estimated_minutes": 45
    }
  ]
}`;

  try {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'neural-chat:latest',
        prompt: outlinePrompt,
        system: 'You are an expert instructional designer. Respond with ONLY valid JSON.',
        stream: false
      })
    });

    const data = await response.json();
    // Use robust JSON fixing utility
    const fixed = sanitizeAndFixJSON(data.response);
    return OutlineSchema.parse(parseJSON(fixed, 'generate-advanced outline'));
  } catch (error) {
    console.error('Error generating outline:', error);
    throw error;
  }
}

export async function POST(req: NextRequest) {
  const logPrefix = '[/api/courses/generate-advanced]';

  console.log(`\n${logPrefix} 🚀 ADVANCED COURSE GENERATION REQUEST`);

  try {
    const body = await req.json();
    const params = GenerateRequestSchema.parse(body);

    console.log(`${logPrefix} 📝 Request: ${params.topic} (${params.difficulty}, ${params.duration})`);

    const db = getSupabaseServerClient();
    const localeLabels = { en: 'English', es: 'Spanish' };
    const languageName = localeLabels[params.locale];

    // Step 1: Generate outline
    console.log(`${logPrefix} 📋 Step 1/3: Generating course outline...`);
    const outline = await generateCourseOutline(
      params.topic,
      params.difficulty,
      params.duration,
      languageName
    );

    console.log(`${logPrefix} ✅ Outline generated: "${outline.title}"`);
    console.log(`${logPrefix}    Modules: ${outline.modules.length}`);

    // Step 2: Generate detailed module prompts and content
    console.log(`${logPrefix} 🤖 Step 2/3: Generating content with detailed prompts...`);
    const generatedModules = await generateCourseWithDetailedPrompts(
      params.topic,
      outline.description,
      params.difficulty as 'beginner' | 'intermediate' | 'advanced',
      outline.modules,
      languageName,
      params.locale
    );

    console.log(`${logPrefix} ✅ All ${generatedModules.length} modules generated with detailed content`);

    // Step 3: Save to database
    console.log(`${logPrefix} 💾 Step 3/3: Saving to database...`);

    const primaryLocale = params.locale;
    const secondaryLocale: 'en' | 'es' = primaryLocale === 'en' ? 'es' : 'en';

    const translatedTitle = await translateText(outline.title, primaryLocale, secondaryLocale);
    const translatedDescription = await translateText(outline.description, primaryLocale, secondaryLocale);

    const courseData = {
      title_en: primaryLocale === 'en' ? outline.title : translatedTitle,
      title_es: primaryLocale === 'es' ? outline.title : translatedTitle,
      description_en: primaryLocale === 'en' ? outline.description : translatedDescription,
      description_es: primaryLocale === 'es' ? outline.description : translatedDescription,
      difficulty: params.difficulty,
      duration_minutes: generatedModules.reduce((sum, m) => sum + (m.modulePrompt.title.length || 45), 0),
      topics: Array.from(
        new Set(outline.modules.flatMap((m) => m.topics))
      ),
      category: categorizeCourse(params.topic, outline.description),
      ai_generated: true,
      advanced_generation: true // Mark as using advanced 2-step system
    };

    const { data: courseRecord, error: courseError } = await db
      .from('courses')
      .insert([courseData])
      .select('id')
      .single();

    if (courseError) throw courseError;

    console.log(`${logPrefix} ✅ Course created: ${courseRecord.id}`);

    // Save modules
    const modulesToInsert = [];

    for (let idx = 0; idx < generatedModules.length; idx += 1) {
      const moduleEntry = generatedModules[idx];
      const primaryTitle = moduleEntry.modulePrompt.title;
      const primaryStandfirst = outline.modules[idx]?.description ?? outline.description;

      const secondaryTitle = await translateText(primaryTitle, primaryLocale, secondaryLocale);
      const secondaryStandfirst = await translateText(primaryStandfirst, primaryLocale, secondaryLocale);

      const primaryContentRaw = moduleEntry.content.content;
      const secondaryContentRaw = await translateMarkdown(primaryContentRaw, primaryLocale, secondaryLocale);

      const normalizedPrimary = normalizeEditorialMarkdown(primaryContentRaw, {
        title: primaryTitle,
        standfirst: primaryStandfirst,
        locale: primaryLocale,
      });

      const normalizedSecondary = normalizeEditorialMarkdown(secondaryContentRaw, {
        title: secondaryTitle,
        standfirst: secondaryStandfirst,
        locale: secondaryLocale,
      });

      const title_en = primaryLocale === 'en' ? primaryTitle : secondaryTitle;
      const title_es = primaryLocale === 'es' ? primaryTitle : secondaryTitle;
      const content_en = primaryLocale === 'en' ? normalizedPrimary : normalizedSecondary;
      const content_es = primaryLocale === 'es' ? normalizedPrimary : normalizedSecondary;

      modulesToInsert.push({
        course_id: courseRecord.id,
        order_index: idx,
        title_en,
        title_es,
        content_en,
        content_es,
        type: 'text',
        estimated_time: moduleEntry.modulePrompt.title.length || 45,
        resources: moduleEntry.content.resources.map((r) => ({
          url: r.url,
          type: r.type,
          title: r.title,
        })),
      });
    }

    const { data: insertedModules, error: modulesError } = await db
      .from('course_modules')
      .insert(modulesToInsert)
      .select('id,title_en,title_es,content_en,content_es');

    if (modulesError) throw modulesError;

    console.log(`${logPrefix} ✅ All ${modulesToInsert.length} modules saved`);
    console.log(`${logPrefix} ✅ COURSE GENERATION COMPLETE!`);

    // Generate cover + module illustrations eagerly so the reading experience is ready immediately.
    // Errors are logged but do not fail course creation.
    type InsertedModuleForImages = {
      id: string;
      title_en: string | null;
      title_es: string | null;
      content_en: string | null;
      content_es: string | null;
    };

    const moduleIdsForImages = (insertedModules ?? []).map((row) => {
      const typed = row as InsertedModuleForImages;
      return {
        id: String(typed.id ?? ''),
        title:
          params.locale === 'es'
            ? String(typed.title_es ?? typed.title_en ?? '')
            : String(typed.title_en ?? typed.title_es ?? ''),
        content:
          params.locale === 'es'
            ? String(typed.content_es ?? typed.content_en ?? '')
            : String(typed.content_en ?? typed.content_es ?? ''),
      };
    });

    if (moduleIdsForImages.length) {
      console.log(`${logPrefix} Generating course images (cover + module illustrations)...`);
      try {
        const imageResult = await generateCourseImages(
          {
            courseId: courseRecord.id,
            title: params.locale === 'es' ? courseData.title_es : courseData.title_en,
            description:
              params.locale === 'es' ? courseData.description_es : courseData.description_en,
            locale: params.locale,
            modules: moduleIdsForImages,
          },
          { useLLMPlan: false }
        );

        if (imageResult.errors.length > 0) {
          console.warn(`${logPrefix} Image generation completed with warnings:`, imageResult.errors);
        }
      } catch (err) {
        console.warn(`${logPrefix} Image generation failed (continuing):`, err);
      }
    }

    return NextResponse.json(
      {
        success: true,
        courseId: courseRecord.id,
        title: outline.title,
        modules: generatedModules.length,
        totalCharacters: generatedModules.reduce((sum, m) => sum + m.content.content.length, 0),
        message: `Course "${outline.title}" generated successfully with ${generatedModules.length} comprehensive modules`
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(`${logPrefix} ❌ Error:`, error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Course generation failed'
      },
      { status: 500 }
    );
  }
}
