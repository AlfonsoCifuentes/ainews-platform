import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServerClient } from '@/lib/db/supabase';
import { 
  classifyWithAllProviders, 
  getAvailableProviders, 
  classifyLLMError,
  type LLMProvider 
} from '@/lib/ai/llm-client';
import { categorizeCourse } from '@/lib/ai/course-categorizer';
import { detectLocalModels } from '@/lib/ai/local-models';

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
    .min(2500)
    .describe('Comprehensive markdown lesson (2500+ words minimum) with key concepts, deep dive examples, practical applications, quiz, and resources sections'),
  resources: z
    .array(
      z.object({
        title: z.string().min(5),
        url: z.string().min(6),
        type: z.enum(['article', 'video', 'paper', 'documentation'])
      })
    )
    .min(3)
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
        content: z.string().min(1200)
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

/**
 * Wrapper around classifyWithAllProviders that tries all available LLM providers
 * This replaces the old classifyWithRetry that only used one provider
 * 
 * CRITICAL FIX: We set maxAttemptsPerProvider=1 (not 2) because internally,
 * each LLMClient.fetchWithRateLimitRetry() will ALSO retry up to 5 times on 429.
 * 
 * Without this: 1 rate-limited provider wastes 2 attempts × 5 retries = 10 mins
 * before trying the next provider. With 7+ providers available, user waits hours!
 * 
 * With this: 1 attempt per provider means we quickly fallback through all 7
 * providers in seconds instead of hours.
 */
async function classifyWithProviderFallback<T>(
  basePrompt: string,
  schema: z.ZodSchema<T>,
  systemPrompt: string,
): Promise<{ result: T; provider: LLMProvider }> {
  try {
    console.log(`[Classify] 🔄 Starting classification with multi-provider fallback...`);
    const { result, provider, attempts } = await classifyWithAllProviders(
      basePrompt,
      schema,
      systemPrompt,
      1 // CRITICAL: 1 attempt only! Internal retries will handle 429
    );
    console.log(`[Classify] ✅ Classification succeeded with ${provider} after ${attempts} total attempts`);
    return { result, provider };
  } catch (error) {
    // Error is already detailed from classifyWithAllProviders
    console.error(`[Classify] ❌ Classification failed with all providers:`, error instanceof Error ? error.message : error);
    throw error;
  }
}

// Helper to send progress updates (for future SSE implementation)
// type _ProgressCallback = (step: string, progress: number, message: string) => void;

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  const logPrefix = `[Course Generator ${new Date().toISOString()}]`;

  // Capture all console logs/errors for debugging
  const capturedLogs: string[] = [];
  const originalLog = console.log;
  const originalError = console.error;
  
  console.log = (...args: unknown[]) => {
    originalLog(...args);
    capturedLogs.push(args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' '));
  };
  
  console.error = (...args: unknown[]) => {
    originalError(...args);
    capturedLogs.push(`[ERROR] ${args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ')}`);
  };

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
    
    // Check for local models
    console.log(`${logPrefix} 🏠 Checking for local Ollama models...`);
    const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    const localSetup = await detectLocalModels(ollamaUrl);
    
    if (localSetup.hasOllama && localSetup.availableModels.length > 0) {
      console.log(`${logPrefix} ✅ Found ${localSetup.availableModels.length} local model(s):`);
      localSetup.availableModels.forEach(m => {
        const badge = m.isBestForJSON ? '✨' : '  ';
        console.log(`${logPrefix}    ${badge} ${m.name} (${m.size.toFixed(1)}GB, ${m.speedRating})`);
      });
    }
    
    console.log(`${logPrefix} 🔑 API Keys status:`, {
      hasAnthropic: !!process.env.ANTHROPIC_API_KEY,
      hasGemini: !!process.env.GEMINI_API_KEY,
      hasOpenRouter: !!process.env.OPENROUTER_API_KEY,
      hasGroq: !!process.env.GROQ_API_KEY,
      hasTogether: !!process.env.TOGETHER_API_KEY,
      hasDeepSeek: !!process.env.DEEPSEEK_API_KEY,
      hasMistral: !!process.env.MISTRAL_API_KEY,
      hasLocalModels: localSetup.hasOllama && localSetup.availableModels.length > 0
    });

    // Check if we have ANY provider available (local or cloud)
    const hasCloudProviders = availableProviders.length > 0;
    const hasLocalModels = localSetup.hasOllama && localSetup.availableModels.length > 0;

    if (!hasCloudProviders && !hasLocalModels) {
      console.error(`${logPrefix} ❌ CRITICAL: No LLM providers available!`);
      console.error(`${logPrefix} 💡 Options:`);
      console.error(`${logPrefix}    1. Install Ollama (free, zero cost):`);
      console.error(`${logPrefix}       - Download: https://ollama.ai`);
      console.error(`${logPrefix}       - Pull model: ollama pull neural-chat:latest`);
      console.error(`${logPrefix}    2. Or add cloud API key to .env.local:`);
      console.error(`${logPrefix}       - ANTHROPIC_API_KEY (recommended)`);
      console.error(`${logPrefix}       - GROQ_API_KEY`);
      console.error(`${logPrefix}       - GEMINI_API_KEY`);
      console.error(`${logPrefix}       - OPENROUTER_API_KEY`);
      return NextResponse.json(
        {
          success: false,
          error: 'No AI provider available',
          message: 'Please install Ollama with local models or configure cloud API keys',
          hasLocalModels: false,
          hasCloudProviders: false,
          suggestedSetup: hasLocalModels ? 'ollama' : 'cloud',
          instructions: localSetup.instructions
        },
        { status: 503 }
      );
    }

    console.log(`${logPrefix} ✅ Step 5/8: Found ${availableProviders.length} available providers: ${availableProviders.join(', ')}`);
    console.log(`${logPrefix} 🤖 Provider fallback order: ${availableProviders.join(' → ')}`);

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
    
    const { result: outline, provider: outlineProvider } = await classifyWithProviderFallback(
      outlinePrompt,
      CourseOutlineSchema,
      JSON_SYSTEM_PROMPT,
    );
    
    console.log(`${logPrefix} ✅ Course outline created successfully with ${outlineProvider}!`);
    console.log(`${logPrefix} 📚 Title: "${outline.title}"`);
    console.log(`${logPrefix} 📝 Description: "${outline.description.substring(0, 100)}..."`);
    console.log(`${logPrefix} 📦 Modules count: ${outline.modules.length}`);
    outline.modules.forEach((mod: { title: string; estimated_minutes: number; topics: string[] }, idx: number) => {
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

      const modulePrompt = `You are a world-renowned textbook author and subject matter expert with 25+ years of professional experience in "${params.topic}". You are writing a comprehensive chapter for a graduate-level university textbook and professional certification program.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MODULE SPECIFICATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Module ${i + 1}: "${moduleOutline.title}"
Language: ${languageName}
Difficulty Level: ${params.difficulty} (for university/professional audience)
Estimated Duration: ${moduleOutline.estimated_minutes} minutes of engaged reading

Core Topics to Cover:
${moduleOutline.topics.map((t, idx) => `  ${idx + 1}. ${t}`).join('\n')}

Module Description & Learning Goals:
${moduleOutline.description}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
QUALITY STANDARDS - PREMIUM TEXTBOOK CHAPTER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WORD COUNT & DEPTH:
✓ Minimum 3000+ words (not 2500). Anything less is superficial.
✓ Section allocations:
  - Introduction & Context: 300-400 words
  - Foundational Concepts: 600-800 words
  - Core Theory & Principles: 800-1000 words
  - Advanced Deep Dive: 800-1000 words
  - Real-World Applications & Case Studies: 500-700 words
  - Practical Implementation Guide: 400-500 words
  - Edge Cases, Limitations & Advanced Considerations: 300-400 words
  - Summary & Knowledge Integration: 300-400 words

RIGOR & SUBSTANCE:
✓ Write at university/graduate level - this is a professional textbook
✓ Use precise terminology; define specialized terms on first mention
✓ Build arguments logically: foundation → application → advanced
✓ Include quantifiable data, benchmarks, or performance metrics
✓ Reference specific frameworks, standards, or methodologies by name
✓ Discuss trade-offs, limitations, and when NOT to use certain approaches
✓ Address common misconceptions and professional pitfalls

RICHNESS - Diverse Content Types:
✓ Conceptual explanations (the "why")
✓ Technical procedures and step-by-step processes (the "how")
✓ 4-6 detailed, specific real-world case studies (not generic examples)
  - Include company names, specific metrics, actual outcomes
  - Explain what worked and why
  - Discuss lessons learned and transfer to new contexts
✓ Code examples, algorithms, or technical implementations
✓ Mathematical formulations, equations, or technical diagrams (in markdown)
✓ Industry best practices and professional standards
✓ Historical evolution and current trends
✓ Advanced techniques for practitioners going deeper

STRUCTURE & CLARITY:
✓ Use markdown hierarchy effectively (# ## ### for logical sections)
✓ Each major section should have 3-5 subsections
✓ Break dense text with bullet points, tables, and examples
✓ Use code fences for technical content
✓ Include visual descriptions or ASCII diagrams where helpful
✓ Every section must be substantive (150+ words minimum)
✓ Build complexity progressively

PROFESSIONAL TONE & VOICE:
✓ Write as a mentor and subject matter expert, not as an AI assistant
✓ Use "we" when discussing industry practice and established approaches
✓ Address reader directly: "You should understand...", "You'll notice..."
✓ Share practical insights from professional experience
✓ Use rhetorical questions to promote critical thinking
✓ Balance technical depth with clarity for intelligent readers

RESOURCES - Quality Over Quantity:
✓ Include 6-8 carefully curated learning resources
✓ Resources must be:
  - Recent and authoritative (published within last 7 years)
  - Directly relevant to this specific module content
  - From respected sources: academic papers, industry leaders, official docs
  - Diverse types: research articles, video tutorials, official documentation, books
  - With realistic, specific URLs (not placeholders)
✓ Each resource should extend understanding, not repeat content

QUALITY CHECKLIST - NO LAZY CONTENT:
✗ NO [example], [more content], or [details] placeholders
✗ NO content filler or padding to reach word count
✗ NO repetition of same concept across sections
✗ NO oversimplification of complex topics
✗ NO skipping the hard parts or controversial aspects
✗ NO generic "AI-like" writing
✓ Every paragraph adds distinct, irreplaceable value
✓ Examples are specific, detailed, and enlightening
✓ Explanations are thorough, not superficial
✓ Trade-offs and limitations are honestly addressed
✓ Advanced practitioners would find genuine value

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REQUIRED SECTIONS (In This Order)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. **Introduction & Context** (300-400 words)
   - Set the stage for why this module matters
   - Connect to previous knowledge and real-world relevance
   - Preview the journey through this chapter

2. **Foundational Concepts & Terminology** (600-800 words)
   - Define core terms with precision
   - Explain conceptual foundations
   - Establish shared vocabulary for remainder of chapter

3. **Core Theory & Principles** (800-1000 words)
   - Deep explanation of main concepts
   - Underlying logic and reasoning
   - How different elements relate
   - References to established frameworks or standards

4. **Advanced Deep Dive** (800-1000 words)
   - Extended exploration of complex aspects
   - Advanced techniques and methodologies
   - State-of-the-art developments
   - Emerging research or best practices

5. **Real-World Applications & Case Studies** (500-700 words)
   - 4-6 specific, detailed case studies with real outcomes
   - Include company names, metrics, timelines
   - Explain why it worked or what was learned
   - How to apply lessons to different contexts

6. **Practical Implementation Guide** (400-500 words)
   - Step-by-step procedures or workflows
   - Tools, frameworks, or methodologies to use
   - Code examples or technical implementations
   - Common pitfalls and mitigation strategies

7. **Edge Cases, Limitations & Advanced Considerations** (300-400 words)
   - When NOT to use this approach
   - Boundary conditions and exceptions
   - Limitations and trade-offs
   - Advanced nuances professionals should know

8. **Summary & Knowledge Integration** (300-400 words)
   - Synthesize key takeaways
   - How this module fits into the larger course
   - What to practice and how to deepen learning
   - Preview of next module connection

9. **Knowledge Check Quiz** (5-7 questions)
   - Multiple choice format
   - Include detailed explanations for each answer
   - Test both conceptual understanding and application

Return JSON matching this schema:
{
  "content": string (complete 3000+ word markdown lesson with all sections),
  "resources": [
    { "title": string, "url": string, "type": "article"|"video"|"paper"|"documentation"|"book" }
  ]
}

Remember: You are writing for intelligent, motivated learners pursuing professional mastery. Every word should count. Every example should illuminate. Write like the veteran expert you are.`;

      console.log(`${logPrefix}    Generating content (this may take 10-30 seconds)...`);
      const { result: moduleContent } = await classifyWithProviderFallback(
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
      translatedCourse = await translateCourse(params.locale, secondaryLocale, primaryCourse);
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
      model_used: `${outlineProvider}/auto-fallback`,
      success: true,
      execution_time: Date.now() - startedAt,
      metadata: {
        topic: params.topic,
        difficulty: params.difficulty,
        duration: params.duration,
        modules: generatedModules.length,
        course_id: course.id,
        provider_used: outlineProvider
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

    // Restore original console functions before returning
    console.log = originalLog;
    console.error = originalError;

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
    
    // Use classifyLLMError to get detailed error information
    const errorInfo = classifyLLMError(error);
    
    console.error(`${logPrefix} 📋 Error classification:`, {
      type: errorInfo.type,
      message: errorInfo.message,
      retryable: errorInfo.retryable,
      hasDetails: !!errorInfo.providerSpecific
    });
    console.error(`${logPrefix} 💬 Final error message:`, errorMessage);
    console.error('='.repeat(80));

    // Log failed attempt to database
    try {
      const db = getSupabaseServerClient();
      await db.from('ai_system_logs').insert({
        action_type: 'course_generation',
        model_used: 'multi-provider-fallback',
        success: false,
        execution_time: Date.now() - startedAt,
        metadata: {
          error_type: errorInfo.type,
          error_message: errorMessage,
          retryable: errorInfo.retryable
        }
      });
    } catch (logError) {
      console.error(`${logPrefix} ⚠️  Failed to log error to database:`, logError);
    }

    // Return detailed error with user-friendly message based on error type
    let userMessage = errorMessage;
    let statusCode = 500;
    
    switch (errorInfo.type) {
      case 'rate_limit':
        userMessage = '⏰ Rate limit exceeded. All AI providers are currently at capacity. Please try again in 5-10 minutes.';
        statusCode = 429;
        break;
      case 'auth':
        userMessage = '🔑 Authentication error. The AI service configuration is invalid. Please contact the administrator.';
        statusCode = 503;
        break;
      case 'timeout':
        userMessage = '⏱️ Request timeout. The AI service took too long to respond. Try a simpler course topic or try again later.';
        statusCode = 504;
        break;
      case 'network':
        userMessage = '🌐 Network error. Cannot reach AI services. Please check your connection and try again.';
        statusCode = 503;
        break;
      case 'config':
        userMessage = '⚙️ Configuration error. AI services are not properly configured. Please contact the administrator.';
        statusCode = 503;
        break;
      case 'validation':
        userMessage = '⚠️ AI response validation failed. The AI returned malformed data. This is usually temporary - please try again.';
        statusCode = 500;
        break;
      default:
        userMessage = `❌ ${errorMessage}`;
        statusCode = 500;
    }

    // Restore original console functions before returning
    console.log = originalLog;
    console.error = originalError;

    return NextResponse.json(
      {
        success: false,
        error: errorInfo.type,
        message: userMessage,
        details: errorMessage,
        hint: errorInfo.retryable 
          ? 'This error is usually temporary. Please try again in a few moments.' 
          : 'This error requires configuration changes. Please contact support.',
        debug: {
          serverLogs: capturedLogs,
          totalLogLines: capturedLogs.length,
          executionTimeMs: Date.now() - startedAt
        }
      },
      { status: statusCode }
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
  
  const { result } = await classifyWithProviderFallback(prompt, CourseTranslationSchema, JSON_SYSTEM_PROMPT);
  return result;
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
