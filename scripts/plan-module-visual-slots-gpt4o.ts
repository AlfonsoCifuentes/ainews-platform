#!/usr/bin/env tsx

import { config as loadEnv } from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { z } from 'zod';

const envLocal = resolve(process.cwd(), '.env.local');
if (existsSync(envLocal)) {
  loadEnv({ path: envLocal });
} else {
  loadEnv();
}

import { getSupabaseServerClient } from '../lib/db/supabase';
import { createLLMClient, type LLMClient } from '../lib/ai/llm-client';
import { buildVerticalVoiceSystemPrompt } from '../lib/ai/prompt-voice';
import { OPENAI_MODELS } from '../lib/ai/model-versions';
import { replaceModuleVisualSlots } from '../lib/db/module-visual-slots';
import type { ModuleVisualSlotInput } from '../lib/types/visual-slots';

type Locale = 'en' | 'es';

function readArgValue(name: string): string | undefined {
  const envKey = `npm_config_${name.replace(/^--/, '').replace(/-/g, '_')}`;
  const fromEnv = process.env[envKey];
  if (typeof fromEnv === 'string' && fromEnv.trim() !== '') return fromEnv.trim();

  const eqPrefix = `${name}=`;
  const eq = process.argv.find((a) => a.startsWith(eqPrefix));
  if (eq) return eq.slice(eqPrefix.length);

  const idx = process.argv.indexOf(name);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

function hasFlag(name: string): boolean {
  const envKey = `npm_config_${name.replace(/^--/, '').replace(/-/g, '_')}`;
  const raw = (process.env[envKey] || '').trim().toLowerCase();
  if (raw === 'true' || raw === '1' || raw === 'yes') return true;
  if (process.argv.includes(name)) return true;
  const eqPrefix = `${name}=`;
  const eq = process.argv.find((a) => a.startsWith(eqPrefix));
  if (!eq) return false;
  const value = eq.slice(eqPrefix.length).trim().toLowerCase();
  if (value === '') return true;
  return value === 'true' || value === '1' || value === 'yes';
}

function readArgNumber(name: string, defaultValue: number): number {
  const raw = readArgValue(name);
  if (!raw) return defaultValue;
  const n = Number(raw);
  return Number.isFinite(n) ? n : defaultValue;
}

// Keep parity with the UI parser so block indexes match `TextbookView`.
function parseContentIntoBlocks(rawContent: string): Array<{ type: string; content: string; items?: string[] } > {
  const blocks: Array<{ type: string; content: string; items?: string[] }> = [];

  let content = rawContent
    .replace(
      /<div[^>]*style=["'][^"']*border[^"']*["'][^>]*>\s*<b>([^<]+)<\/b>\s*(?:<br\s*\/?>)?\s*([\s\S]*?)<\/div>/gi,
      (_, title, body) => {
        const cleanBody = String(body)
          .replace(/<\/?(div|span|b|br|i|em|strong|p)[^>]*>/gi, '')
          .trim();
        return `\n:::didyouknow[${String(title).trim()}]\n${cleanBody}\n:::\n`;
      }
    )
    .replace(/<div[^>]*style=["'][^"']*["'][^>]*>([\s\S]*?)<\/div>/gi, (_, inner) => {
      return String(inner).replace(/<\/?(b|br|i|em|strong|span)[^>]*>/gi, '').trim();
    });

  content = content
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(?:div|span|b|i|em|strong|p)[^>]*>/gi, '')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n');

  const lines = content.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) {
      i += 1;
      continue;
    }

    const h1Match = line.match(/^#\s*(.+)$/);
    if (h1Match && !line.startsWith('##')) {
      blocks.push({ type: 'heading1', content: h1Match[1].trim() });
      i += 1;
      continue;
    }
    const h2Match = line.match(/^##\s*(.+)$/);
    if (h2Match && !line.startsWith('###')) {
      blocks.push({ type: 'heading2', content: h2Match[1].trim() });
      i += 1;
      continue;
    }
    const h3Match = line.match(/^###\s*(.+)$/);
    if (h3Match) {
      blocks.push({ type: 'heading3', content: h3Match[1].trim() });
      i += 1;
      continue;
    }

    const calloutMatch = line.match(/^:::(\w+)(?:\[([^\]]*)\])?/);
    if (calloutMatch) {
      const calloutTitle = calloutMatch[2] || '';
      const calloutLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith(':::')) {
        calloutLines.push(lines[i]);
        i++;
      }
      i++;
      blocks.push({
        type: calloutMatch[1].toLowerCase(),
        content: calloutTitle ? `**${calloutTitle}**\n\n${calloutLines.join('\n').trim()}` : calloutLines.join('\n').trim(),
      });
      continue;
    }

    if (line.startsWith('> ')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('> ')) {
        quoteLines.push(lines[i].trim().slice(2));
        i++;
      }
      blocks.push({ type: 'quote', content: quoteLines.join('\n') });
      continue;
    }

    if (line.startsWith('- ') || line.startsWith('* ')) {
      const listItems: string[] = [];
      while (i < lines.length && (lines[i].trim().startsWith('- ') || lines[i].trim().startsWith('* '))) {
        listItems.push(lines[i].trim().slice(2));
        i++;
      }
      blocks.push({ type: 'list', content: '', items: listItems });
      continue;
    }

    if (/^\d+\.\s/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        listItems.push(lines[i].trim().replace(/^\d+\.\s/, ''));
        i++;
      }
      blocks.push({ type: 'numbered-list', content: '', items: listItems });
      continue;
    }

    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++;
      blocks.push({ type: 'code', content: codeLines.join('\n') || '', items: lang ? [lang] : undefined });
      continue;
    }

    if (line.includes('|') && line.startsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].includes('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      blocks.push({ type: 'table', content: tableLines.join('\n') });
      continue;
    }

    const paragraphLines: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trim().startsWith('#') &&
      !lines[i].trim().startsWith('-') &&
      !lines[i].trim().startsWith('*') &&
      !lines[i].trim().startsWith('>') &&
      !lines[i].trim().startsWith('```') &&
      !lines[i].trim().startsWith(':::') &&
      !lines[i].trim().startsWith('|') &&
      !/^\d+\.\s/.test(lines[i].trim())
    ) {
      paragraphLines.push(lines[i].trim());
      i++;
    }

    blocks.push({ type: 'paragraph', content: paragraphLines.join(' ') });
  }

  return blocks;
}

const VisualStyleSchema = z.enum(['photorealistic', 'anime']);
const DensitySchema = z.enum(['minimal', 'balanced', 'immersive']);

const PlannedSlotSchema = z.object({
  slotType: z.enum(['header', 'diagram', 'inline']),
  density: DensitySchema.optional(),
  suggestedVisualStyle: VisualStyleSchema.optional(),
  blockIndex: z.number().int().min(0).nullable().optional(),
  heading: z.string().min(1).max(280).nullable().optional(),
  caption: z.string().min(1).max(220).nullable().optional(),
  summary: z.string().min(1).max(2000).nullable().optional(),
  reason: z.string().min(1).max(2000).nullable().optional(),
  confidence: z.number().min(0).max(1).optional(),
  // Prompts to use downstream
  promptOverride: z.string().min(10).max(4000),
  negativePrompt: z.string().max(2000).optional(),
});

const VisualPlanSchema = z.object({
  density: DensitySchema.default('balanced'),
  slots: z.array(PlannedSlotSchema).max(8),
});

type VisualPlan = z.infer<typeof VisualPlanSchema>;

function defaultNoTextNegativePrompt(locale: Locale): string {
  const base = 'text, letters, words, typography, watermark, logo, caption, subtitles, label, signage';
  return locale === 'es' ? `${base}, texto, letras, palabras` : base;
}

type ModuleRow = {
  id: string;
  course_id: string;
  order_index: number;
  title_en: string;
  title_es: string;
  content_en: string | null;
  content_es: string | null;
  course: { title_en: string; title_es: string } | null;
};

function renderBlocksForPrompt(blocks: Array<{ type: string; content: string; items?: string[] }>, max = 60): string {
  return blocks
    .slice(0, max)
    .map((b, idx) => {
      const snippet = (b.content || '').replace(/\s+/g, ' ').trim().slice(0, 200);
      const list = b.items?.length ? ` [${b.items.slice(0, 6).join(' | ').slice(0, 180)}]` : '';
      return `${idx}. ${b.type}: ${snippet}${list}`.trim();
    })
    .join('\n');
}

async function planSlotsWithGpt4o(llm: LLMClient, input: {
  locale: Locale;
  courseTitle: string;
  moduleTitle: string;
  content: string;
  blocks: string;
}): Promise<VisualPlan> {
  const system = buildVerticalVoiceSystemPrompt({ locale: input.locale, vertical: 'courses' });

  const prompt = `You are planning visuals for a textbook-like module.

Goal:
- Decide which visuals (illustrations vs diagrams) help understanding, and WHERE to place them.
- Output JSON only.

Constraints:
- Keep density reasonable: minimal/balanced/immersive depending on length and complexity.
- Prefer 1 header image only when it truly helps (optional).
- Use inline figures to support key explanations, not decoration.
- For slotType=inline: this will be generated with Runware (HiDream-I1-Fast runware:97@3). MUST be NO-TEXT.
- For slotType=diagram: this will be generated with Gemini 3 Image and MAY include labels/text.

Hard rules:
- For inline/header prompts: include an explicit NO TEXT rule inside promptOverride.
- For inline/header negativePrompt: include "text, letters, words, typography" (and similar) to suppress any text.
- For diagram prompts: ask for a clear labeled technical diagram; include the key labels.
- blockIndex must refer to the following block list (0-based index). Use null only for header.

Context:
Course: ${input.courseTitle}
Module: ${input.moduleTitle}

Blocks (0-based):
${input.blocks}

Return ONLY JSON in this format:
{
  "density": "minimal"|"balanced"|"immersive",
  "slots": [
    {
      "slotType": "header"|"inline"|"diagram",
      "blockIndex": number|null,
      "heading": string|null,
      "caption": string|null,
      "summary": string|null,
      "reason": string|null,
      "suggestedVisualStyle": "photorealistic"|"anime",
      "confidence": 0..1,
      "promptOverride": string,
      "negativePrompt": string
    }
  ]
}`;

  return llm.classify(prompt, VisualPlanSchema, system);
}

async function main(): Promise<void> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing Supabase credentials (NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)');
  }
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('Missing OPENAI_API_KEY (required for GPT-4o visual planning)');
  }

  const dryRun = hasFlag('--dry-run');
  const limit = readArgNumber('--limit', 5);
  const courseFilter = (readArgValue('--course') || '').trim() || undefined;
  const moduleFilter = (readArgValue('--module') || '').trim() || undefined;
  const localeFilter = (readArgValue('--locale') || '').trim().toLowerCase() as Locale | '';

  const locales: Locale[] = localeFilter === 'en' || localeFilter === 'es' ? [localeFilter] : ['en', 'es'];

  console.log('[PlanVisualSlots] Starting...');
  console.log(`[PlanVisualSlots] dryRun=${dryRun} limit=${limit} course=${courseFilter ?? '-'} module=${moduleFilter ?? '-'} locales=${locales.join(',')}`);

  const db = getSupabaseServerClient();

  if (!dryRun) {
    const preflight = await db.from('module_visual_slots').select('id').limit(1);
    if (preflight.error && (preflight.error as any).code === 'PGRST205') {
      throw new Error(
        "Supabase schema is missing table 'public.module_visual_slots'. " +
          'Apply migrations first (contains 20251202_add_module_visual_slots.sql). ' +
          "If you use Supabase CLI: run 'supabase link --project-ref <your-ref>' then 'supabase db push'."
      );
    }
  }

  let query = db
    .from('course_modules')
    .select('id, course_id, order_index, title_en, title_es, content_en, content_es, course:courses(title_en,title_es)')
    .order('updated_at', { ascending: false })
    .limit(Math.max(limit, 1));

  if (courseFilter) query = query.eq('course_id', courseFilter);
  if (moduleFilter) query = query.eq('id', moduleFilter);

  const { data, error } = await query;
  if (error) throw new Error(`[PlanVisualSlots] Failed to fetch modules: ${error.message}`);

  const modules = (data ?? []) as ModuleRow[];
  if (!modules.length) {
    console.log('[PlanVisualSlots] No modules found.');
    return;
  }

  const llm = createLLMClient('openai', OPENAI_MODELS.GPT_4O);
  console.log(`[PlanVisualSlots] ✓ Using OpenAI (${OPENAI_MODELS.GPT_4O})`);

  let planned = 0;
  let stored = 0;
  let failed = 0;

  for (const module of modules) {
    for (const locale of locales) {
      const moduleTitle = locale === 'en' ? module.title_en : module.title_es;
      const courseTitle = module.course ? (locale === 'en' ? module.course.title_en : module.course.title_es) : 'Course';
      const content = (locale === 'en' ? module.content_en : module.content_es) || (locale === 'en' ? module.content_es : module.content_en) || '';

      if (!content.trim()) {
        console.warn(`[PlanVisualSlots] Skip empty content: ${module.id} (${locale})`);
        continue;
      }

      const blocks = parseContentIntoBlocks(content);
      const blocksText = renderBlocksForPrompt(blocks);

      try {
        const plan = await planSlotsWithGpt4o(llm, {
          locale,
          courseTitle,
          moduleTitle,
          content,
          blocks: blocksText,
        });

        planned += 1;

        const slots: ModuleVisualSlotInput[] = plan.slots.map((slot) => ({
          moduleId: module.id,
          locale,
          slotType: slot.slotType,
          density: slot.density ?? plan.density,
          suggestedVisualStyle: slot.suggestedVisualStyle ?? 'photorealistic',
          blockIndex: slot.slotType === 'header' ? null : (slot.blockIndex ?? null),
          heading: slot.heading ?? slot.caption ?? null,
          summary: slot.summary ?? null,
          reason: slot.reason ?? null,
          llmPayload: {
            caption: slot.caption ?? null,
            promptOverride: slot.promptOverride,
            negativePrompt:
              slot.slotType === 'diagram'
                ? null
                : (slot.negativePrompt && slot.negativePrompt.trim())
                  ? slot.negativePrompt.trim()
                  : defaultNoTextNegativePrompt(locale),
          },
          provider: 'openai',
          model: OPENAI_MODELS.GPT_4O,
          confidence: slot.confidence ?? 0.75,
        }));

        if (dryRun) {
          console.log(`[PlanVisualSlots] DRY-RUN planned ${slots.length} slots for ${module.id} (${locale})`);
          continue;
        }

        await replaceModuleVisualSlots(module.id, locale, slots);
        stored += 1;
        console.log(`[PlanVisualSlots] Stored ${slots.length} slots for ${module.id} (${locale})`);
      } catch (e) {
        failed += 1;
        const details = (() => {
          if (e instanceof Error) return e.stack || e.message;
          try {
            return JSON.stringify(e);
          } catch {
            return String(e);
          }
        })();
        console.warn(`[PlanVisualSlots] Failed for ${module.id} (${locale}): ${details}`);
      }
    }
  }

  console.log(`[PlanVisualSlots] Done. Planned: ${planned}, stored: ${stored}, failed: ${failed}, dryRun: ${dryRun}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[PlanVisualSlots] Fatal:', err instanceof Error ? err.message : err);
    process.exit(1);
  });
