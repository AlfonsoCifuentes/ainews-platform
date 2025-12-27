/**
 * TEXTBOOK-QUALITY COURSE GENERATOR
 * 
 * Generates university-level course content that matches or exceeds
 * the depth and quality of professional textbooks.
 * 
 * Key features:
 * - 20x more content than basic generators (15,000+ words per module)
 * - Structured like university textbook chapters
 * - Includes exercises, case studies, "Did you know?" boxes
 * - Multi-pass generation for maximum depth
 * - Support for educational illustrations (Nano Banana Pro)
 * 
 * Model Strategy:
 * - DeepSeek R1 70B: Outline planning, exercise generation, reasoning validation
 * - Qwen2.5 72B: Main prose content, case studies, translations (polished output)
 * - Fallback to cloud providers if local models unavailable
 */

import { z } from 'zod';
import { 
  selectModelForTask, 
  executeWithModel,
  cleanDeepSeekOutput,
  type TaskType 
} from './model-strategy';
import { sanitizeAndFixJSON, parseJSON } from '@/lib/utils/json-fixer';
import { buildVerticalVoiceSystemPrompt } from './prompt-voice';

const JSON_SYSTEM_PROMPT = `You are a world-class university professor and textbook author with 30+ years of experience. You write comprehensive, engaging educational content that rivals the best academic publishers (O'Reilly, Springer, Cambridge University Press).

Your writing style:
- Authoritative but accessible
- Rich with examples and case studies
- Progressive complexity (foundation → advanced)
- Includes "Did You Know?" curiosity boxes
- Contains practical exercises with solutions
- References current research and industry practices

Editorial layout (magazine-style, mandatory for any markdown content fields):
- Avoid walls of text: never write more than 3 plain paragraphs in a row; break the flow with widgets.
- Use Z-scan formatting: bold key concepts sparingly so the reader can scan.
- Use pull quotes as blockquotes with a headline: > ## "..." and an optional attribution line like: > *— Context*.
- Use sidebar boxes as ONE-CELL markdown tables, e.g.:
  | 💡 TECH INSIGHT: TITLE |
  | :--- |
  | Body text... |
- Code fences must always specify the language (e.g., python, ts, etc.).
- Image placements (conceptual) can be suggested inline as: ![DISEÑO: ...].

CRITICAL: Do not output Mermaid, ASCII diagrams, or diagram code blocks. Any diagrams must be described and paired with illustration prompts for generated images.

CRITICAL: Return only valid JSON matching the provided schema. No markdown fences, no commentary.`;

// ============================================================================
// SCHEMAS
// ============================================================================

const TextbookChapterOutlineSchema = z.object({
  chapter_title: z.string(),
  learning_objectives: z.array(z.string()).min(5),
  prerequisite_knowledge: z.array(z.string()),
  sections: z.array(z.object({
    section_number: z.string(), // e.g., "1.1", "1.2.3"
    title: z.string(),
    description: z.string(),
    estimated_words: z.number(),
    content_type: z.enum(['theory', 'practical', 'case_study', 'exercise', 'summary']),
    subsections: z.array(z.object({
      title: z.string(),
      key_concepts: z.array(z.string())
    })).optional()
  })).min(8),
  chapter_summary_points: z.array(z.string()).min(5),
  suggested_reading: z.array(z.object({
    title: z.string(),
    author: z.string(),
    type: z.enum(['book', 'paper', 'article', 'documentation'])
  })).min(3)
});

const TextbookSectionContentSchema = z.object({
  content: z.string().min(1500).describe('Rich markdown content for this section (1500+ words)'),
  key_terms: z.array(z.object({
    term: z.string(),
    definition: z.string()
  })).optional(),
  did_you_know: z.object({
    title: z.string(),
    content: z.string(),
    illustration_prompt: z.string().optional()
  }).optional(),
  code_examples: z.array(z.object({
    language: z.string(),
    description: z.string(),
    code: z.string()
  })).optional(),
  diagrams: z.array(z.object({
    type: z.enum(['flowchart', 'sequence', 'architecture', 'comparison', 'timeline']),
    title: z.string(),
    description: z.string(),
    illustration_prompt: z.string()
  })).optional()
});

const ExerciseSetSchema = z.object({
  exercises: z.array(z.object({
    id: z.string(),
    type: z.enum(['multiple_choice', 'fill_blank', 'short_answer', 'coding', 'essay', 'case_analysis']),
    difficulty: z.enum(['basic', 'intermediate', 'advanced', 'challenge']),
    question: z.string(),
    context: z.string().optional(),
    options: z.array(z.string()).optional(), // for multiple choice
    hints: z.array(z.string()).optional(),
    solution: z.string(),
    explanation: z.string(),
    grading_rubric: z.string().optional(),
    points: z.number()
  })).min(5),
  total_points: z.number(),
  passing_score: z.number(),
  time_estimate_minutes: z.number()
});

const CaseStudySchema = z.object({
  title: z.string(),
  company_or_context: z.string(),
  industry: z.string(),
  timeline: z.string(),
  background: z.string().min(300),
  challenge: z.string().min(200),
  approach: z.string().min(400),
  implementation: z.string().min(500),
  results: z.object({
    quantitative: z.array(z.object({
      metric: z.string(),
      before: z.string(),
      after: z.string(),
      improvement: z.string()
    })),
    qualitative: z.array(z.string())
  }),
  lessons_learned: z.array(z.string()).min(3),
  discussion_questions: z.array(z.string()).min(3),
  illustration_prompt: z.string()
});

const ChapterExamSchema = z.object({
  exam_title: z.string(),
  instructions: z.string(),
  time_limit_minutes: z.number(),
  sections: z.array(z.object({
    section_title: z.string(),
    questions: z.array(z.object({
      id: z.string(),
      type: z.enum(['multiple_choice', 'true_false', 'short_answer', 'essay', 'problem_solving']),
      question: z.string(),
      options: z.array(z.string()).optional(),
      points: z.number(),
      answer: z.string(),
      explanation: z.string()
    }))
  })),
  total_points: z.number(),
  grading_scale: z.array(z.object({
    grade: z.string(),
    min_percentage: z.number(),
    description: z.string()
  }))
});

// ============================================================================
// TYPES
// ============================================================================

type ChapterOutline = z.infer<typeof TextbookChapterOutlineSchema>;
type SectionContent = z.infer<typeof TextbookSectionContentSchema>;
type ExerciseSet = z.infer<typeof ExerciseSetSchema>;
type CaseStudy = z.infer<typeof CaseStudySchema>;
type ChapterExam = z.infer<typeof ChapterExamSchema>;

export interface TextbookChapter {
  outline: ChapterOutline;
  sections: Array<{
    sectionInfo: ChapterOutline['sections'][number];
    content: SectionContent;
  }>;
  exercises: ExerciseSet;
  caseStudies: CaseStudy[];
  exam: ChapterExam;
  metadata: {
    totalWords: number;
    totalExercises: number;
    estimatedReadingMinutes: number;
    generatedAt: string;
    language: string;
    modelsUsed: string[];
  };
}

export interface TextbookGenerationOptions {
  courseTopic: string;
  moduleTitle: string;
  moduleDescription: string;
  moduleTopics: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  language: string;
  locale: 'en' | 'es';
  courseContext?: string;
  previousModuleSummary?: string;
  targetWordCount?: number; // Default 15000
}

// Track which models were used
const modelsUsedInGeneration: Set<string> = new Set();

// ============================================================================
// HELPER: Execute task with appropriate model and parse JSON
// ============================================================================

async function executeWithSchema<T>(
  taskType: TaskType,
  prompt: string,
  schema: z.ZodSchema<T>,
  systemPrompt: string = JSON_SYSTEM_PROMPT,
  voiceLocale: 'en' | 'es' = 'en'
): Promise<T> {
  const model = await selectModelForTask(taskType);
  const voice = buildVerticalVoiceSystemPrompt({ locale: voiceLocale, vertical: 'courses' });
  const result = await executeWithModel(model, prompt, `${voice}\n\n${systemPrompt}`);
  
  // Track model usage
  modelsUsedInGeneration.add(`${model.provider}:${model.model}`);
  
  // Clean output if from DeepSeek (remove chain-of-thought artifacts)
  let content = result.content;
  if (model.model.includes('deepseek')) {
    content = cleanDeepSeekOutput(content);
  }
  
  // Parse and validate JSON
  const fixed = sanitizeAndFixJSON(content);
  const parsed = parseJSON<T>(fixed, `${taskType} generation`);
  
  // Validate with Zod schema
  return schema.parse(parsed);
}

// ============================================================================
// MAIN GENERATOR
// ============================================================================

/**
 * Generate a complete textbook-quality chapter for a course module
 * 
 * This generates 15,000+ words of content including:
 * - 8+ major sections with deep content
 * - Multiple "Did You Know?" boxes with illustration prompts
 * - 10+ exercises with solutions
 * - 2-3 detailed case studies
 * - A comprehensive chapter exam
 * 
 * Model Strategy:
 * - DeepSeek R1 70B → Outline planning, exercises, exams (reasoning tasks)
 * - Qwen2.5 72B → Main content, case studies (polished prose)
 */
export async function generateTextbookChapter(
  options: TextbookGenerationOptions
): Promise<TextbookChapter> {
  const targetWords = options.targetWordCount || 15000;
  const startTime = Date.now();
  
  // Reset model tracking for this generation
  modelsUsedInGeneration.clear();
  
  console.log('\n' + '═'.repeat(80));
  console.log('📚 TEXTBOOK-QUALITY CHAPTER GENERATION');
  console.log('═'.repeat(80));
  console.log(`Topic: ${options.courseTopic}`);
  console.log(`Module: ${options.moduleTitle}`);
  console.log(`Difficulty: ${options.difficulty}`);
  console.log(`Target words: ${targetWords}+`);
  console.log(`Language: ${options.language}`);
  console.log('Model Strategy: DeepSeek R1 (planning/exercises) + Qwen2.5 (content/prose)');
  console.log('─'.repeat(80));

  // Step 1: Generate detailed chapter outline
  console.log('\n📋 Step 1/5: Generating chapter outline...');
  const outline = await generateChapterOutline(options);
  console.log(`   ✅ Outline: ${outline.sections.length} sections, ${outline.learning_objectives.length} objectives`);

  // Step 2: Generate content for each section
  console.log('\n📝 Step 2/5: Generating section content...');
  const sections: TextbookChapter['sections'] = [];
  let totalWords = 0;

  for (let i = 0; i < outline.sections.length; i++) {
    const section = outline.sections[i];
    console.log(`   Section ${i + 1}/${outline.sections.length}: "${section.title}"...`);
    
    const content = await generateSectionContent(
      section,
      outline,
      options,
      i,
      outline.sections.length
    );
    
    const wordCount = content.content.split(/\s+/).length;
    totalWords += wordCount;
    console.log(`   ✅ Generated ${wordCount} words`);
    
    sections.push({ sectionInfo: section, content });
  }

  // Step 3: Generate exercises
  console.log('\n🎯 Step 3/5: Generating exercises...');
  const exercises = await generateExerciseSet(outline, options);
  console.log(`   ✅ Generated ${exercises.exercises.length} exercises (${exercises.total_points} points)`);

  // Step 4: Generate case studies
  console.log('\n📊 Step 4/5: Generating case studies...');
  const caseStudies = await generateCaseStudies(outline, options);
  console.log(`   ✅ Generated ${caseStudies.length} case studies`);

  // Step 5: Generate chapter exam
  console.log('\n📝 Step 5/5: Generating chapter exam...');
  const exam = await generateChapterExam(outline, options);
  console.log(`   ✅ Generated exam with ${exam.sections.reduce((sum, s) => sum + s.questions.length, 0)} questions`);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const estimatedReadingMinutes = Math.ceil(totalWords / 200); // 200 wpm average
  const usedModels = Array.from(modelsUsedInGeneration);

  console.log('\n' + '═'.repeat(80));
  console.log('✅ CHAPTER GENERATION COMPLETE');
  console.log('═'.repeat(80));
  console.log(`Total words: ${totalWords}`);
  console.log(`Sections: ${sections.length}`);
  console.log(`Exercises: ${exercises.exercises.length}`);
  console.log(`Case studies: ${caseStudies.length}`);
  console.log(`Exam questions: ${exam.sections.reduce((sum, s) => sum + s.questions.length, 0)}`);
  console.log(`Estimated reading time: ${estimatedReadingMinutes} minutes`);
  console.log(`Generation time: ${elapsed}s`);
  console.log(`Models used: ${usedModels.join(', ')}`);
  console.log('═'.repeat(80) + '\n');

  return {
    outline,
    sections,
    exercises,
    caseStudies,
    exam,
    metadata: {
      totalWords,
      totalExercises: exercises.exercises.length,
      estimatedReadingMinutes,
      generatedAt: new Date().toISOString(),
      language: options.language,
      modelsUsed: usedModels
    }
  };
}

// ============================================================================
// GENERATION FUNCTIONS
// ============================================================================

async function generateChapterOutline(
  options: TextbookGenerationOptions
): Promise<ChapterOutline> {
  const prompt = `Create a detailed textbook chapter outline for a ${options.difficulty}-level course.

COURSE: "${options.courseTopic}"
CHAPTER: "${options.moduleTitle}"
DESCRIPTION: ${options.moduleDescription}
TOPICS TO COVER: ${options.moduleTopics.join(', ')}
LANGUAGE: ${options.language}

${options.previousModuleSummary ? `PREVIOUS CHAPTER SUMMARY: ${options.previousModuleSummary}` : ''}

Create a comprehensive chapter outline with:
1. 5-8 specific learning objectives (measurable, using Bloom's taxonomy)
2. List of prerequisite knowledge needed
3. 8-12 major sections covering:
   - Introduction and context
   - Foundational concepts and terminology
   - Core theory (multiple sections)
   - Advanced concepts
   - Practical applications
   - Real-world case studies section
   - Hands-on exercises section
   - Chapter summary and review
4. Each section should have estimated word count (total should be 15000+ words)
5. Include subsections with key concepts for each major section
6. 5+ chapter summary points
7. 3-5 suggested reading references

Return JSON matching the schema exactly.`;

  // Use DeepSeek for outline planning (excellent at structured reasoning)
  return await executeWithSchema(
    'outline_planning',
    prompt,
    TextbookChapterOutlineSchema,
    JSON_SYSTEM_PROMPT,
    options.locale
  );
}

async function generateSectionContent(
  section: ChapterOutline['sections'][number],
  outline: ChapterOutline,
  options: TextbookGenerationOptions,
  sectionIndex: number,
  totalSections: number
): Promise<SectionContent> {
  const targetWords = Math.max(1500, section.estimated_words);
  
  const prompt = `Write comprehensive textbook content for this section.

COURSE: "${options.courseTopic}"
CHAPTER: "${outline.chapter_title}"
SECTION ${section.section_number}: "${section.title}"
SECTION TYPE: ${section.content_type}
POSITION: Section ${sectionIndex + 1} of ${totalSections}
TARGET LENGTH: ${targetWords}+ words
LANGUAGE: ${options.language}
DIFFICULTY: ${options.difficulty}

SECTION DESCRIPTION:
${section.description}

${section.subsections ? `SUBSECTIONS TO COVER:\n${section.subsections.map(s => `- ${s.title}: ${s.key_concepts.join(', ')}`).join('\n')}` : ''}

CHAPTER LEARNING OBJECTIVES:
${outline.learning_objectives.map((obj, i) => `${i + 1}. ${obj}`).join('\n')}

CONTENT REQUIREMENTS:

1. DEPTH & RIGOR (${targetWords}+ words):
   - Write at ${options.difficulty} university level
   - Use precise terminology with definitions
   - Build concepts progressively
   - Include mathematical formulations where relevant
   - Reference established frameworks and methodologies

2. STRUCTURE:
   - Use clear markdown hierarchy (##, ###, ####)
  - Include bullet points and numbered lists (editorial list style: each bullet starts with a bold label, e.g. "- **Concept:** ...")
  - Add tables for comparisons
  - Break dense text with examples
  - DO NOT use raw HTML tags (no <div>, <p>, <ul>, <li>, <details>, etc.). Use pure Markdown only.
  - NEVER write more than 3 plain paragraphs in a row; insert a widget to break the rhythm
  - Include at least:
     - 2 pull quotes using: > ## "Impactful sentence" and > *— Context*
    - 2 sidebar boxes using ONE-CELL tables:
     | 💡 TECH INSIGHT: TITLE |
     | :--- |
     | Body text... |
   - Suggest 1-2 conceptual image placements inline using: ![DISEÑO: ...]

3. EXAMPLES & ILLUSTRATIONS:
   - 3-5 detailed examples per major concept
   - Code snippets with explanations
   - Diagrams described in text
   - Real industry references

4. "DID YOU KNOW?" BOX:
   - Include one fascinating fact or historical context
   - Should spark curiosity
   - Include illustration_prompt for AI image generation

5. KEY TERMS:
   - Define 5-10 important terms
   - Use consistent terminology

6. DIAGRAMS (GENERATED IMAGES ONLY):
  - Describe 1-2 conceptual diagrams in plain language
  - Include illustration_prompt for each (for AI image generation)
  - Do NOT include Mermaid, ASCII art, or any diagram code blocks

Return JSON with: content, key_terms, did_you_know, code_examples, diagrams`;

  // Use Qwen for content generation (excellent prose, long context)
  return await executeWithSchema(
    'content_generation',
    prompt,
    TextbookSectionContentSchema,
    JSON_SYSTEM_PROMPT,
    options.locale
  );
}

async function generateExerciseSet(
  outline: ChapterOutline,
  options: TextbookGenerationOptions
): Promise<ExerciseSet> {
  const prompt = `Create a comprehensive exercise set for this textbook chapter.

COURSE: "${options.courseTopic}"
CHAPTER: "${outline.chapter_title}"
DIFFICULTY: ${options.difficulty}
LANGUAGE: ${options.language}

LEARNING OBJECTIVES:
${outline.learning_objectives.map((obj, i) => `${i + 1}. ${obj}`).join('\n')}

SECTIONS COVERED:
${outline.sections.map(s => `- ${s.section_number} ${s.title}`).join('\n')}

Create 10-15 exercises including:
1. 3-4 multiple choice questions (testing recall and understanding)
2. 2-3 fill-in-the-blank questions (testing terminology)
3. 2-3 short answer questions (testing application)
4. 2-3 coding/practical exercises (testing implementation)
5. 1-2 essay/analysis questions (testing synthesis)
6. 1 challenge problem (for advanced students)

Each exercise must have:
- Clear question text
- Difficulty level
- Hints (for harder questions)
- Complete solution
- Detailed explanation
- Point value (harder = more points)
- Grading rubric for open-ended questions

Mix difficulties: 30% basic, 40% intermediate, 20% advanced, 10% challenge

Return JSON matching the schema exactly.`;

  // Use DeepSeek for exercises (excellent at problem design and reasoning)
  return await executeWithSchema(
    'exercise_generation',
    prompt,
    ExerciseSetSchema,
    JSON_SYSTEM_PROMPT,
    options.locale
  );
}

async function generateCaseStudies(
  outline: ChapterOutline,
  options: TextbookGenerationOptions
): Promise<CaseStudy[]> {
  const caseStudies: CaseStudy[] = [];
  
  // Generate 2-3 case studies
  const numCaseStudies = options.difficulty === 'advanced' ? 3 : 2;
  
  for (let i = 0; i < numCaseStudies; i++) {
    const prompt = `Create a detailed case study for this textbook chapter.

COURSE: "${options.courseTopic}"
CHAPTER: "${outline.chapter_title}"
CASE STUDY NUMBER: ${i + 1} of ${numCaseStudies}
LANGUAGE: ${options.language}
DIFFICULTY: ${options.difficulty}

TOPICS TO ILLUSTRATE:
${outline.sections.slice(0, 5).map(s => s.title).join(', ')}

Create a compelling, realistic case study with:

1. CONTEXT:
   - Real or realistic company/organization name
   - Specific industry
   - Clear timeline (dates, duration)
   - Detailed background (300+ words)

2. THE CHALLENGE:
   - Specific problem or opportunity
   - Business impact
   - Constraints and requirements
   - What was at stake

3. THE APPROACH:
   - Strategy developed
   - Key decisions made
   - Technologies/methods used
   - Team and resources involved

4. IMPLEMENTATION:
   - Step-by-step process
   - Challenges encountered
   - How challenges were overcome
   - Timeline of implementation

5. RESULTS:
   - Quantitative metrics (before/after)
   - Qualitative improvements
   - Business outcomes
   - ROI or impact

6. LESSONS LEARNED:
   - What worked well
   - What could be improved
   - Recommendations for others

7. DISCUSSION QUESTIONS:
   - 3-5 questions for class discussion
   - Questions that promote critical thinking

8. ILLUSTRATION PROMPT:
   - Describe an infographic or diagram that would illustrate this case study

${i === 0 ? 'Make this case study about a LARGE ENTERPRISE or WELL-KNOWN COMPANY.' : ''}
${i === 1 ? 'Make this case study about a STARTUP or INNOVATIVE PROJECT.' : ''}
${i === 2 ? 'Make this case study about an INTERNATIONAL or CROSS-CULTURAL context.' : ''}

Return JSON matching the schema exactly.`;

    // Use Qwen for case studies (excellent narrative prose)
    const result = await executeWithSchema(
      'case_study',
      prompt,
      CaseStudySchema,
      JSON_SYSTEM_PROMPT,
      options.locale
    );

    caseStudies.push(result);
  }

  return caseStudies;
}

async function generateChapterExam(
  outline: ChapterOutline,
  options: TextbookGenerationOptions
): Promise<ChapterExam> {
  const prompt = `Create a comprehensive chapter exam for this textbook chapter.

COURSE: "${options.courseTopic}"
CHAPTER: "${outline.chapter_title}"
DIFFICULTY: ${options.difficulty}
LANGUAGE: ${options.language}

LEARNING OBJECTIVES TO TEST:
${outline.learning_objectives.map((obj, i) => `${i + 1}. ${obj}`).join('\n')}

SECTIONS COVERED:
${outline.sections.map(s => `${s.section_number} ${s.title}`).join('\n')}

Create a comprehensive chapter exam with:

1. EXAM STRUCTURE:
   - Clear instructions for students
   - Time limit (typically 60-90 minutes)
   - Multiple sections

2. SECTIONS (3-4 sections):
   - Section A: Multiple Choice & True/False (15-20 questions, 1-2 points each)
   - Section B: Short Answer (5-8 questions, 5-10 points each)
   - Section C: Problem Solving/Application (2-4 questions, 15-25 points each)
   - Section D: Essay/Analysis (1-2 questions, 20-30 points each)

3. EACH QUESTION MUST HAVE:
   - Clear question text
   - Point value
   - Complete answer
   - Detailed explanation

4. GRADING SCALE:
   - A: 90-100% (Excellent)
   - B: 80-89% (Good)
   - C: 70-79% (Satisfactory)
   - D: 60-69% (Needs Improvement)
   - F: Below 60% (Unsatisfactory)

5. COVERAGE:
   - Test all learning objectives
   - Balance between recall, understanding, application, and analysis
   - Include at least one question from each major section

Total points should be 100 for easy percentage calculation.

Return JSON matching the schema exactly.`;

  // Use DeepSeek for exam generation (rigorous question design)
  return await executeWithSchema(
    'exam_generation',
    prompt,
    ChapterExamSchema,
    JSON_SYSTEM_PROMPT,
    options.locale
  );
}

// ============================================================================
// CONTENT ASSEMBLY
// ============================================================================

/**
 * Assemble all generated content into a single markdown document
 */
export function assembleChapterMarkdown(chapter: TextbookChapter): string {
  const md: string[] = [];

  const isSpanish = chapter.metadata.language.toLowerCase().startsWith('span') || chapter.metadata.language.toLowerCase() === 'es';
  const label = {
    stats: isSpanish ? '💡 TECH INSIGHT: Datos del capítulo' : '💡 TECH INSIGHT: Chapter stats',
    estimated: isSpanish ? 'Tiempo estimado de lectura' : 'Estimated reading time',
    totalWords: isSpanish ? 'Total de palabras' : 'Total words',
    exercises: isSpanish ? 'Ejercicios' : 'Exercises',
    objectives: isSpanish ? '📎 Objetivos de aprendizaje' : '📎 Learning Objectives',
    prerequisites: isSpanish ? '📚 Requisitos previos' : '📚 Prerequisites',
    afterCompleting: isSpanish ? 'Al terminar este capítulo, serás capaz de:' : 'After completing this chapter, you will be able to:',
    beforeStarting: isSpanish ? 'Antes de empezar, conviene que domines:' : 'Before starting this chapter, you should be familiar with:',
    keyTerms: isSpanish ? '📖 Términos clave' : '📖 Key Terms',
    codeExamples: isSpanish ? '💻 Ejemplos de código' : '💻 Code Examples',
    caseStudies: isSpanish ? '📊 Casos de estudio' : '📊 Case Studies',
    practice: isSpanish ? '🎯 Ejercicios de práctica' : '🎯 Practice Exercises',
    exam: '📝',
    gradingScale: isSpanish ? 'Escala de calificación' : 'Grading Scale',
    summary: isSpanish ? '📋 Resumen del capítulo' : '📋 Chapter Summary',
    reading: isSpanish ? '📚 Lecturas recomendadas' : '📚 Suggested Reading',
    keyIdea: isSpanish ? 'Idea clave' : 'Key idea',
    prereq: isSpanish ? 'Requisito' : 'Prerequisite',
    reference: isSpanish ? 'Referencia' : 'Reference',
  };

  // The Hook: Title + bold 2-line standfirst + separator
  md.push(`# ${chapter.outline.chapter_title}\n`);

  const standfirstText = chapter.outline.chapter_summary_points.slice(0, 2).join(' ').trim();
  if (standfirstText) {
    md.push(`> **${standfirstText}**\n`);
  }
  md.push('---\n');

  // Chapter stats as a sidebar box (one-cell table)
  md.push(`| ${label.stats} |`);
  md.push('| :--- |');
  md.push(`| **${label.estimated}:** ${chapter.metadata.estimatedReadingMinutes} min · **${label.totalWords}:** ${chapter.metadata.totalWords.toLocaleString()} · **${label.exercises}:** ${chapter.metadata.totalExercises} |\n`);

  // Learning objectives
  md.push(`## ${label.objectives}\n`);
  md.push(`${label.afterCompleting}\n`);
  chapter.outline.learning_objectives.forEach((obj, i) => {
    md.push(`${i + 1}. ${obj}`);
  });
  md.push('');

  // Prerequisites
  if (chapter.outline.prerequisite_knowledge.length > 0) {
    md.push(`## ${label.prerequisites}\n`);
    md.push(`${label.beforeStarting}\n`);
    chapter.outline.prerequisite_knowledge.forEach(prereq => {
      md.push(`- **${label.prereq}:** ${prereq}`);
    });
    md.push('');
  }

  // Main content sections
  md.push('---\n');
  
  for (const section of chapter.sections) {
    md.push(`## ${section.sectionInfo.section_number} ${section.sectionInfo.title}\n`);
    md.push(section.content.content);
    md.push('');

    // Key terms
    if (section.content.key_terms && section.content.key_terms.length > 0) {
      md.push(`### ${label.keyTerms}\n`);
      md.push('| Term | Definition |');
      md.push('|------|------------|');
      section.content.key_terms.forEach(term => {
        md.push(`| **${term.term}** | ${term.definition} |`);
      });
      md.push('');
    }

    // Did you know box
    if (section.content.did_you_know) {
      md.push(`| 💡 TECH INSIGHT: ${section.content.did_you_know.title} |`);
      md.push('| :--- |');
      md.push(`| ${section.content.did_you_know.content} |\n`);
    }

    // Code examples
    if (section.content.code_examples && section.content.code_examples.length > 0) {
      md.push(`### ${label.codeExamples}\n`);
      section.content.code_examples.forEach(example => {
        md.push(`**${example.description}**\n`);
        md.push('```' + example.language);
        md.push(example.code);
        md.push('```\n');
      });
    }

    md.push('---\n');
  }

  // Case studies
  if (chapter.caseStudies.length > 0) {
    md.push(`## ${label.caseStudies}\n`);
    
    chapter.caseStudies.forEach((cs, i) => {
      md.push(`### Case Study ${i + 1}: ${cs.title}\n`);
      md.push(`**Company/Context:** ${cs.company_or_context}`);
      md.push(`**Industry:** ${cs.industry}`);
      md.push(`**Timeline:** ${cs.timeline}\n`);
      
      md.push('#### Background\n');
      md.push(cs.background + '\n');
      
      md.push('#### The Challenge\n');
      md.push(cs.challenge + '\n');
      
      md.push('#### Approach\n');
      md.push(cs.approach + '\n');
      
      md.push('#### Implementation\n');
      md.push(cs.implementation + '\n');
      
      md.push('#### Results\n');
      if (cs.results.quantitative.length > 0) {
        md.push('| Metric | Before | After | Improvement |');
        md.push('|--------|--------|-------|-------------|');
        cs.results.quantitative.forEach(r => {
          md.push(`| ${r.metric} | ${r.before} | ${r.after} | ${r.improvement} |`);
        });
        md.push('');
      }
      cs.results.qualitative.forEach(r => md.push(`- ${r}`));
      md.push('');
      
      md.push('#### Lessons Learned\n');
      cs.lessons_learned.forEach(lesson => md.push(`- **${label.keyIdea}:** ${lesson}`));
      md.push('');
      
      md.push('#### Discussion Questions\n');
      cs.discussion_questions.forEach((q, qi) => md.push(`${qi + 1}. ${q}`));
      md.push('\n---\n');
    });
  }

  // Exercises
  md.push(`## ${label.practice}\n`);
  md.push(`*Total points: ${chapter.exercises.total_points} | Passing score: ${chapter.exercises.passing_score}% | Estimated time: ${chapter.exercises.time_estimate_minutes} minutes*\n`);

  chapter.exercises.exercises.forEach((ex, i) => {
    const difficultyEmoji = {
      basic: '🟢',
      intermediate: '🟡',
      advanced: '🟠',
      challenge: '🔴'
    }[ex.difficulty];

    md.push(`### Exercise ${i + 1} ${difficultyEmoji} (${ex.points} points)\n`);
    md.push(`**Type:** ${ex.type.replace('_', ' ')} | **Difficulty:** ${ex.difficulty}\n`);
    
    if (ex.context) {
      md.push(`*Context:* ${ex.context}\n`);
    }
    
    md.push(`**Question:** ${ex.question}\n`);
    
    if (ex.options) {
      ex.options.forEach((opt, oi) => {
        md.push(`${String.fromCharCode(65 + oi)}. ${opt}`);
      });
      md.push('');
    }
    
    if (ex.hints && ex.hints.length > 0) {
      md.push('#### 💡 Hints\n');
      ex.hints.forEach((hint) => md.push(`- ${hint}`));
      md.push('');
    }
    
    md.push('#### ✅ Solution\n');
    md.push(`**Answer:** ${ex.solution}\n`);
    md.push(`**Explanation:** ${ex.explanation}`);
    if (ex.grading_rubric) {
      md.push(`\n**Grading Rubric:** ${ex.grading_rubric}`);
    }
    md.push('');
  });

  // Chapter exam
  md.push('---\n');
  md.push(`## ${label.exam} ${chapter.exam.exam_title}\n`);
  md.push(`*Time limit: ${chapter.exam.time_limit_minutes} minutes | Total points: ${chapter.exam.total_points}*\n`);
  md.push(`**Instructions:** ${chapter.exam.instructions}\n`);

  chapter.exam.sections.forEach(section => {
    md.push(`### ${section.section_title}\n`);
    section.questions.forEach((q, qi) => {
      md.push(`**${qi + 1}.** (${q.points} pts) ${q.question}`);
      if (q.options) {
        q.options.forEach((opt, oi) => {
          md.push(`   ${String.fromCharCode(65 + oi)}. ${opt}`);
        });
      }
      md.push('');
    });
  });

  md.push('---\n');
  md.push(`## 📋 Answer Key\n`);
  chapter.exam.sections.forEach(section => {
    md.push(`**${section.section_title}**`);
    section.questions.forEach((q, qi) => {
      md.push(`${qi + 1}. ${q.answer}`);
      md.push(`   *${q.explanation}*\n`);
    });
  });

  // Grading scale
  md.push(`#### ${label.gradingScale}\n`);
  md.push('| Grade | Percentage | Description |');
  md.push('|-------|------------|-------------|');
  chapter.exam.grading_scale.forEach(g => {
    md.push(`| ${g.grade} | ${g.min_percentage}%+ | ${g.description} |`);
  });
  md.push('');

  // Summary
  md.push('---\n');
  md.push(`## ${label.summary}\n`);
  chapter.outline.chapter_summary_points.forEach(point => {
    md.push(`- **${label.keyIdea}:** ${point}`);
  });
  md.push('');

  // Suggested reading
  if (chapter.outline.suggested_reading.length > 0) {
    md.push(`## ${label.reading}\n`);
    chapter.outline.suggested_reading.forEach(ref => {
      md.push(`- **${label.reference}:** **${ref.title}** — ${ref.author} (${ref.type})`);
    });
  }

  return md.join('\n');
}

/**
 * Extract all illustration prompts from a chapter for image generation
 */
export function extractIllustrationPrompts(chapter: TextbookChapter): Array<{
  type: 'did_you_know' | 'diagram' | 'case_study';
  sectionNumber?: string;
  title: string;
  prompt: string;
}> {
  const prompts: Array<{
    type: 'did_you_know' | 'diagram' | 'case_study';
    sectionNumber?: string;
    title: string;
    prompt: string;
  }> = [];

  // Extract from sections
  for (const section of chapter.sections) {
    if (section.content.did_you_know?.illustration_prompt) {
      prompts.push({
        type: 'did_you_know',
        sectionNumber: section.sectionInfo.section_number,
        title: section.content.did_you_know.title,
        prompt: section.content.did_you_know.illustration_prompt
      });
    }

    if (section.content.diagrams) {
      for (const diagram of section.content.diagrams) {
        prompts.push({
          type: 'diagram',
          sectionNumber: section.sectionInfo.section_number,
          title: diagram.title,
          prompt: diagram.illustration_prompt
        });
      }
    }
  }

  // Extract from case studies
  for (const cs of chapter.caseStudies) {
    prompts.push({
      type: 'case_study',
      title: cs.title,
      prompt: cs.illustration_prompt
    });
  }

  return prompts;
}
