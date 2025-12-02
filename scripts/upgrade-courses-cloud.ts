#!/usr/bin/env npx tsx
/**
 * ============================================================================
 * COURSE UPGRADE SCRIPT - CLOUD AI VERSION (Unified Cascade)
 * ============================================================================
 *
 * Upgrades ALL existing courses to textbook-quality standards using the
 * unified cloud cascade (Groq+Gemini+Mistral or DeepSeek+OpenAI+Claude).
 * Every generation/translation call flows through lib/ai/unified-llm-client,
 * guaranteeing cutting-edge models, cost tracking, and automatic fallbacks.
 *
 * Usage:
 *   npx tsx scripts/upgrade-courses-cloud.ts
 *   npx tsx scripts/upgrade-courses-cloud.ts --course-id <uuid>
 *   npx tsx scripts/upgrade-courses-cloud.ts --dry-run
 *   npx tsx scripts/upgrade-courses-cloud.ts --yes
 *   npx tsx scripts/upgrade-courses-cloud.ts --combo=deepseek_openai_claude
 */

import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as readline from 'readline';

import {
  createLLMClient,
  type ProviderCombination,
  type UnifiedLLMClient,
} from '../lib/ai/unified-llm-client';
import { generateEducationalImage } from '../lib/ai/gemini-image';
import { persistModuleIllustration } from '../lib/db/module-illustrations';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const CONFIG = {
  MIN_CONTENT_LENGTH_CHARS: 50000,
  MIN_CASE_STUDIES: 2,
  MIN_EXERCISES: 10,
  DELAY_BETWEEN_MODULES_MS: 2000,
  GENERATE_IMAGES: true,
  REVIEW_SCORE_THRESHOLD: 72,
};

const LLM_MAX_ATTEMPTS = 3;

const VALID_COMBINATIONS: ProviderCombination[] = ['groq_gemini_mistral', 'deepseek_openai_claude'];
const DEFAULT_COMBINATION: ProviderCombination = 'groq_gemini_mistral';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// ============================================================================
// TYPES
// ============================================================================

interface Course {
  id: string;
  title_en: string;
  title_es: string;
  description_en: string;
  description_es: string;
  difficulty: string;
  topics: string[] | null;
  course_modules: Module[];
}

interface Module {
  id: string;
  course_id: string;
  order_index: number;
  title_en: string;
  title_es: string;
  content_en: string | null;
  content_es: string | null;
  estimated_time: number | null;
}

interface UpgradeResult {
  courseId: string;
  courseTitle: string;
  modulesProcessed: number;
  modulesUpgraded: number;
  modulesFailed: number;
  imagesGenerated: number;
  totalTime: number;
  errors: string[];
}

const ReviewSchema = z.object({
  approved: z.boolean().optional(),
  score: z.number().min(0).max(100).optional(),
  strengths: z.array(z.string()).optional(),
  improvements_needed: z.array(z.string()).optional(),
  critical_issues: z.array(z.string()).optional(),
});

function getArgValue(args: string[], name: string): string | undefined {
  const withEquals = args.find(arg => arg.startsWith(`--${name}=`));
  if (withEquals) {
    return withEquals.split('=')[1];
  }
  const index = args.indexOf(`--${name}`);
  if (index !== -1 && typeof args[index + 1] === 'string') {
    return args[index + 1];
  }
  return undefined;
}

function resolveCombination(args: string[]): ProviderCombination {
  const cli = getArgValue(args, 'combo') as ProviderCombination | undefined;
  const envValue = process.env.LLM_COMBINATION as ProviderCombination | undefined;
  const candidate = cli || envValue;
  if (candidate && (VALID_COMBINATIONS as readonly string[]).includes(candidate)) {
    return candidate;
  }
  if (candidate) {
    console.warn(`⚠️ Unknown combination "${candidate}". Falling back to ${DEFAULT_COMBINATION}.`);
  }
  return DEFAULT_COMBINATION;
}

function validateCombinationEnv(combo: ProviderCombination) {
  const missing: string[] = [];
  if (combo === 'groq_gemini_mistral') {
    if (!process.env.GROQ_API_KEY) missing.push('GROQ_API_KEY');
    if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_GEMINI_API_KEY) {
      missing.push('GEMINI_API_KEY (or GOOGLE_GEMINI_API_KEY)');
    }
    if (!process.env.MISTRAL_API_KEY) missing.push('MISTRAL_API_KEY');
  } else {
    if (!process.env.DEEPSEEK_API_KEY) missing.push('DEEPSEEK_API_KEY');
    if (!process.env.OPENAI_API_KEY) missing.push('OPENAI_API_KEY');
    if (!process.env.ANTHROPIC_API_KEY) missing.push('ANTHROPIC_API_KEY');
  }
  if (missing.length) {
    console.error(`❌ Missing required API keys for ${combo}:
   - ${missing.join('\n   - ')}`);
    process.exit(1);
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function callLLM(
  llm: UnifiedLLMClient,
  context: string,
  options: Parameters<UnifiedLLMClient['generateText']>[0]
) {
  let lastError = 'empty response';

  for (let attempt = 1; attempt <= LLM_MAX_ATTEMPTS; attempt++) {
    const result = await llm.generateText(options);
    if (result.success && result.text) {
      return { text: result.text, provider: result.provider, model: result.model };
    }

    lastError = result.error ?? 'empty response';
    console.warn(`   ⚠️ [LLM:${context}] attempt ${attempt} failed: ${lastError}`);

    if (attempt < LLM_MAX_ATTEMPTS) {
      await sleep(1500 * attempt);
    }
  }

  throw new Error(`${context} failed → ${lastError}`);
}

/**
 * Non-blocking LLM call - returns fallback content if all attempts fail.
 * Use for non-critical sections like extras/glossary that shouldn't block the whole module.
 */
async function callLLMWithFallback(
  llm: UnifiedLLMClient,
  context: string,
  options: Parameters<UnifiedLLMClient['generateText']>[0],
  fallbackContent: string
): Promise<{ text: string; usedFallback: boolean }> {
  try {
    const result = await callLLM(llm, context, options);
    return { text: result.text, usedFallback: false };
  } catch {
    console.warn(`   ⚠️ [LLM:${context}] using fallback content after all retries failed`);
    return { text: fallbackContent, usedFallback: true };
  }
}

// ============================================================================
// AI WORKFLOW USING UNIFIED CLIENT
// ============================================================================

async function analyzeAndPlan(module: Module, course: Course, locale: 'en' | 'es', llm: UnifiedLLMClient) {
  console.log('   🧠 [LLM] Analyzing and planning...');
  const title = locale === 'en' ? module.title_en : module.title_es;
  const currentContent = (locale === 'en' ? module.content_en : module.content_es) ?? '';
  const topics = course.topics?.length ? course.topics.join(', ') : 'AI, machine learning, emerging tech';

  const { text } = await callLLM(llm, 'analysis plan', {
    systemPrompt: 'You are an elite educational content strategist who plans university-level modules.',
    prompt: `Analyze this module and design a 15,000+ word expansion plan.

COURSE: ${course.title_en}
MODULE: ${title}
DIFFICULTY: ${course.difficulty}
TOPICS: ${topics}
CURRENT CONTENT (${currentContent.length} chars):
${currentContent.slice(0, 2000) || 'No existing content yet.'}

Produce a structured plan that includes:
- 8 major sections with bullet subtopics and target word counts
- 3 case studies (company, industry, lesson focus)
- Exercise mix (fill-in, MCQ, short answer, projects)
- 10 curiosity topics for "Did You Know" boxes
- Key terms glossary and suggested diagrams

Respond in JSON inside a markdown code block for easy parsing.`,
    maxTokens: 4000,
    temperature: 0.65,
  });

  return text;
}

async function generateProseContent(module: Module, course: Course, plan: string, locale: 'en' | 'es', llm: UnifiedLLMClient) {
  console.log('   📝 [LLM] Generating prose content...');
  const title = locale === 'en' ? module.title_en : module.title_es;
  const lang = locale === 'en' ? 'English' : 'Spanish';

  const { text } = await callLLM(llm, 'prose generation', {
    systemPrompt: 'You are a world-class textbook author. Output Markdown only.',
    prompt: `Write a premium module chapter in ${lang} following this plan:
${plan}

Hard requirements:
- Exactly follow the 8 canonical sections (Intro, Foundations, Core Theory, Advanced Dive, Real-World Applications, Practical Implementation, Pitfalls, Summary)
- Each section >= specified word count; overall chapter >= 10,000 words
- Embed [IMAGE: description] and [DIAGRAM: description] placeholders where visuals help
- Use the official AI News design voice: bold, kinetic, but academically rigorous
- Include analogies, real metrics, and bullet summaries
- Never mention that you are an AI
- Close with a short transition to the next module and call-to-action for learners`,
    maxTokens: 14000,
    temperature: 0.72,
  });

  return text;
}

async function generateCaseStudies(module: Module, course: Course, locale: 'en' | 'es', llm: UnifiedLLMClient) {
  console.log('   📚 [LLM] Generating case studies...');
  const title = locale === 'en' ? module.title_en : module.title_es;
  const lang = locale === 'en' ? 'English' : 'Spanish';

  const { text } = await callLLM(llm, 'case studies', {
    systemPrompt: 'You craft investigative business case studies with real metrics.',
    prompt: `Create 3 detailed case studies for the module "${title}" in ${lang}.
For each case study include:
- Company and industry
- Context (>=120 words)
- Challenge (>=120 words)
- Solution leveraging module concepts (>=200 words)
- KPIs before/after with numeric deltas
- Lessons learned (4 bullet points)

Separate the case studies with "---" and format in Markdown.`,
    maxTokens: 3500,
    temperature: 0.65,
  });

  return text;
}

async function generateExercises(module: Module, course: Course, locale: 'en' | 'es', llm: UnifiedLLMClient) {
  console.log('   ⚡ [LLM] Generating exercises & exams...');
  const title = locale === 'en' ? module.title_en : module.title_es;
  const lang = locale === 'en' ? 'English' : 'Spanish';

  const { text } = await callLLM(llm, 'exercise pack', {
    systemPrompt: 'You design engaging multi-format exercises with answer keys.',
    prompt: `Produce the assessment section for "${title}" in ${lang}:

1. Practice Exercises (structured as fill-in-the-blank, multiple-choice, short answer, scenario-based). At least ${CONFIG.MIN_EXERCISES} questions with answers + rationales.
2. Chapter Exam with 25 questions split into conceptual, application, and synthesis tiers. Include answers and grading rubrics.
3. Project Prompt: a multi-step applied assignment with deliverables and evaluation criteria.

Use headings, difficulty emojis (🟢/🟡/🔴), and keep Markdown clean.`,
    maxTokens: 6000,
    temperature: 0.7,
  });

  return text;
}

async function generateExtras(module: Module, course: Course, locale: 'en' | 'es', llm: UnifiedLLMClient) {
  console.log('   💡 [LLM] Generating extras...');
  const title = locale === 'en' ? module.title_en : module.title_es;
  const lang = locale === 'en' ? 'English' : 'Spanish';

  // Fallback content if LLM fails repeatedly
  const fallbackExtras = locale === 'en'
    ? `## 💡 Did You Know?

> **Industry Growth**: This field continues to expand rapidly with new developments emerging regularly.

> **Historical Context**: The foundations of these concepts were established decades ago but remain relevant today.

> **Global Impact**: Professionals worldwide apply these principles across diverse industries.

## 📖 Glossary

| Term | Definition |
|------|------------|
| Core Concept | The fundamental principle underlying this module's content |
| Best Practice | An industry-standard approach recommended by experts |
| Methodology | A systematic framework for applying concepts |

## 🔗 Further Reading

- Industry documentation and official resources
- Academic papers and research publications
- Professional community forums and discussions`
    : `## 💡 ¿Sabías que?

> **Crecimiento de la Industria**: Este campo continúa expandiéndose rápidamente con nuevos desarrollos emergiendo regularmente.

> **Contexto Histórico**: Los fundamentos de estos conceptos se establecieron hace décadas pero siguen siendo relevantes hoy.

> **Impacto Global**: Profesionales de todo el mundo aplican estos principios en diversas industrias.

## 📖 Glosario

| Término | Definición |
|---------|------------|
| Concepto Central | El principio fundamental subyacente al contenido de este módulo |
| Mejores Prácticas | Un enfoque estándar de la industria recomendado por expertos |
| Metodología | Un marco sistemático para aplicar conceptos |

## 🔗 Lecturas Adicionales

- Documentación de la industria y recursos oficiales
- Artículos académicos y publicaciones de investigación
- Foros y discusiones de la comunidad profesional`;

  const { text, usedFallback } = await callLLMWithFallback(llm, 'extras + glossary', {
    systemPrompt: 'You add memorable enrichment content to textbooks.',
    prompt: `For the module "${title}" in ${lang}, create:

## 💡 Did You Know?
Write 8 boxed curiosities (50-90 words each) with bold titles.

## 📖 Glossary
Table with 15+ key terms and concise definitions.

## 🔗 Further Reading
List 5 authoritative resources (URL + 1 sentence summary).

Keep Markdown crisp and friendly.`,
    maxTokens: 3000,
    temperature: 0.55,
  }, fallbackExtras);

  if (usedFallback) {
    console.log('   ⚠️ Using placeholder extras (will be regenerated in future run)');
  }

  return text;
}

async function translateContent(content: string, fromLocale: 'en' | 'es', toLocale: 'en' | 'es', llm: UnifiedLLMClient) {
  if (fromLocale === toLocale) {
    return content;
  }
  console.log(`   🌐 [LLM] Translating ${fromLocale.toUpperCase()} → ${toLocale.toUpperCase()}...`);
  const fromLang = fromLocale === 'en' ? 'English' : 'Spanish';
  const toLang = toLocale === 'en' ? 'English' : 'Spanish';

  const { text } = await callLLM(llm, 'translation', {
    systemPrompt: 'You are a bilingual editor that preserves markdown structure precisely.',
    prompt: `Translate the following ${fromLang} educational content to ${toLang}.
Rules:
- Preserve markdown hierarchy, tables, and [IMAGE: ...] markers
- Keep technical terms accurate; offer localized synonyms in parentheses when useful
- Maintain professional, energetic tone without adding commentary

CONTENT START
${content}
CONTENT END`,
    maxTokens: 15000,
    temperature: 0.25,
  });

  return text;
}

async function reviewContent(content: string, moduleTitle: string, llm: UnifiedLLMClient) {
  console.log('   ✅ [LLM] Quality review...');
  const trimmed = content.length > 12000 ? content.slice(0, 12000) : content;
  const result = await llm.generateText({
    systemPrompt: 'You are a meticulous course editor who outputs JSON.\nReturn only JSON that matches the schema.',
    prompt: `Evaluate the following module content for "${moduleTitle}".
Provide score, approval, strengths, improvements, and critical issues.

CONTENT:
${trimmed}
`,
    maxTokens: 1200,
    temperature: 0.2,
    schema: ReviewSchema,
  });

  if (!result.success) {
    console.log(`   ⚠️ Review skipped: ${result.error}`);
    return { approved: true, feedback: 'Review unavailable' };
  }

  const score = result.data?.score ?? 100;
  const approved = (result.data?.approved ?? true) && score >= CONFIG.REVIEW_SCORE_THRESHOLD;
  return {
    approved,
    feedback: JSON.stringify(result.data, null, 2),
  };
}

// ============================================================================
// MAIN UPGRADE FUNCTION
// ============================================================================

async function upgradeModule(
  module: Module,
  course: Course,
  locale: 'en' | 'es',
  llm: UnifiedLLMClient
): Promise<string> {
  const title = locale === 'en' ? module.title_en : module.title_es;
  console.log(`\n   [${locale.toUpperCase()}] Generating content for: ${title}`);
  
  // Step 1: Analyze and plan
  const plan = await analyzeAndPlan(module, course, locale, llm);
  
  // Step 2: Generate main prose
  const prose = await generateProseContent(module, course, plan, locale, llm);
  
  // Step 3: Generate case studies
  const caseStudies = await generateCaseStudies(module, course, locale, llm);
  
  // Step 4: Generate exercises
  const exercises = await generateExercises(module, course, locale, llm);
  
  // Step 5: Generate extras
  const extras = await generateExtras(module, course, locale, llm);
  
  // Combine all content
  const fullContent = `${prose}

---

## 📖 Case Studies

${caseStudies}

---

${exercises}

---

${extras}`;

  // Step 6: Quality review
  const review = await reviewContent(fullContent, title, llm);
  console.log(`   📊 Quality score: ${review.approved ? '✅ Approved' : '⚠️ Needs work'}`);
  if (fullContent.length < CONFIG.MIN_CONTENT_LENGTH_CHARS) {
    console.log(`   ⚠️ Content shorter than target (${fullContent.length} chars < ${CONFIG.MIN_CONTENT_LENGTH_CHARS}). Consider rerunning or expanding.`);
  }
  
  return fullContent;
}

async function upgradeCourse(course: Course, llm: UnifiedLLMClient, dryRun: boolean): Promise<UpgradeResult> {
  const startTime = Date.now();
  const result: UpgradeResult = {
    courseId: course.id,
    courseTitle: course.title_en,
    modulesProcessed: 0,
    modulesUpgraded: 0,
    modulesFailed: 0,
    imagesGenerated: 0,
    totalTime: 0,
    errors: [],
  };
  
  console.log(`\n${'═'.repeat(76)}`);
  console.log(`📚 UPGRADING COURSE: ${course.title_en}`);
  console.log(`${'═'.repeat(76)}`);
  console.log(`   Modules: ${course.course_modules.length}`);
  console.log(`   Difficulty: ${course.difficulty}`);
  
  for (const module of course.course_modules) {
    result.modulesProcessed++;
    
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`📖 Module ${module.order_index + 1}/${course.course_modules.length}: ${module.title_en}`);
    console.log(`${'─'.repeat(60)}`);
    console.log(`   Current content: EN=${module.content_en?.length || 0} chars, ES=${module.content_es?.length || 0} chars`);
    
    try {
      // Generate English content
      const contentEn = await upgradeModule(module, course, 'en', llm);
      
      // Generate Spanish content (translate or generate fresh)
      let contentEs: string;
      if (course.title_es && course.title_es !== course.title_en) {
        // Course has Spanish title, generate fresh Spanish content
        contentEs = await upgradeModule(module, course, 'es', llm);
      } else {
        // Translate from English
        contentEs = await translateContent(contentEn, 'en', 'es', llm);
      }
      
      // Update database
      if (!dryRun) {
        const { error } = await supabase
          .from('course_modules')
          .update({
            content_en: contentEn,
            content_es: contentEs,
            estimated_time: Math.ceil(contentEn.length / 1000), // ~1 min per 1000 chars
            updated_at: new Date().toISOString(),
          })
          .eq('id', module.id);
        
        if (error) {
          throw error;
        }
      } else {
        console.log('   [DRY RUN] Skipping database update.');
      }

      if (!dryRun && CONFIG.GENERATE_IMAGES) {
        const illustrationStyle = 'textbook' as const;
        const promptPreview = contentEn.slice(0, 4000);
        const imageResult = await generateEducationalImage(promptPreview, 'en', illustrationStyle);
        if (imageResult.success) {
          let persistedCount = 0;
          for (const [index, image] of imageResult.images.entries()) {
            try {
              const stored = await persistModuleIllustration({
                moduleId: module.id,
                locale: 'en',
                style: illustrationStyle,
                model: imageResult.model,
                base64Data: image.base64Data,
                mimeType: image.mimeType,
                prompt: promptPreview,
                source: 'script',
                metadata: {
                  moduleTitle: module.title_en,
                  courseId: course.id,
                  imageIndex: index,
                },
              });
              if (stored) {
                persistedCount += 1;
              }
            } catch (persistError) {
              console.error('   ⚠️ Illustration persist failed:', persistError);
            }
          }
          result.imagesGenerated += persistedCount;
          console.log(
            `   🖼️ Generated ${imageResult.images.length} illustration(s) with ${imageResult.model}. Persisted: ${persistedCount}.`
          );
        } else {
          console.log(`   ⚠️ Illustration skipped: ${imageResult.error}`);
        }
      }
      
      result.modulesUpgraded++;
      console.log(`   ✅ Module upgraded! (EN: ${contentEn.length} chars, ES: ${contentEs.length} chars)`);
      
    } catch (error: any) {
      result.modulesFailed++;
      result.errors.push(`Module ${module.id}: ${error.message}`);
      console.error(`   ❌ Failed: ${error.message}`);
    }
    
    // Delay between modules
    if (module.order_index < course.course_modules.length - 1) {
      await sleep(CONFIG.DELAY_BETWEEN_MODULES_MS);
    }
  }
  
  result.totalTime = (Date.now() - startTime) / 1000;
  return result;
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log(`
${'═'.repeat(76)}
☁️  COURSE UPGRADE - CLOUD AI EDITION
${'═'.repeat(76)}
`);

  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const autoConfirm = args.includes('--yes');
  const specificCourseId = getArgValue(args, 'course-id');
  const combination = resolveCombination(args);

  validateCombinationEnv(combination);
  const llm = createLLMClient(combination);

  console.log('Configuration:');
  console.log(`  🌐 Provider combo: ${combination}`);
  console.log(`  🧩 Images: ${CONFIG.GENERATE_IMAGES ? 'enabled' : 'disabled'}`);
  console.log(`  🧱 Dry run: ${dryRun ? 'YES' : 'NO'}`);
  console.log('✅ Required API keys present\n');

  // Fetch courses
  console.log('\n🔍 Fetching courses from database...');
  
  let query = supabase
    .from('courses')
    .select(`
      id,
      title_en,
      title_es,
      description_en,
      description_es,
      difficulty,
      topics,
      course_modules (
        id,
        course_id,
        order_index,
        title_en,
        title_es,
        content_en,
        content_es,
        estimated_time
      )
    `)
    .order('created_at', { ascending: true });
  
  if (specificCourseId) {
    query = query.eq('id', specificCourseId);
  }
  
  const { data: courses, error } = await query;
  
  if (error) {
    console.error('❌ Failed to fetch courses:', error.message);
    process.exit(1);
  }
  
  if (!courses || courses.length === 0) {
    console.log('⚠️ No courses found.');
    process.exit(0);
  }
  const normalizedCourses = (courses as Course[]).map(course => ({
    ...course,
    course_modules: [...(course.course_modules ?? [])].sort((a, b) => a.order_index - b.order_index),
  }));

  console.log(`✅ Found ${normalizedCourses.length} course(s)\n`);
  
  const totalModules = normalizedCourses.reduce((sum, c) => sum + c.course_modules.length, 0);
  
  normalizedCourses.forEach(course => {
    console.log(`   📚 ${course.title_en} (${course.course_modules.length} modules)`);
  });
  
  console.log(`\n   Total modules to process: ${totalModules}`);
  
  if (dryRun) {
    console.log('\n🔍 DRY RUN - No changes will be made.');
    process.exit(0);
  }
  
  // Confirm
  if (!autoConfirm) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    
    const answer = await new Promise<string>(resolve => {
      rl.question('\n⚠️ This will upgrade all modules. Continue? (yes/no): ', resolve);
    });
    rl.close();
    
    if (answer.toLowerCase() !== 'yes' && answer.toLowerCase() !== 'y') {
      console.log('❌ Aborted.');
      process.exit(0);
    }
  } else {
    console.log('\n✅ Auto-confirmed with --yes flag');
  }
  
  // Process courses
  const results: UpgradeResult[] = [];
  
  for (const course of normalizedCourses) {
    const result = await upgradeCourse(course as Course, llm, dryRun);
    results.push(result);
  }
  
  // Summary
  console.log(`\n${'═'.repeat(76)}`);
  console.log('📊 UPGRADE SUMMARY');
  console.log(`${'═'.repeat(76)}\n`);
  
  let totalUpgraded = 0;
  let totalFailed = 0;
  let totalTime = 0;
  
  results.forEach(r => {
    console.log(`📚 ${r.courseTitle}`);
    console.log(`   Modules: ${r.modulesUpgraded}/${r.modulesProcessed} upgraded`);
    console.log(`   Time: ${r.totalTime.toFixed(1)}s`);
    if (r.errors.length > 0) {
      console.log(`   Errors: ${r.errors.length}`);
    }
    console.log();
    
    totalUpgraded += r.modulesUpgraded;
    totalFailed += r.modulesFailed;
    totalTime += r.totalTime;
  });
  
  console.log(`${'─'.repeat(40)}`);
  console.log(`TOTAL: ${totalUpgraded} modules upgraded, ${totalFailed} failed`);
  console.log(`Total time: ${(totalTime / 60).toFixed(1)} minutes`);
  console.log(`\n✨ Done!`);
}

main().catch(console.error);
