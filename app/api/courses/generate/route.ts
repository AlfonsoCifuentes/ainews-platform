import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServerClient } from '@/lib/db/supabase';
import { createLLMClientWithFallback, getAvailableProviders } from '@/lib/ai/llm-client';
import { categorizeCourse } from '@/lib/ai/course-categorizer';

const JSON_SYSTEM_PROMPT = 'You are a world-class AI educator that responds with valid JSON only. The JSON must match the provided schema exactly. Never include markdown fences, commentary, or additional text.';

const GenerateRequestSchema = z.object({
  topic: z.string().min(3).max(200),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  duration: z.enum(['short', 'medium', 'long']),
  locale: z.enum(['en', 'es'])
});

const CourseOutlineSchema = z.object({
  title: z.string().min(10),
  description: z.string().min(30),
  modules: z
    .array(
      z.object({
        title: z.string().min(6),
        description: z.string().min(20),
        estimated_minutes: z.number().min(5).max(120),
        topics: z.array(z.string().min(3)).min(1).max(6)
      })
    )
    .min(2)
    .max(10)
});

const ModuleContentSchema = z.object({
  content: z
    .string()
    .min(400)
    .describe('Markdown lesson with key concepts, deep dive, quiz, and resources sections'),
  resources: z
    .array(
      z.object({
        title: z.string().min(5),
        url: z.string().min(6),
        type: z.enum(['article', 'video', 'paper', 'documentation'])
      })
    )
    .default([])
});

const CourseTranslationSchema = z.object({
  title: z.string().min(10),
  description: z.string().min(30),
  modules: z
    .array(
      z.object({
        title: z.string().min(6),
        description: z.string().min(20),
        content: z.string().min(400)
      })
    )
    .min(2)
    .max(10)
});

type CourseOutline = z.infer<typeof CourseOutlineSchema>;
type ModuleContent = z.infer<typeof ModuleContentSchema>;
type CourseTranslation = z.infer<typeof CourseTranslationSchema>;
type ModuleResource = ModuleContent['resources'][number];

type CourseContentBundle = {
  title: string;
  description: string;
  modules: Array<{
    title: string;
    description: string;
    content: string;
  }>;
};

const localeLabels: Record<'en' | 'es', string> = {
  en: 'English',
  es: 'Spanish'
};

// Helper to send progress updates (for future SSE implementation)
// type _ProgressCallback = (step: string, progress: number, message: string) => void;

export async function POST(req: NextRequest) {
  const startedAt = Date.now();

  try {
    const body = await req.json();
    console.log('[Course Generator] Request body:', JSON.stringify(body, null, 2));
    
    const params = GenerateRequestSchema.parse(body);
    console.log('[Course Generator] Validated params:', JSON.stringify(params, null, 2));

    const db = getSupabaseServerClient();
    
    // Check if any LLM provider is configured
    const availableProviders = getAvailableProviders();
    
    if (availableProviders.length === 0) {
      console.error('[Course Generator] No LLM API keys configured');
      return NextResponse.json(
        {
          success: false,
          error: 'LLM API not configured',
          message: 'Please set at least one LLM API key in your .env.local file',
          hint: 'Configure GEMINI_API_KEY, OPENROUTER_API_KEY, or GROQ_API_KEY. Get free API keys from: https://aistudio.google.com/app/apikey, https://openrouter.ai, or https://groq.com'
        },
        { status: 503 }
      );
    }
    
    // Use automatic fallback system (Gemini → OpenRouter → Groq)
    let llm;
    try {
      llm = createLLMClientWithFallback();
      console.log(`[Course Generator] Using LLM with automatic fallback. Available providers: ${availableProviders.join(', ')}`);
    } catch (llmError) {
      console.error('[Course Generator] All LLM providers failed:', llmError);
      throw new Error(`LLM initialization failed: ${llmError instanceof Error ? llmError.message : 'Unknown error'}`);
    }

    console.log(`[Course Generator] Generating course on "${params.topic}" (${params.difficulty})`);

    // Build context with better error handling
    let context = '';
    try {
      context = await buildContext(db, params.topic);
    } catch (contextError) {
      console.warn('[Course Generator] Context building failed, continuing without RAG:', contextError);
      context = ''; // Continue without context
    }
    
    const languageName = localeLabels[params.locale];

    const outlinePrompt = `Create a cutting-edge AI course on "${params.topic}".
Audience difficulty: ${params.difficulty}.
Preferred duration: ${params.duration} (short=2-3 modules, medium=4-6, long=7-10).
Write all text in ${languageName}.

Use recent AI developments when relevant:
${context || 'No additional context available.'}

Return JSON matching this schema:
{
  "title": string,
  "description": string,
  "modules": [
    {
      "title": string,
      "description": string,
      "estimated_minutes": number,
      "topics": string[]
    }
  ]
}

Rules:
- Keep module count aligned with duration hint.
- estimated_minutes must be a realistic integer between 10 and 90.
- Topics should be specific, contemporary concepts.`;

    console.log('[Course Generator] Creating outline...');
    const outline = await llm.classify(outlinePrompt, CourseOutlineSchema, JSON_SYSTEM_PROMPT);

    const generatedModules: Array<{
      outline: CourseOutline['modules'][number];
      content: ModuleContent;
    }> = [];

    console.log('[Course Generator] Generating module content...');
    for (let i = 0; i < outline.modules.length; i += 1) {
      const moduleOutline = outline.modules[i];

      const modulePrompt = `Create the full content for module ${i + 1} of an AI course.
- Course topic: ${params.topic}
- Module title: ${moduleOutline.title}
- Module description: ${moduleOutline.description}
- Topics: ${moduleOutline.topics.join(', ')}
- Difficulty: ${params.difficulty}
- Language: ${languageName}

Structure the markdown with sections for:
1. Key Concepts (bullet list)
2. Deep Dive Lesson (rich explanations, examples, equations/code if needed)
3. Real-World Applications
4. Interactive Quiz (3-5 multiple choice questions with answers and explanations)
5. Further Resources (reference the JSON resources array)

Return JSON matching this schema:
{
  "content": string,
  "resources": [
    { "title": string, "url": string, "type": "article"|"video"|"paper"|"documentation" }
  ]
}

Requirements:
- Content length >= 800 words.
- Quiz must live inside the markdown with clear answers.
- Resources should be reputable, recent, and match the module topics.`;

      const moduleContent = await llm.classify(modulePrompt, ModuleContentSchema, JSON_SYSTEM_PROMPT);
      generatedModules.push({
        outline: moduleOutline,
        content: {
          ...moduleContent,
          resources: moduleContent.resources ?? []
        }
      });
      console.log(`[Course Generator] ✓ Module ${i + 1}/${outline.modules.length}`);
    }

    const primaryCourse = buildCourseBundle(outline, generatedModules);
    const secondaryLocale: 'en' | 'es' = params.locale === 'en' ? 'es' : 'en';
    let translatedCourse: CourseTranslation | null = null;

    try {
      translatedCourse = await translateCourse(llm, params.locale, secondaryLocale, primaryCourse);
    } catch (translationError) {
      console.warn('[Course Generator] Translation failed; falling back to primary language.', translationError);
    }

    const courseByLocale = resolveCourseLocales(params.locale, primaryCourse, translatedCourse);

    const topics = Array.from(
      new Set(
        outline.modules.flatMap((module) => module.topics.map((topic) => topic.trim()).filter(Boolean))
      )
    );

    const durationMinutes = generatedModules.reduce(
      (total, module) => total + normalizeDuration(module.outline.estimated_minutes),
      0
    );

    // Auto-categorize course based on topic and description
    const category = categorizeCourse(params.topic, courseByLocale.en.description);
    console.log(`[Course Generator] Auto-categorized as: ${category}`);

    const { data: course, error: courseError } = await db
      .from('courses')
      .insert({
        title_en: courseByLocale.en.title,
        title_es: courseByLocale.es.title,
        description_en: courseByLocale.en.description,
        description_es: courseByLocale.es.description,
        difficulty: params.difficulty,
        duration_minutes: durationMinutes,
        topics,
        category,
        ai_generated: true,
        generation_prompt: buildGenerationMetadata(params, outline, context),
        status: 'published', // Automatically publish generated courses
        published_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (courseError || !course) {
      throw courseError ?? new Error('Failed to insert course');
    }

    for (let i = 0; i < generatedModules.length; i += 1) {
      const moduleData = generatedModules[i];
      const resources = normalizeResources(moduleData.content.resources);

      const { error: moduleError } = await db
        .from('course_modules')
        .insert({
          course_id: course.id,
          order_index: i,
          title_en: courseByLocale.en.modules[i]?.title ?? moduleData.outline.title,
          title_es: courseByLocale.es.modules[i]?.title ?? moduleData.outline.title,
          content_en: courseByLocale.en.modules[i]?.content ?? moduleData.content.content,
          content_es: courseByLocale.es.modules[i]?.content ?? moduleData.content.content,
          type: 'text',
          estimated_time: normalizeDuration(moduleData.outline.estimated_minutes),
          resources
        })
        .select('id')
        .single();

      if (moduleError) {
        throw moduleError;
      }
    }

    await db.from('ai_system_logs').insert({
      action_type: 'course_generation',
      model_used: 'groq/llama-3.1-8b-instant',
      success: true,
      execution_time: Date.now() - startedAt,
      metadata: {
        topic: params.topic,
        difficulty: params.difficulty,
        duration: params.duration,
        modules: generatedModules.length,
        course_id: course.id
      }
    });

    console.log(`[Course Generator] ✅ Course "${courseByLocale[params.locale].title}" generated successfully`);

    return NextResponse.json({
      success: true,
      data: {
        course_id: course.id,
        title: courseByLocale[params.locale].title,
        modules_count: generatedModules.length,
        estimated_duration_minutes: durationMinutes
      }
    });
  } catch (error) {
    console.error('[Course Generator] ❌ Error:', error);
    console.error('[Course Generator] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('[Course Generator] Error type:', error?.constructor?.name || typeof error);

    if (error instanceof z.ZodError) {
      console.error('[Course Generator] Zod validation error:', JSON.stringify(error.errors, null, 2));
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request parameters',
          details: error.errors
        },
        { status: 400 }
      );
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Course Generator] Final error message:', errorMessage);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate course',
        message: errorMessage,
        hint: 'Check server logs for details'
      },
      { status: 500 }
    );
  }
}

async function buildContext(
  db: ReturnType<typeof getSupabaseServerClient>,
  topic: string
): Promise<string> {
  try {
    const embedding = await generateQueryEmbedding(topic);
    if (!embedding) {
      return '';
    }

    const { data, error } = await db.rpc('match_documents', {
      query_embedding: embedding,
      match_threshold: 0.75,
      match_count: 5
    });

    if (error || !data) {
      console.warn('[Course Generator] Context lookup failed:', error);
      return '';
    }

    const contextRecords = data as Array<{
      title_en?: string;
      title_es?: string;
      content_en?: string;
      content_es?: string;
    }>;

    return contextRecords
      .map((doc) => `${doc.title_en || doc.title_es || ''}\n${doc.content_en || doc.content_es || ''}`.trim())
      .filter(Boolean)
      .join('\n\n')
      .slice(0, 5000);
  } catch (error) {
    console.warn('[Course Generator] Failed to build context:', error);
    return '';
  }
}

function buildCourseBundle(
  outline: CourseOutline,
  modules: Array<{ outline: CourseOutline['modules'][number]; content: ModuleContent }>
): CourseContentBundle {
  return {
    title: outline.title,
    description: outline.description,
    modules: modules.map((module) => ({
      title: module.outline.title,
      description: module.outline.description,
      content: module.content.content
    }))
  };
}

async function translateCourse(
  llm: ReturnType<typeof createLLMClientWithFallback>,
  sourceLocale: 'en' | 'es',
  targetLocale: 'en' | 'es',
  course: CourseContentBundle
): Promise<CourseTranslation> {
  if (sourceLocale === targetLocale) {
    throw new Error('Source and target locales must differ');
  }

  const prompt = `Translate the following course content from ${localeLabels[sourceLocale]} to ${localeLabels[targetLocale]}.
Keep the markdown structure, keep technical terminology precise, and avoid adding commentary.
Return JSON matching:
{
  "title": string,
  "description": string,
  "modules": [
    { "title": string, "description": string, "content": string }
  ]
}

Source JSON:
${JSON.stringify(course)}`;

  return llm.classify(prompt, CourseTranslationSchema, JSON_SYSTEM_PROMPT);
}

function resolveCourseLocales(
  primaryLocale: 'en' | 'es',
  primary: CourseContentBundle,
  translated: CourseTranslation | null
): Record<'en' | 'es', CourseContentBundle> {
  if (translated) {
    return primaryLocale === 'en'
      ? { en: primary, es: translated }
      : { en: translated, es: primary };
  }

  if (primaryLocale === 'en') {
    return { en: primary, es: duplicateCourseBundle(primary) };
  }

  return { en: duplicateCourseBundle(primary), es: primary };
}

function duplicateCourseBundle(bundle: CourseContentBundle): CourseContentBundle {
  return {
    title: bundle.title,
    description: bundle.description,
    modules: bundle.modules.map((module) => ({ ...module }))
  };
}

function normalizeResources(resources?: ModuleResource[]): ModuleResource[] {
  if (!resources) {
    return [];
  }

  return resources.filter((resource) => Boolean(resource.title) && Boolean(resource.url));
}

function normalizeDuration(minutes: number): number {
  return Math.max(10, Math.min(120, Math.round(minutes)));
}

function buildGenerationMetadata(
  params: z.infer<typeof GenerateRequestSchema>,
  outline: CourseOutline,
  context: string
): string {
  return JSON.stringify({
    topic: params.topic,
    difficulty: params.difficulty,
    duration: params.duration,
    modules: outline.modules.length,
    contextChars: context.length
  });
}

async function generateQueryEmbedding(query: string): Promise<number[] | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.warn('[Course Generator] OPENROUTER_API_KEY is not configured; skipping RAG context.');
    return null;
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'https://ainews.vercel.app',
        'X-Title': 'AI News Platform'
      },
      body: JSON.stringify({
        model: 'openai/text-embedding-ada-002',
        input: query
      }),
      signal: AbortSignal.timeout(10000) // 10s timeout
    });

    if (!response.ok) {
      const message = await response.text();
      console.warn('[Course Generator] Embedding request failed:', response.status, message);
      return null;
    }

    const data = await response.json();
    const embedding = data?.data?.[0]?.embedding;

    if (!Array.isArray(embedding)) {
      console.warn('[Course Generator] Embedding response malformed.');
      return null;
    }

    return embedding as number[];
  } catch (error) {
    console.warn('[Course Generator] Embedding generation error:', error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}
