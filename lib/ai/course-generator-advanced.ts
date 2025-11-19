/**
 * Two-step course generation system:
 * 1. Generate specific prompts for each module
 * 2. Use those prompts to generate detailed content
 */

import { z } from 'zod';
import { classifyWithAllProviders } from './llm-client';

const JSON_SYSTEM_PROMPT = 'You are a world-class AI educator. Respond with valid JSON only matching the provided schema. Never include markdown fences or additional commentary.';

const ModulePromptSchema = z.object({
  prompts: z.array(
    z.object({
      module_index: z.number(),
      title: z.string(),
      detailed_prompt: z.string().min(500).describe('Detailed, specific prompt for generating module content'),
      learning_objectives: z.array(z.string()).min(3).describe('Specific learning objectives for this module'),
      key_sections: z.array(z.string()).min(4).describe('Expected sections in the content')
    })
  ).min(1)
});

const ModuleContentSchema = z.object({
  content: z.string().min(2500).describe('Rich, comprehensive markdown lesson (2500+ words)'),
  resources: z.array(
    z.object({
      title: z.string(),
      url: z.string(),
      type: z.enum(['article', 'video', 'paper', 'documentation'])
    })
  ).min(3),
  key_takeaways: z.array(z.string()).min(3).describe('Main takeaways from this module')
});

type ModulePrompt = z.infer<typeof ModulePromptSchema>['prompts'][number];
type ModuleContent = z.infer<typeof ModuleContentSchema>;

/**
 * Step 1: Generate detailed, specific prompts for each module
 */
export async function generateModulePrompts(
  courseTopic: string,
  courseDescription: string,
  difficulty: 'beginner' | 'intermediate' | 'advanced',
  modules: Array<{
    title: string;
    description: string;
    topics: string[];
    estimated_minutes: number;
  }>,
  languageName: string
): Promise<ModulePrompt[]> {
  const promptGeneratorPrompt = `You are a world-renowned expert curriculum designer and veteran educator with 30+ years of experience designing university-level courses and professional certifications. You understand how to structure educational content for maximum student engagement, retention, and practical application.

Your task: Create EXCEPTIONALLY DETAILED and SPECIFIC content generation prompts for each module of a comprehensive course.

COURSE CONTEXT:
- Topic: "${courseTopic}"
- Description: ${courseDescription}
- Student Level: ${difficulty} (${difficulty === 'beginner' ? 'students new to topic' : difficulty === 'intermediate' ? 'students with foundational knowledge' : 'advanced professionals seeking mastery'})
- Language: ${languageName}
- Total Modules: ${modules.length}

MODULE SPECIFICATIONS:
${modules
  .map(
    (m, i) => `
[MODULE ${i + 1}]
Title: "${m.title}"
Description: ${m.description}
Core Topics: ${m.topics.join(', ')}
Target Duration: ${m.estimated_minutes} minutes
Sequence: Part ${i + 1} of ${modules.length} course progression
`
  )
  .join('\n')}

FOR EACH MODULE, CREATE A COMPREHENSIVE PROMPT that includes:

1. PEDAGOGICAL FRAMEWORK (500+ words):
   - How this module fits into the overall course progression
   - What students should already know (prerequisites)
   - What mastery looks like after completing this module
   - Common misconceptions to address and correct
   - How this topic connects to real-world applications
   - Cognitive complexity progression (simple → complex)

2. STRUCTURAL BLUEPRINT:
   - Exact sections to include (with purpose for each)
   - Approximate word count allocation per section
   - Where to include code examples, diagrams, equations, case studies
   - How to scaffold learning from foundation to advanced application

3. CONTENT DEPTH SPECIFICATIONS:
   - 3-5 measurable LEARNING OUTCOMES using Bloom's taxonomy
   - 5-7 KEY CONCEPTS with interdependencies
   - 3+ REAL-WORLD APPLICATIONS or case studies (specific industries, companies, or scenarios)
   - Common PITFALLS and MISTAKES students make
   - ADVANCED EXTENSIONS for overachievers

4. INSTRUCTIONAL TONE:
   - Act as a veteran professional mentor, not a textbook
   - Balance rigor with accessibility
   - Include personal insights from industry experience
   - Anticipate student questions and answer them directly
   - Use metaphors and analogies to bridge complex concepts

IMPORTANT: Each prompt must be so detailed and specific that a world-class content generator can produce a textbook-quality chapter with minimal additional context.`;

  const { result: modulePrompts } = await classifyWithAllProviders(
    promptGeneratorPrompt,
    ModulePromptSchema,
    JSON_SYSTEM_PROMPT
  );

  return modulePrompts.prompts;
}

/**
 * Step 2: Generate detailed content for each module using its specific prompt
 */
export async function generateModuleContentFromPrompt(
  prompt: ModulePrompt,
  courseContext: string,
  languageName: string
): Promise<ModuleContent> {
  // The pre-generated prompt is already highly detailed
  // Wrap it with maximum LLM optimization instructions
  const contentGenerationPrompt = `${prompt.detailed_prompt}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONTENT GENERATION INSTRUCTIONS - PREMIUM TEXTBOOK QUALITY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You are an award-winning textbook author and subject matter expert with decades of teaching experience. You are writing a chapter for a comprehensive professional textbook. Every sentence should be purposeful, every example should be illuminating.

LANGUAGE: ${languageName}
COURSE CONTEXT:
${courseContext}

EXPECTATIONS FOR THIS CONTENT:

✓ LENGTH: Minimum 3000+ words (not 2500). Be comprehensive and thorough.
  - Intro: 300-400 words
  - Core concepts: 800-1000 words
  - Deep dive with examples: 1200-1500 words
  - Practical applications: 400-500 words
  - Summary: 200-300 words

✓ RIGOR: This should read like a university-level textbook or professional certification course, not a blog post.
  - Use precise terminology consistently
  - Define specialized terms on first mention
  - Cite principles, frameworks, or methodologies by name
  - Include quantitative data, statistics, or benchmarks where relevant
  - Build arguments logically from foundation to advanced

✓ RICHNESS: Include diverse content types:
  - Conceptual explanations (the "why")
  - Practical procedures (the "how")
  - Real-world examples (3-5 specific, detailed case studies)
  - Code snippets or technical implementations
  - Diagrams or visual descriptions in markdown
  - Equations or mathematical formulations
  - Industry insights and professional context
  - Common mistakes and how to avoid them

✓ DEPTH: Address each topic comprehensively:
  - Not just definitions but deep understanding
  - Historical context if relevant
  - Evolution of the field/practice
  - Current best practices and emerging trends
  - Limitations, edge cases, and exceptions
  - How to apply theory in practice
  - Advanced techniques for those going deeper

✓ STRUCTURE:
  - Use clear markdown hierarchy (# ## ### for sections)
  - Include subheadings that reveal the content structure
  - Break long sections with bullet points and examples
  - Use tables, code blocks, and formatting for clarity
  - Each section should be substantive (100+ words minimum)

✓ QUALITY RESOURCES:
  - Include 5-7 carefully selected educational resources
  - Resources should be:
    * Recent and authoritative (last 5-7 years ideally)
    * Directly relevant to this specific module
    * Mix of types: articles, videos, papers, documentation
    * From respected sources (academic, industry leaders, professional organizations)
    * Links should be realistic and specific (not placeholder URLs)

✓ TONE:
  - Write as a mentor, not an AI
  - Share insights from professional experience
  - Use "we" when discussing industry practice
  - Address the reader directly: "You should understand..."
  - Include rhetorical questions to engage critical thinking
  - Balance technical depth with clarity

✓ NO LAZY CONTENT:
  - ✗ Don't use [example] or [more content] placeholders
  - ✗ Don't repeat the same concept multiple times
  - ✗ Don't add filler to reach word count
  - ✗ Don't oversimplify complex topics
  - ✗ Don't skip the hard parts
  - ✓ Every paragraph should add distinct value
  - ✓ Examples should be specific and detailed
  - ✓ Explanations should be thorough, not superficial

Return JSON matching this schema:
{
  "content": string (comprehensive 3000+ word markdown lesson),
  "resources": [
    { "title": string, "url": string, "type": "article"|"video"|"paper"|"documentation" }
  ],
  "key_takeaways": [string, string, string, string, string]
}`;

  const { result: moduleContent } = await classifyWithAllProviders(
    contentGenerationPrompt,
    ModuleContentSchema,
    JSON_SYSTEM_PROMPT
  );

  return moduleContent;
}

/**
 * Complete two-step course generation
 */
export async function generateCourseWithDetailedPrompts(
  courseTopic: string,
  courseDescription: string,
  difficulty: 'beginner' | 'intermediate' | 'advanced',
  modules: Array<{
    title: string;
    description: string;
    topics: string[];
    estimated_minutes: number;
  }>,
  languageName: string,
  _locale: 'en' | 'es'
) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🚀 ADVANCED COURSE GENERATION: Two-Step Prompt System`);
  console.log(`${'='.repeat(80)}`);

  console.log(`\n📋 STEP 1/2: Generating detailed module prompts...`);
  console.log(`   Course: ${courseTopic}`);
  console.log(`   Difficulty: ${difficulty}`);
  console.log(`   Modules: ${modules.length}`);
  console.log(`   Language: ${languageName}`);

  const modulePrompts = await generateModulePrompts(
    courseTopic,
    courseDescription,
    difficulty,
    modules,
    languageName
  );

  console.log(`✅ Generated ${modulePrompts.length} detailed module prompts`);
  modulePrompts.forEach((p) => {
    console.log(`   - Module ${p.module_index + 1}: ${p.title}`);
    console.log(`     Learning objectives: ${p.learning_objectives.length}`);
    console.log(`     Key sections: ${p.key_sections.join(', ')}`);
  });

  console.log(`\n📝 STEP 2/2: Generating detailed content for each module...`);
  const courseContext = `Course: ${courseTopic}\nDescription: ${courseDescription}\nDifficulty: ${difficulty}`;

  const generatedModules: Array<{
    modulePrompt: ModulePrompt;
    content: ModuleContent;
  }> = [];

  for (let i = 0; i < modulePrompts.length; i++) {
    const prompt = modulePrompts[i];
    console.log(`\n   Module ${i + 1}/${modulePrompts.length}: "${prompt.title}"...`);
    console.log(`   (This generates 2500+ words of content...)`);

    const content = await generateModuleContentFromPrompt(
      prompt,
      courseContext,
      languageName
    );

    console.log(`   ✅ Generated: ${content.content.length} chars, ${content.key_takeaways.length} takeaways`);
    generatedModules.push({ modulePrompt: prompt, content });
  }

  console.log(`\n✅ All ${generatedModules.length} modules generated with comprehensive content!`);
  console.log(`${'='.repeat(80)}\n`);

  return generatedModules;
}
