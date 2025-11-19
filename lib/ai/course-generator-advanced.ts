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
  const promptGeneratorPrompt = `You are an expert instructional designer creating a comprehensive course on "${courseTopic}".

Course Description: ${courseDescription}
Difficulty Level: ${difficulty}
Language: ${languageName}
Total Modules: ${modules.length}

For each of the ${modules.length} modules below, create a HIGHLY DETAILED and SPECIFIC prompt that will be used by an AI content generator to produce 2500+ word educational content.

MODULES:
${modules
  .map(
    (m, i) => `
Module ${i + 1}: ${m.title}
Description: ${m.description}
Topics: ${m.topics.join(', ')}
Target Duration: ${m.estimated_minutes} minutes
`
  )
  .join('\n')}

For EACH module, you MUST generate:
1. A DETAILED prompt (minimum 500 words) that gives the content generator:
   - Exact structure and sections to include
   - Specific examples, case studies, or real-world applications
   - Technical depth appropriate for ${difficulty} level
   - Exact tone and style (educational but engaging)
   - Learning outcomes to achieve
   
2. 3-5 specific LEARNING OBJECTIVES that content should cover

3. 4+ KEY SECTIONS the content should include

Return JSON with these prompts indexed by module.

Important: Each prompt should be so specific that ANY AI model could use it to generate high-quality, substantive content WITHOUT additional guidance.`;

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
  // Just ask for the structured content
  const contentGenerationPrompt = `${prompt.detailed_prompt}

LANGUAGE: ${languageName}
MINIMUM WORD COUNT: 2500+ words
FORMAT: Valid markdown

COURSE CONTEXT:
${courseContext}

CRITICAL REQUIREMENTS:
1. Content MUST be at least 2500 words
2. Include ALL sections listed in the prompt
3. Use real examples and case studies
4. Make it educational and engaging
5. Include code examples or equations where appropriate
6. End with a summary of key takeaways

Return JSON matching this schema:
{
  "content": string (the full markdown lesson),
  "resources": [
    { "title": string, "url": string, "type": "article"|"video"|"paper"|"documentation" }
  ],
  "key_takeaways": [string, string, string, ...]
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
