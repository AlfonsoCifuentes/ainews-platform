/**
 * COURSE UPGRADE - Working APIs Version
 * 
 * Uses the unified cloud cascade with two rotating provider combinations:
 * - Combo A (groq_gemini_mistral): Groq + Gemini + Mistral
 * - Combo B (deepseek_openai_claude): DeepSeek + GPT-5.1 + Claude 4.5
 * 
 * This script processes modules conservatively to respect rate limits.
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';
import { createLLMClient, type ProviderCombination, type UnifiedLLMClient } from '../lib/ai/unified-llm-client';

// ============================================================================
// CONFIGURATION
// ============================================================================

const MODULES_PER_RUN = 3; // Process only 3 modules per run to respect limits
const DELAY_BETWEEN_MODULES = 5000; // 5 seconds delay between modules
const DRY_RUN = process.argv.includes('--dry-run');
const SKIP_CONFIRM = process.argv.includes('--yes');
const SPECIFIC_COURSE_ID = process.argv.find(arg => arg.startsWith('--course='))?.split('=')[1];
const DEFAULT_COMBINATION: ProviderCombination = 'groq_gemini_mistral';

// ============================================================================
// CLIENTS
// ============================================================================

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const VALID_COMBINATIONS: ProviderCombination[] = ['groq_gemini_mistral', 'deepseek_openai_claude'];

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

  if (missing.length > 0) {
    console.error('❌ Missing required API keys for combination %s:\n   - %s', combo, missing.join('\n   - '));
    process.exit(1);
  }
}

function resolveCombination(args: string[]): ProviderCombination {
  const cliValue = args.find(arg => arg.startsWith('--combo='))?.split('=')[1] as ProviderCombination | undefined;
  const envValue = process.env.LLM_COMBINATION as ProviderCombination | undefined;
  const candidate = cliValue || envValue;
  if (candidate && (VALID_COMBINATIONS as readonly string[]).includes(candidate)) {
    return candidate;
  }
  if (candidate && candidate.trim().length > 0) {
    console.warn(`⚠️ Unknown combination "${candidate}". Falling back to ${DEFAULT_COMBINATION}.`);
  }
  return DEFAULT_COMBINATION;
}

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
  topics: string[];
}

interface Module {
  id: string;
  course_id: string;
  title_en: string;
  title_es: string;
  content_en: string | null;
  content_es: string | null;
  order_index: number;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// AI CONTENT GENERATION
// ============================================================================

/**
 * Generate comprehensive content using the unified LLM cascade
 */
async function generateContent(
  module: Module,
  course: Course,
  locale: 'en' | 'es',
  llm: UnifiedLLMClient
): Promise<string> {
  console.log(`   🌐 [LLM] Generating ${locale.toUpperCase()} content...`);
  
  const title = locale === 'en' ? module.title_en : module.title_es;
  const lang = locale === 'en' ? 'English' : 'Spanish';
  const currentContent = locale === 'en' ? module.content_en : module.content_es;
  
  const prompt = `You are a world-class educational content writer. Create comprehensive textbook-quality content for this course module.

COURSE: ${course.title_en}
MODULE: ${title}
DIFFICULTY: ${course.difficulty}
LANGUAGE: Write everything in ${lang}

${currentContent ? `EXISTING CONTENT TO EXPAND (${currentContent.length} chars):
${currentContent.slice(0, 3000)}...` : 'No existing content - create from scratch.'}

Create EXTENSIVE content with ALL of the following sections:

# ${title}

## 1. Introduction & Context (400+ words)
Hook the reader with why this matters. Explain what they'll learn and why it's important in today's world.

## 2. Foundational Concepts & Terminology (600+ words)
Define all key terms. Build prerequisite knowledge. Use analogies that anyone can understand.

## 3. Core Theory & Principles (800+ words)
Deep explanations of the main concepts. Include diagrams descriptions [DIAGRAM: description].

## 4. Advanced Deep Dive (600+ words)
Complex topics, edge cases, expert-level insights.

## 5. Real-World Applications (500+ words)
How this is used in industry. Practical examples from real companies.

## 6. Practical Implementation (500+ words)
Step-by-step instructions. Code examples if relevant.

## 7. Common Pitfalls & Tips (400+ words)
What to avoid. Troubleshooting. Optimization tips.

## 8. Summary & Key Takeaways (300+ words)
Recap main points. Connect to broader learning journey.

---

## 📚 Case Study: [Real Company Example]
[Create a detailed 500+ word case study about a real or realistic company using these concepts]

---

## 🧠 Did You Know? (5 fascinating facts)
1. [Interesting fact about the topic]
2. [Interesting fact]
3. [Interesting fact]
4. [Interesting fact]
5. [Interesting fact]

---

## 📝 Exercises

### Exercise 1: Fill in the Blank
[Create 3 fill-in-the-blank questions]

### Exercise 2: Multiple Choice
[Create 3 multiple choice questions with 4 options each]

### Exercise 3: Short Answer
[Create 2 short answer questions]

---

IMPORTANT:
- Write at least 5000 words total
- Use clear markdown formatting
- Make it engaging and accessible
- Include [IMAGE: description] placeholders for visual concepts
- Be technically accurate but beginner-friendly`;

  const result = await llm.generateText({
    prompt,
    systemPrompt: 'You are a world-class educational content writer. Respond in Markdown only.',
    maxTokens: 7500,
    temperature: 0.7,
  });

  if (!result.success || !result.text) {
    throw new Error(result.error || 'LLM returned empty content');
  }

  console.log(`   ✓ Generated ${result.text.length} chars via ${result.provider} (${result.model})`);
  return result.text;
}

/**
 * Translate content using the active LLM combination
 */
async function translateContent(
  content: string,
  sourceLang: 'en' | 'es',
  targetLang: 'en' | 'es',
  llm: UnifiedLLMClient
): Promise<string> {
  console.log(`   🌀 [LLM] Translating to ${targetLang.toUpperCase()}...`);
  
  const sourceName = sourceLang === 'en' ? 'English' : 'Spanish';
  const targetName = targetLang === 'en' ? 'English' : 'Spanish';
  
  const prompt = `Translate this educational content from ${sourceName} to ${targetName}. 
Maintain all markdown formatting, section headers, and technical accuracy.
Do NOT add any commentary - just output the translated content.

CONTENT TO TRANSLATE:
${content}`;

  const result = await llm.generateText({
    prompt,
    systemPrompt: 'You are a meticulous translator that preserves markdown structure and technical accuracy.',
    maxTokens: 6000,
    temperature: 0.25,
  });

  if (!result.success || !result.text) {
    console.log(`   ⚠️ Translation failed via ${result.provider}: ${result.error}`);
    return content;
  }

  console.log(`   ✓ Translated ${result.text.length} chars via ${result.provider}`);
  return result.text;
}

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

async function fetchCourses(): Promise<Course[]> {
  const query = supabase
    .from('courses')
    .select('*')
    .order('created_at', { ascending: true });
  
  if (SPECIFIC_COURSE_ID) {
    query.eq('id', SPECIFIC_COURSE_ID);
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  return data || [];
}

async function fetchModules(courseId: string): Promise<Module[]> {
  const { data, error } = await supabase
    .from('course_modules')
    .select('*')
    .eq('course_id', courseId)
    .order('order_index', { ascending: true });
  
  if (error) throw error;
  return data || [];
}

async function updateModule(moduleId: string, content_en: string, content_es: string): Promise<void> {
  if (DRY_RUN) {
    console.log(`   [DRY RUN] Would update module ${moduleId}`);
    return;
  }
  
  const { error } = await supabase
    .from('course_modules')
    .update({
      content_en,
      content_es,
      updated_at: new Date().toISOString(),
    })
    .eq('id', moduleId);
  
  if (error) throw error;
}

// ============================================================================
// MAIN UPGRADE FUNCTION
// ============================================================================

async function upgradeModule(module: Module, course: Course, llm: UnifiedLLMClient): Promise<boolean> {
  try {
    // Step 1: Generate English content
    const content_en = await generateContent(module, course, 'en', llm);
    
    await sleep(2000); // Small delay between API calls
    
    // Step 2: Translate to Spanish (or generate directly)
    let content_es: string;
    if (content_en.length > 2000) {
      // If we got good English content, translate it
      content_es = await translateContent(content_en, 'en', 'es', llm);
    } else {
      // Generate Spanish directly if English was too short
      content_es = await generateContent(module, course, 'es', llm);
    }
    
    // Step 3: Update database
    await updateModule(module.id, content_en, content_es);
    
    console.log(`   ✅ Module upgraded successfully!`);
    console.log(`      EN: ${content_en.length} chars | ES: ${content_es.length} chars`);
    
    return true;
  } catch (error: any) {
    console.log(`   ❌ Failed: ${error.message}`);
    return false;
  }
}

// ============================================================================
// MAIN SCRIPT
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const combination = resolveCombination(args);
  validateCombinationEnv(combination);
  const llm = createLLMClient(combination);

  console.log(`
${'═'.repeat(72)}
🚀 COURSE UPGRADE - Working APIs Edition
${'═'.repeat(72)}

Configuration:
  📊 Modules per run: ${MODULES_PER_RUN}
  ⏱️ Delay between modules: ${DELAY_BETWEEN_MODULES}ms
  🔄 Dry run: ${DRY_RUN ? 'YES' : 'NO'}
  ${SPECIFIC_COURSE_ID ? `📚 Specific course: ${SPECIFIC_COURSE_ID}` : '📚 All courses'}

Provider combinations:
  🅰️ groq_gemini_mistral → Groq (text) + Gemini (structured) + Mistral (translations)
  🅱️ deepseek_openai_claude → DeepSeek (analysis) + GPT-5.1 (content) + Claude 4.5 (review)

Current run uses: ${combination}
`);
  console.log('✅ Required API keys present\n');

  // Fetch courses
  console.log('🔍 Fetching courses from database...');
  const courses = await fetchCourses();
  console.log(`✅ Found ${courses.length} course(s)\n`);

  // Build list of all modules
  const allModules: { module: Module; course: Course }[] = [];
  
  for (const course of courses) {
    const modules = await fetchModules(course.id);
    for (const module of modules) {
      allModules.push({ module, course });
    }
  }
  
  console.log(`📚 Total modules: ${allModules.length}`);
  console.log(`🎯 Will process: ${Math.min(MODULES_PER_RUN, allModules.length)} modules this run\n`);

  if (!SKIP_CONFIRM && !DRY_RUN) {
    console.log('⚠️ This will modify your database. Use --dry-run to preview or --yes to skip confirmation.');
    console.log('Press Ctrl+C to cancel...\n');
    await sleep(5000);
  }

  // Process modules
  let processed = 0;
  let successful = 0;
  let failed = 0;

  for (const { module, course } of allModules) {
    if (processed >= MODULES_PER_RUN) {
      console.log(`\n⏹️ Reached limit of ${MODULES_PER_RUN} modules per run.`);
      break;
    }
    
    processed++;
    
    console.log(`${'─'.repeat(60)}`);
    console.log(`📖 Module ${processed}/${Math.min(MODULES_PER_RUN, allModules.length)}: ${module.title_en}`);
    console.log(`   Course: ${course.title_en}`);
    console.log(`   Current: EN=${module.content_en?.length || 0} chars, ES=${module.content_es?.length || 0} chars`);
    console.log(`${'─'.repeat(60)}`);
    
    const success = await upgradeModule(module, course, llm);
    
    if (success) {
      successful++;
    } else {
      failed++;
    }
    
    // Delay between modules
    if (processed < MODULES_PER_RUN) {
      console.log(`   ⏳ Waiting ${DELAY_BETWEEN_MODULES / 1000}s before next module...`);
      await sleep(DELAY_BETWEEN_MODULES);
    }
  }

  // Summary
  console.log(`
${'═'.repeat(72)}
📊 UPGRADE SUMMARY
${'═'.repeat(72)}

Processed: ${processed} modules
✅ Successful: ${successful}
❌ Failed: ${failed}
📋 Remaining: ${allModules.length - processed}

${allModules.length - processed > 0 
  ? `💡 Run this script again to process more modules.` 
  : `🎉 All modules processed!`}
`);
}

main().catch(console.error);
