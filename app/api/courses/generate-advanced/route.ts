import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServerClient } from '@/lib/db/supabase';
import { generateCourseWithDetailedPrompts } from '@/lib/ai/course-generator-advanced';
import { categorizeCourse } from '@/lib/ai/course-categorizer';

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
    return OutlineSchema.parse(JSON.parse(data.response));
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

    const courseData = {
      title_en: params.locale === 'en' ? outline.title : outline.title,
      title_es: params.locale === 'es' ? outline.title : outline.title,
      description_en: params.locale === 'en' ? outline.description : outline.description,
      description_es: params.locale === 'es' ? outline.description : outline.description,
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
    const modulesToInsert = generatedModules.map((m, idx) => ({
      course_id: courseRecord.id,
      order_index: idx,
      title_en: params.locale === 'en' ? m.modulePrompt.title : m.modulePrompt.title,
      title_es: params.locale === 'es' ? m.modulePrompt.title : m.modulePrompt.title,
      content_en: params.locale === 'en' ? m.content.content : m.content.content,
      content_es: params.locale === 'es' ? m.content.content : m.content.content,
      type: 'text',
      estimated_time: m.modulePrompt.title.length || 45,
      resources: m.content.resources.map((r) => ({
        url: r.url,
        type: r.type,
        title: r.title
      }))
    }));

    const { error: modulesError } = await db
      .from('course_modules')
      .insert(modulesToInsert);

    if (modulesError) throw modulesError;

    console.log(`${logPrefix} ✅ All ${modulesToInsert.length} modules saved`);
    console.log(`${logPrefix} ✅ COURSE GENERATION COMPLETE!`);

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
