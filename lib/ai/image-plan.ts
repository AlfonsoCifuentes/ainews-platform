import { z } from 'zod';
import { UnifiedLLMClient } from './unified-llm-client';

interface ModuleInput {
  id: string;
  title: string;
  content: string;
}

export interface CoursePlanInput {
  courseId: string;
  title: string;
  description?: string;
  locale: 'en' | 'es';
  modules: ModuleInput[];
}

export interface ImagePrompt {
  prompt: string;
  rationale?: string;
}

export interface ModuleImagePlan {
  moduleId: string;
  moduleTitle: string;
  images: ImagePrompt[]; // non-Gemini images (Runware/HF/Qwen)
  diagrams: ImagePrompt[]; // prompts intended for Gemini 3 Image diagrams
}

export interface CourseIllustrationPlan {
  courseCover: ImagePrompt;
  modules: ModuleImagePlan[];
  model?: string;
  provider?: string;
}

const PlanSchema = z.object({
  courseCover: z.object({
    prompt: z.string(),
    rationale: z.string().optional(),
  }),
  modules: z.array(z.object({
    moduleId: z.string(),
    moduleTitle: z.string(),
    images: z.array(z.object({ prompt: z.string(), rationale: z.string().optional() })).min(1),
    diagrams: z.array(z.object({ prompt: z.string(), rationale: z.string().optional() })).default([]),
  })),
});

function buildPrompt(input: CoursePlanInput) {
  const { title, description, modules, locale } = input;
  const lang = locale === 'en' ? 'English' : 'Spanish';
  const moduleSummaries = modules
    .map((m, idx) => `Module ${idx + 1}: ${m.title}\n${m.content.slice(0, 1800)}`)
    .join('\n\n---\n\n');

  return `You are an illustration planning assistant. Work in ${lang}. Avoid using Gemini for planning; you only output prompts.
Return concise JSON. Constraints:
- At least 1 image prompt per module (non-Gemini provider like Runware/HF/Qwen). Keep density low: max 2 prompts per module.
- Diagram prompts (for Gemini 3 Image) only when a diagram truly clarifies something; 0-1 per module is okay.
- Course cover prompt: single image. ABSOLUTELY NO text/letters/typography/logos/watermarks. Conveys the course essence.
- Prompts must be short, direct, and visual. Avoid camera jargon unless helpful. Include subject, mood, setting. Prefer "no text" unless it's explicitly a diagram.
- Color: avoid a monotonous "always blue" look. Keep a dark, UI-friendly base, but choose accent colors that fit the topic (e.g., teal/amber/red/green/purple are OK). Use blue only when it makes sense; do not force it.
- Diagram prompts must explicitly mention it's a diagram/flow/schematic. Clean, high-contrast, dark UI friendly. Minimal labels are allowed for diagrams.

Course: ${title}
Description: ${description ?? 'n/a'}
Modules:
${moduleSummaries}

Respond as JSON matching schema { courseCover: {prompt, rationale?}, modules: [{moduleId,moduleTitle,images:[{prompt,rationale?}],diagrams:[{prompt,rationale?}]}] }.`;
}

export async function planCourseIllustrations(input: CoursePlanInput): Promise<CourseIllustrationPlan> {
  const client = new UnifiedLLMClient('deepseek_openai_claude'); // excludes Gemini
  const prompt = buildPrompt(input);

  const result = await client.generateText({
    prompt,
    maxTokens: 1800,
    temperature: 0.4,
  });

  let parsed: CourseIllustrationPlan | null = null;
  if (result.success && result.text) {
    try {
      const jsonStart = result.text.indexOf('{');
      const jsonString = jsonStart >= 0 ? result.text.slice(jsonStart) : result.text;
      const raw = JSON.parse(jsonString);
      const safe = PlanSchema.safeParse(raw);
      if (safe.success) {
        parsed = {
          courseCover: safe.data.courseCover,
          modules: safe.data.modules,
          model: result.model,
          provider: result.provider,
        };
      }
    } catch (error) {
      console.warn('[image-plan] Failed to parse plan JSON', error);
    }
  }

  if (!parsed) {
    // Fallback: at least one prompt per module, basic cover
    parsed = {
      courseCover: {
        prompt: `${input.title} – atmospheric minimalist cover, no text, dark high-contrast palette with topic-appropriate accent colors`,
        rationale: 'Fallback cover prompt',
      },
      modules: input.modules.map((m) => ({
        moduleId: m.id,
        moduleTitle: m.title,
        images: [{ prompt: `Key scene from ${m.title}, human-centric, expressive lighting, no text, dark background with topic-appropriate accent colors` }],
        diagrams: [],
      })),
      model: result.model,
      provider: result.provider,
    };
  }

  // Ensure at least one image per module
  parsed.modules = parsed.modules.map((m) => ({
    ...m,
    images: m.images.length
      ? m.images.slice(0, 2)
      : [{ prompt: `Signature visual for ${m.moduleTitle}, no text, dark high-contrast palette with topic-appropriate accent colors` }],
    diagrams: (m.diagrams || []).slice(0, 1),
  }));

  return parsed;
}
