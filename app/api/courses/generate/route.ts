import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServerClient } from '@/lib/db/supabase';
import { createLLMClientWithFallback, getAvailableProviders } from '@/lib/ai/llm-client';
import { categorizeCourse } from '@/lib/ai/course-categorizer';

// Configure function timeout for Vercel (max 300s on Pro plan, 10s on Hobby)
export const maxDuration = 300; // 5 minutes
export const dynamic = 'force-dynamic';

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

async function classifyWithRetry<T>(
  llm: ReturnType<typeof createLLMClientWithFallback>,
  basePrompt: string,
  schema: z.ZodSchema<T>,
  systemPrompt: string,
  maxAttempts = 3,
): Promise<T> {
  let attempt = 0;
  let lastError: unknown;

  console.log(`[LLM Retry] Starting classification with max ${maxAttempts} attempts...`);

  while (attempt < maxAttempts) {
    const prompt =
      attempt === 0
        ? basePrompt
        : `${basePrompt}

REMEMBER: Return valid JSON that matches the provided schema exactly. Do not include prose, markdown fences, or commentary. Attempt ${attempt + 1} of ${maxAttempts}.`;

    try {
      console.log(`[LLM Retry] Attempt ${attempt + 1}/${maxAttempts} - Sending request to LLM...`);
      const result = await llm.classify(prompt, schema, systemPrompt);
      console.log(`[LLM Retry] ✅ Attempt ${attempt + 1} succeeded!`);
      return result;
    } catch (error) {
      lastError = error;
      console.error(
        `[LLM Retry] ❌ Attempt ${attempt + 1}/${maxAttempts} failed:`,
        error instanceof Error ? error.message : error,
      );

      attempt += 1;

      if (attempt < maxAttempts) {
        const waitTime = 500 * attempt;
        console.log(`[LLM Retry] ⏳ Waiting ${waitTime}ms before retry...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      } else {
        console.error(`[LLM Retry] ❌ All ${maxAttempts} attempts failed!`);
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Unknown LLM classification error');
}

// Helper to send progress updates (for future SSE implementation)
// type _ProgressCallback = (step: string, progress: number, message: string) => void;

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  const logPrefix = `[Course Generator ${new Date().toISOString()}]`;

  console.log('='.repeat(80));
  console.log(`${logPrefix} 🚀 NEW COURSE GENERATION REQUEST STARTED`);
  console.log('='.repeat(80));

  try {
    console.log(`${logPrefix} ⏳ Step 1/8: Parsing request body...`);
    const body = await req.json();
    console.log(`${logPrefix} ✅ Request body parsed:`, JSON.stringify(body, null, 2));
    
    console.log(`${logPrefix} ⏳ Step 2/8: Validating parameters...`);
    const params = GenerateRequestSchema.parse(body);
    console.log(`${logPrefix} ✅ Parameters validated:`, JSON.stringify(params, null, 2));

    console.log(`${logPrefix} ⏳ Step 3/8: Initializing Supabase client...`);
    const db = getSupabaseServerClient();
    console.log(`${logPrefix} ✅ Supabase client initialized`);
    
    // Check if any LLM provider is configured
    console.log(`${logPrefix} ⏳ Step 4/8: Checking LLM providers...`);
    const availableProviders = getAvailableProviders();
    console.log(`${logPrefix} 📊 Available providers:`, availableProviders);
    console.log(`${logPrefix} 🔑 API Keys status:`, {
      hasAnthropic: !!process.env.ANTHROPIC_API_KEY,
      hasGemini: !!process.env.GEMINI_API_KEY,
      hasOpenRouter: !!process.env.OPENROUTER_API_KEY,
      hasGroq: !!process.env.GROQ_API_KEY,
      hasTogether: !!process.env.TOGETHER_API_KEY,
      hasDeepSeek: !!process.env.DEEPSEEK_API_KEY,
      hasMistral: !!process.env.MISTRAL_API_KEY,
      // Debug: show actual values (first 10 chars)
      anthropicValue: process.env.ANTHROPIC_API_KEY?.substring(0, 10) + '...',
      geminiValue: process.env.GEMINI_API_KEY?.substring(0, 10) + '...',
      openRouterValue: process.env.OPENROUTER_API_KEY?.substring(0, 10) + '...',
      groqValue: process.env.GROQ_API_KEY?.substring(0, 10) + '...',
      togetherValue: process.env.TOGETHER_API_KEY?.substring(0, 10) + '...',
      deepSeekValue: process.env.DEEPSEEK_API_KEY?.substring(0, 10) + '...',
      mistralValue: process.env.MISTRAL_API_KEY?.substring(0, 10) + '...'
    });

    if (availableProviders.length === 0) {
      console.error(`${logPrefix} ❌ CRITICAL: No LLM API keys configured!`);
      console.error(`${logPrefix} 💡 Add at least one API key to .env.local:`);
      console.error(`${logPrefix}    - ANTHROPIC_API_KEY=your_key_here (recommended)`);
      console.error(`${logPrefix}    - GEMINI_API_KEY=your_key_here`);
      console.error(`${logPrefix}    - OPENROUTER_API_KEY=your_key_here`);
      console.error(`${logPrefix}    - GROQ_API_KEY=your_key_here`);
      console.error(`${logPrefix}    - TOGETHER_API_KEY=your_key_here`);
      console.error(`${logPrefix}    - DEEPSEEK_API_KEY=your_key_here`);
      console.error(`${logPrefix}    - MISTRAL_API_KEY=your_key_here`);
      return NextResponse.json(
        {
          success: false,
          error: 'LLM API not configured',
          message: 'No AI provider is currently available. Please configure API keys in your environment.',
          details: 'Set at least one LLM API key in .env.local'
        },
        { status: 503 }
      );
    }

    // Use automatic fallback system (Anthropic → Gemini → OpenRouter → Groq → Together → DeepSeek → Mistral)
    console.log(`${logPrefix} ⏳ Step 5/8: Creating LLM client with fallback...`);
    let llm;
    try {
      llm = createLLMClientWithFallback();
      console.log(`${logPrefix} ✅ LLM client created successfully`);
      console.log(`${logPrefix} 🤖 Provider order: ${availableProviders.join(' → ')}`);
    } catch (llmError) {
      console.error(`${logPrefix} ❌ All LLM providers failed:`, llmError);
      console.error(`${logPrefix} Error details:`, llmError instanceof Error ? llmError.stack : llmError);
      return NextResponse.json(
        {
          success: false,
          error: 'LLM initialization failed',
          message: `Failed to initialize AI: ${llmError instanceof Error ? llmError.message : 'Unknown error'}`
        },
        { status: 500 }
      );
    }

    console.log(`${logPrefix} ⏳ Step 6/8: Generating course "${params.topic}" (${params.difficulty}, ${params.duration})...`);

    // Build context with better error handling
    let context = '';
    try {
      console.log(`${logPrefix} 🔍 Building RAG context for topic: "${params.topic}"...`);
      context = await buildContext(db, params.topic);
      console.log(`${logPrefix} ✅ Context built successfully, length: ${context.length} chars`);
      if (context.length > 0) {
        console.log(`${logPrefix} 📝 Context preview: ${context.substring(0, 200)}...`);
      }
    } catch (contextError) {
      console.warn(`${logPrefix} ⚠️  Context building failed, continuing without RAG:`, contextError);
      context = ''; // Continue without context
    }
    
    const languageName = localeLabels[params.locale];
    console.log(`${logPrefix} 🌐 Target language: ${languageName}`);

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

    console.log(`${logPrefix} 📋 Creating course outline...`);
    console.log(`${logPrefix} Prompt length: ${outlinePrompt.length} chars`);
    const outline = await classifyWithRetry(
      llm,
      outlinePrompt,
      CourseOutlineSchema,
      JSON_SYSTEM_PROMPT,
    );
    console.log(`${logPrefix} ✅ Course outline created successfully!`);
    console.log(`${logPrefix} 📚 Title: "${outline.title}"`);
    console.log(`${logPrefix} 📝 Description: "${outline.description.substring(0, 100)}..."`);
    console.log(`${logPrefix} 📦 Modules count: ${outline.modules.length}`);
    outline.modules.forEach((mod, idx) => {
      console.log(`${logPrefix}    Module ${idx + 1}: "${mod.title}" (${mod.estimated_minutes} min, ${mod.topics.length} topics)`);
    });

    const generatedModules: Array<{
      outline: CourseOutline['modules'][number];
      content: ModuleContent;
    }> = [];

    console.log(`${logPrefix} ⏳ Generating detailed content for ${outline.modules.length} modules...`);
    for (let i = 0; i < outline.modules.length; i += 1) {
      const moduleOutline = outline.modules[i];

      console.log(`${logPrefix} 📝 Module ${i + 1}/${outline.modules.length}: "${moduleOutline.title}"...`);

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

      console.log(`${logPrefix}    Generating content (this may take 10-30 seconds)...`);
      const moduleContent = await classifyWithRetry(
        llm,
        modulePrompt,
        ModuleContentSchema,
        JSON_SYSTEM_PROMPT,
      );
      console.log(`${logPrefix}    ✅ Content generated: ${moduleContent.content.length} chars, ${moduleContent.resources?.length || 0} resources`);
      
      generatedModules.push({
        outline: moduleOutline,
        content: {
          ...moduleContent,
          resources: moduleContent.resources ?? []
        }
      });
      console.log(`${logPrefix} ✅ Module ${i + 1}/${outline.modules.length} completed successfully`);
    }

    console.log(`${logPrefix} ✅ All ${generatedModules.length} modules generated successfully!`);
    
    console.log(`${logPrefix} ⏳ Building course bundle...`);
    const primaryCourse = buildCourseBundle(outline, generatedModules);
    console.log(`${logPrefix} ✅ Course bundle built`);
    
    const secondaryLocale: 'en' | 'es' = params.locale === 'en' ? 'es' : 'en';
    let translatedCourse: CourseTranslation | null = null;

    console.log(`${logPrefix} 🌍 Translating to ${localeLabels[secondaryLocale]}...`);
    try {
      translatedCourse = await translateCourse(llm, params.locale, secondaryLocale, primaryCourse);
      console.log(`${logPrefix} ✅ Translation completed successfully`);
    } catch (translationError) {
      console.warn(`${logPrefix} ⚠️  Translation failed; falling back to primary language only.`, translationError);
    }

    console.log(`${logPrefix} ⏳ Step 7/8: Preparing database records...`);
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
    console.log(`${logPrefix} 🏷️  Auto-categorized as: "${category}"`);
    console.log(`${logPrefix} 🏷️  Topics: [${topics.join(', ')}]`);
    console.log(`${logPrefix} ⏱️  Total duration: ${durationMinutes} minutes`);

    console.log(`${logPrefix} 💾 Inserting course into database...`);
    const courseData = {
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
      status: 'published' as const,
      published_at: new Date().toISOString(),
      view_count: 0,
      enrollment_count: 0,
      rating_avg: 0.0,
      completion_rate: 0.0
    };
    console.log(`${logPrefix} 📊 Course data:`, JSON.stringify(courseData, null, 2));
    
    const { data: course, error: courseError } = await db
      .from('courses')
      .insert(courseData)
      .select('id')
      .single();

    if (courseError) {
      console.error(`${logPrefix} ❌ DATABASE ERROR inserting course:`, courseError);
      console.error(`${logPrefix} Error code:`, courseError.code);
      console.error(`${logPrefix} Error message:`, courseError.message);
      console.error(`${logPrefix} Error details:`, courseError.details);
      console.error(`${logPrefix} Error hint:`, courseError.hint);
      throw new Error(`Database insert failed: ${courseError.message || JSON.stringify(courseError)}`);
    }

    if (!course) {
      console.error(`${logPrefix} ❌ Course inserted but no data returned!`);
      throw new Error('Course inserted but no data returned');
    }

    console.log(`${logPrefix} ✅ Course inserted successfully! ID: ${course.id}`);

    console.log(`${logPrefix} ⏳ Step 8/8: Inserting ${generatedModules.length} modules...`);
    for (let i = 0; i < generatedModules.length; i += 1) {
      const moduleData = generatedModules[i];
      const resources = normalizeResources(moduleData.content.resources);

      console.log(`${logPrefix} 💾 Module ${i + 1}/${generatedModules.length}: "${courseByLocale.en.modules[i]?.title || moduleData.outline.title}"...`);
      
      const moduleRecord = {
        course_id: course.id,
        order_index: i,
        title_en: courseByLocale.en.modules[i]?.title ?? moduleData.outline.title,
        title_es: courseByLocale.es.modules[i]?.title ?? moduleData.outline.title,
        content_en: courseByLocale.en.modules[i]?.content ?? moduleData.content.content,
        content_es: courseByLocale.es.modules[i]?.content ?? moduleData.content.content,
        type: 'text' as const,
        estimated_time: normalizeDuration(moduleData.outline.estimated_minutes),
        resources
      };
      
      console.log(`${logPrefix}    Content lengths: EN=${moduleRecord.content_en.length}, ES=${moduleRecord.content_es.length}`);
      console.log(`${logPrefix}    Resources: ${resources.length}, Estimated time: ${moduleRecord.estimated_time} min`);

      const { error: moduleError } = await db
        .from('course_modules')
        .insert(moduleRecord)
        .select('id')
        .single();

      if (moduleError) {
        console.error(`${logPrefix} ❌ ERROR inserting module ${i + 1}:`, moduleError);
        console.error(`${logPrefix} Error code:`, moduleError.code);
        console.error(`${logPrefix} Error message:`, moduleError.message);
        console.error(`${logPrefix} Error details:`, moduleError.details);
        console.error(`${logPrefix} Error hint:`, moduleError.hint);
        throw new Error(`Module insert failed: ${moduleError.message || JSON.stringify(moduleError)}`);
      }
      
      console.log(`${logPrefix} ✅ Module ${i + 1}/${generatedModules.length} inserted successfully`);
    }

    console.log(`${logPrefix} ✅ All modules inserted successfully!`);
    
    console.log(`${logPrefix} 📊 Logging AI system activity...`);
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

    const totalTime = ((Date.now() - startedAt) / 1000).toFixed(2);
    console.log('='.repeat(80));
    console.log(`${logPrefix} 🎉 SUCCESS! Course "${courseByLocale[params.locale].title}" generated in ${totalTime}s`);
    console.log(`${logPrefix} 📦 Course ID: ${course.id}`);
    console.log(`${logPrefix} 📚 Modules: ${generatedModules.length}`);
    console.log(`${logPrefix} ⏱️  Duration: ${durationMinutes} minutes`);
    console.log('='.repeat(80));

    console.log('='.repeat(80));

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
    const errorTime = ((Date.now() - startedAt) / 1000).toFixed(2);
    console.error('='.repeat(80));
    console.error(`${logPrefix} ❌ COURSE GENERATION FAILED after ${errorTime}s`);
    console.error('='.repeat(80));
    console.error(`${logPrefix} Error:`, error);
    console.error(`${logPrefix} Error type:`, error?.constructor?.name || typeof error);
    console.error(`${logPrefix} Error stack:`, error instanceof Error ? error.stack : 'No stack trace');
    
    if (error instanceof Error) {
      console.error(`${logPrefix} Error message:`, error.message);
      console.error(`${logPrefix} Error name:`, error.name);
    }

    if (error instanceof z.ZodError) {
      console.error(`${logPrefix} 🔍 Zod validation error:`, JSON.stringify(error.errors, null, 2));
      error.errors.forEach((err, idx) => {
        console.error(`${logPrefix}    Error ${idx + 1}: ${err.path.join('.')} - ${err.message}`);
      });
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          message: 'The request parameters are invalid',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        },
        { status: 400 }
      );
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorType = error?.constructor?.name || 'UnknownError';
    
    console.error(`${logPrefix} 📋 Error summary:`, {
      message: errorMessage,
      type: errorType,
      hasStack: error instanceof Error && !!error.stack
    });
    console.error(`${logPrefix} 💬 Final error message:`, errorMessage);
    console.error('='.repeat(80));

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
  return classifyWithRetry(llm, prompt, CourseTranslationSchema, JSON_SYSTEM_PROMPT);
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
