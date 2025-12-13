import path from 'node:path';
import * as dotenv from 'dotenv';
import { createClient, type PostgrestError } from '@supabase/supabase-js';
import { generateIllustrationWithCascade, type ImageProviderName, type IllustrationCascadeResult } from '../lib/ai/image-cascade';
import { computeIllustrationChecksum } from '../lib/ai/illustration-utils';
import { persistModuleIllustration } from '../lib/db/module-illustrations';
import { normalizeVisualStyle, type VisualStyle } from '../lib/types/illustrations';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

type Locale = 'en' | 'es';

interface CourseSummaryRow {
  title_en: string;
  title_es: string;
}

interface ModuleRow {
  id: string;
  course_id: string;
  order_index: number;
  title_en: string;
  title_es: string;
  content_en: string | null;
  content_es: string | null;
  course: CourseSummaryRow | null;
}

interface HeaderSlotRow {
  id: string;
  summary: string | null;
  reason: string | null;
  heading: string | null;
  suggested_visual_style: string | null;
  block_index: number | null;
  confidence: number | null;
  llm_payload?: Record<string, unknown> | null;
}

interface VisualSlotRow {
  id: string;
  slot_type: 'header' | 'diagram' | 'inline';
  density: string | null;
  suggested_visual_style: string | null;
  block_index: number | null;
  heading: string | null;
  summary: string | null;
  reason: string | null;
  confidence: number | null;
  llm_payload?: Record<string, unknown> | null;
}

function isMissingVisualSlotsTable(error: unknown): boolean {
  if (!error) return false;
  const message = error instanceof Error ? error.message : JSON.stringify(error);
  return message.toLowerCase().includes('module_visual_slots');
}

let VARIANT_STYLES: VisualStyle[] = ['photorealistic'];
// Project rule: Runware ONLY for no-text images (no Gemini fallback).
const PROVIDER_ORDER_DEFAULT: ImageProviderName[] = ['runware'];
const PROVIDER_ORDER_DIAGRAM: ImageProviderName[] = ['gemini'];

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE credentials missing. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
  global: { headers: { 'X-Client-Info': 'ThotNet-IllustrationBackfill' } },
});

const args = process.argv.slice(2);
const limit = Math.max(1, parseInt(getArgValue('limit') ?? '4', 10));
const courseFilter = getArgValue('course');
const localeFilter = getArgValue('locale') as Locale | undefined;
const dryRun = args.includes('--dry-run');

function getArgValue(key: string): string | undefined {
  const prefix = `--${key}=`;
  const match = args.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : undefined;
}

async function hasHeaderIllustration(moduleId: string, locale: Locale): Promise<boolean> {
  const { count, error } = await supabase
    .from('module_illustrations')
    .select('id', { head: true, count: 'exact' })
    .eq('module_id', moduleId)
    .eq('locale', locale)
    .eq('style', 'header');

  if (error) {
    throw error;
  }

  return (count ?? 0) > 0;
}

async function fetchHeaderSlot(moduleId: string, locale: Locale): Promise<HeaderSlotRow | null> {
  const { data, error } = await supabase
    .from('module_visual_slots')
    .select('id, summary, reason, heading, suggested_visual_style, block_index, confidence, llm_payload')
    .eq('module_id', moduleId)
    .eq('locale', locale)
    .eq('slot_type', 'header')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    if (isMissingVisualSlotsTable(error)) {
      console.warn('⚠️ module_visual_slots table missing; skipping header slot enrichment');
      return null;
    }
    throw error;
  }

  return (data as HeaderSlotRow | null) ?? null;
}

async function fetchSupportingSlots(moduleId: string, locale: Locale): Promise<VisualSlotRow[]> {
  const { data, error } = await supabase
    .from('module_visual_slots')
    .select('id, slot_type, density, suggested_visual_style, block_index, heading, summary, reason, confidence, llm_payload')
    .eq('module_id', moduleId)
    .eq('locale', locale)
    .neq('slot_type', 'header');

  if (error && error.code !== 'PGRST116') {
    if (isMissingVisualSlotsTable(error)) {
      console.warn('⚠️ module_visual_slots table missing; skipping supporting slots');
      return [];
    }
    throw error;
  }

  return (data as VisualSlotRow[] | null) ?? [];
}

async function fetchCandidateModules(limitHint: number): Promise<ModuleRow[]> {
  const fetchLimit = Math.max(limitHint * 5, 10);
  let query = supabase
    .from('course_modules')
    .select(`
      id,
      course_id,
      order_index,
      title_en,
      title_es,
      content_en,
      content_es,
      course:courses(title_en,title_es)
    `)
    .order('updated_at', { ascending: false })
    .limit(fetchLimit);

  if (courseFilter) {
    query = query.eq('course_id', courseFilter);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  return (data as ModuleRow[] | null) ?? [];
}

function buildPromptContext(module: ModuleRow, locale: Locale, slot: HeaderSlotRow | null): string {
  const moduleTitle = locale === 'en' ? module.title_en : module.title_es;
  const courseTitle = module.course ? (locale === 'en' ? module.course.title_en : module.course.title_es) : 'ThotNet Core Course';
  const localizedContent = locale === 'en' ? module.content_en : module.content_es;
  const fallbackContent = locale === 'en' ? module.content_es : module.content_en;
  const payload: string[] = [];

  payload.push(`${courseTitle} → ${moduleTitle}`);

  if (slot?.summary) {
    payload.push(slot.summary);
  }
  if (slot?.reason) {
    payload.push(slot.reason);
  }

  const contentSource = localizedContent || fallbackContent;
  if (contentSource) {
    payload.push(contentSource.slice(0, 4000));
  }

  return payload.join('\n\n').trim() || `${moduleTitle} — ${courseTitle}`;
}

function buildSlotPromptContext(module: ModuleRow, locale: Locale, slot: VisualSlotRow): string {
  const moduleTitle = locale === 'en' ? module.title_en : module.title_es;
  const moduleContent = locale === 'en' ? module.content_en : module.content_es;
  const parts = [moduleTitle];
  if (slot.heading) parts.push(slot.heading);
  if (slot.summary) parts.push(slot.summary);
  if (slot.reason) parts.push(slot.reason);
  if (moduleContent) parts.push(moduleContent.slice(0, 4000));
  return parts.filter(Boolean).join('\n\n');
}

function getSlotPromptOverrides(slot: { llm_payload?: Record<string, unknown> | null }): {
  promptOverride?: string;
  negativePromptOverride?: string;
} {
  const payload = slot.llm_payload ?? null;
  if (!payload || typeof payload !== 'object') return {};

  const anyPayload = payload as Record<string, unknown>;

  const promptOverrideRaw =
    (typeof anyPayload.promptOverride === 'string' && anyPayload.promptOverride.trim()) ||
    (typeof anyPayload.prompt === 'string' && anyPayload.prompt.trim()) ||
    undefined;

  const negativePromptRaw =
    (typeof anyPayload.negativePrompt === 'string' && anyPayload.negativePrompt.trim()) ||
    (typeof anyPayload.negative_prompt === 'string' && anyPayload.negative_prompt.trim()) ||
    undefined;

  return {
    promptOverride: promptOverrideRaw,
    negativePromptOverride: negativePromptRaw,
  };
}

function defaultNoTextNegativePrompt(locale: Locale): string {
  const base = 'text, letters, words, typography, watermark, logo, caption, subtitles, label, signage';
  return locale === 'es' ? `${base}, texto, letras, palabras` : base;
}

async function generateWithRateLimitRetry(
  options: Parameters<typeof generateIllustrationWithCascade>[0],
  contextLabel: string,
  maxRetries = 3
): Promise<IllustrationCascadeResult> {
  let attempt = 0;
  let lastResult: IllustrationCascadeResult | null = null;

  while (attempt < maxRetries) {
    const result = await generateIllustrationWithCascade(options);
    lastResult = result;
    if (result.success && result.images.length) return result;

    if (!isRateLimitError(result.error)) {
      return result;
    }

    const delayMs = parseRetryDelayMs(result.error) ?? 32000;
    console.warn(`⏳ Rate limit hit (${contextLabel}), waiting ${Math.round(delayMs / 1000)}s before retry ${attempt + 1}/${maxRetries}`);
    await sleep(delayMs);
    attempt += 1;
  }

  return lastResult as IllustrationCascadeResult;
}

function isRateLimitError(error?: string): boolean {
  if (!error) return false;
  const lower = error.toLowerCase();
  return lower.includes('429') || lower.includes('resource_exhausted') || lower.includes('quota');
}

function parseRetryDelayMs(error?: string): number | null {
  if (!error) return null;
  const match = error.match(/retry in\s+([0-9]+(?:\.[0-9]+)?)s/i);
  if (match) {
    const seconds = Number(match[1]);
    if (!Number.isNaN(seconds) && seconds > 0) return Math.min(seconds * 1000, 60000);
  }
  return null;
}

async function generateForLocale(module: ModuleRow, locale: Locale): Promise<'generated' | 'skipped' | 'dry-run'> {
  const slot = await fetchHeaderSlot(module.id, locale);
  const visualStyle = normalizeVisualStyle(slot?.suggested_visual_style);
  const promptContext = buildPromptContext(module, locale, slot);
  const overrides = getSlotPromptOverrides(slot ?? {});
  const moduleTitle = locale === 'en' ? module.title_en : module.title_es;

  if (dryRun) {
    console.log(`🌀 [DRY RUN] Would generate header for ${moduleTitle} (${locale.toUpperCase()})`);
    return 'dry-run';
  }

  let generatedAny = false;
  for (const variant of VARIANT_STYLES) {
    const cascade = await generateWithRateLimitRetry({
      moduleContent: promptContext,
      locale,
      style: 'header',
      visualStyle: variant,
      providerOrder: PROVIDER_ORDER_DEFAULT,
      promptOverride: overrides.promptOverride,
      negativePromptOverride: overrides.negativePromptOverride ?? defaultNoTextNegativePrompt(locale),
    }, `${moduleTitle} (${locale}) header ${variant}`);

    const checksum = computeIllustrationChecksum({
      moduleId: module.id,
      content: promptContext,
      locale,
      style: 'header',
      visualStyle: variant,
      slotId: slot?.id ?? null,
      anchor: slot
        ? {
            slotType: 'header',
            blockIndex: slot.block_index,
            heading: slot.heading,
          }
        : null,
    });

    if (!cascade.success || !cascade.images.length) {
      console.warn(`⚠️ Illustration failed for variant ${variant} in ${moduleTitle} (${locale}). Attempts:`, cascade.attempts);
      continue;
    }

    const image = cascade.images[0];
    const persisted = await persistModuleIllustration({
      moduleId: module.id,
      locale,
      style: 'header',
      visualStyle: variant,
      model: cascade.model,
      provider: cascade.provider,
      base64Data: image.base64Data,
      mimeType: image.mimeType,
      prompt: cascade.prompt,
      source: 'script',
      slotId: slot?.id ?? null,
      anchor: slot
        ? {
            slotType: 'header',
            blockIndex: slot.block_index,
            heading: slot.heading,
            confidence: slot.confidence,
          }
        : null,
      checksum,
      metadata: {
        courseId: module.course_id,
        moduleOrder: module.order_index,
        script: 'backfill-module-illustrations',
        locale,
        variant,
      },
    });

    if (persisted) {
      generatedAny = true;
      console.log(`✅ Stored header (${variant}) for ${moduleTitle} [${locale.toUpperCase()}] via ${cascade.provider}/${cascade.model}`);
    } else {
      console.warn(`⚠️ Persist failed for ${moduleTitle} (${locale}) variant ${variant}.`);
    }

    await sleep(800);
  }

  return generatedAny ? 'generated' : 'skipped';
}

async function generateSupportingSlots(module: ModuleRow, locale: Locale): Promise<void> {
  const slots = await fetchSupportingSlots(module.id, locale);
  if (!slots.length) return;

  if (dryRun) {
    console.log(`🌀 [DRY RUN] Would generate ${slots.length} supporting slots for ${moduleTitleForLog(module, locale)} (${locale.toUpperCase()}).`);
    return;
  }

  for (const slot of slots) {
    const style = slot.slot_type === 'diagram' ? 'diagram' : 'conceptual';
    const variants = style === 'diagram' ? ['photorealistic'] : VARIANT_STYLES;
    const prompt = buildSlotPromptContext(module, locale, slot);
    const overrides = getSlotPromptOverrides(slot);
    const providerOrder = style === 'diagram' ? PROVIDER_ORDER_DIAGRAM : PROVIDER_ORDER_DEFAULT;

    for (const variant of variants) {
      const cascade = await generateWithRateLimitRetry({
        moduleContent: prompt,
        locale,
        style: style as 'conceptual' | 'diagram',
        visualStyle: variant as VisualStyle,
        providerOrder,
        promptOverride: overrides.promptOverride,
        negativePromptOverride: style === 'diagram'
          ? undefined
          : overrides.negativePromptOverride ?? defaultNoTextNegativePrompt(locale),
      }, `${moduleTitleForLog(module, locale)} slot ${slot.id} ${variant}`);

      const checksum = computeIllustrationChecksum({
        moduleId: module.id,
        content: prompt,
        locale,
        style,
        visualStyle: variant as VisualStyle,
        slotId: slot.id,
        anchor: {
          slotType: slot.slot_type,
          blockIndex: slot.block_index,
          heading: slot.heading,
        },
      });

      if (!cascade.success || !cascade.images.length) {
        console.warn(`⚠️ Illustration failed for slot ${slot.id} (${slot.slot_type}) variant ${variant} in module ${moduleTitleForLog(module, locale)}:`, cascade.error);
        continue;
      }

      const image = cascade.images[0];
      try {
        const persisted = await persistModuleIllustration({
          moduleId: module.id,
          locale,
          style,
          visualStyle: variant as VisualStyle,
          model: cascade.model,
          provider: cascade.provider,
          base64Data: image.base64Data,
          mimeType: image.mimeType,
          prompt: cascade.prompt,
          source: 'script',
          slotId: slot.id,
          anchor: {
            slotType: slot.slot_type,
            blockIndex: slot.block_index,
            heading: slot.heading,
            confidence: slot.confidence,
          },
          checksum,
          metadata: {
            moduleId: module.id,
            slotType: slot.slot_type,
            variant,
            script: 'backfill-module-illustrations',
          },
        });

        if (persisted) {
          console.log(`✅ Stored ${style} (${variant}) for slot ${slot.id} [${locale.toUpperCase()}]`);
        } else {
          console.warn(`⚠️ Persist failed for slot ${slot.id} (${variant}) in module ${moduleTitleForLog(module, locale)}`);
        }
      } catch (error) {
        console.error(`❌ Persist error for slot ${slot.id}:`, error);
      }

      await sleep(600);
    }
  }
}

function moduleTitleForLog(module: ModuleRow, locale: Locale) {
  return locale === 'en' ? module.title_en : module.title_es;
}

async function findTargets(limitToProcess: number, locales: Locale[]): Promise<Array<{ module: ModuleRow; locales: Locale[] }>> {
  const modules = await fetchCandidateModules(limitToProcess);
  const targets: Array<{ module: ModuleRow; locales: Locale[] }> = [];

  for (const module of modules) {
    const missingLocales: Locale[] = [];
    for (const locale of locales) {
      const exists = await hasHeaderIllustration(module.id, locale);
      if (!exists) {
        missingLocales.push(locale);
      }
    }

    if (missingLocales.length) {
      targets.push({ module, locales: missingLocales });
    }

    if (targets.length >= limitToProcess) {
      break;
    }
  }

  return targets;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const locales: Locale[] = localeFilter ? [localeFilter] : ['en', 'es'];
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║        COURSE HERO ILLUSTRATION BACKFILL (Gemini/Groq)       ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`🎯 Limit per run: ${limit}`);
  console.log(`🌐 Locales: ${locales.join(', ')}`);
  console.log(`📚 Course filter: ${courseFilter ?? 'All courses'}`);
  console.log(`🧪 Dry run: ${dryRun ? 'YES' : 'NO'}`);

  if (args.includes('--multi-variants')) {
    VARIANT_STYLES = ['photorealistic', 'anime'];
    console.warn('⚠️ Multi-variant mode enabled; ensure module_illustrations can store multiple variants per (module_id, locale, style).');
  }

  const targets = await findTargets(limit, locales);
  if (!targets.length) {
    console.log('✅ No modules need header illustrations.');
    return;
  }

  console.log(`📝 Selected ${targets.length} module(s) for processing.`);

  let generated = 0;
  let skipped = 0;
  let dry = 0;

  for (const target of targets) {
    const moduleTitle = localeFilter === 'es' ? target.module.title_es : target.module.title_en;
    console.log(`\n────────────── 📖 ${moduleTitle} ──────────────`);
    for (const locale of target.locales) {
      try {
        const result = await generateForLocale(target.module, locale);
        await generateSupportingSlots(target.module, locale);
        if (result === 'generated') generated += 1;
        else if (result === 'dry-run') dry += 1;
        else skipped += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : JSON.stringify(error);
        console.error(`❌ Failed to process ${target.module.id} (${locale}): ${message}`, error);
        skipped += 1;
      }
      await sleep(1500);
    }
  }

  console.log('\n════════════ SUMMARY ════════════');
  console.log(`✅ Generated: ${generated}`);
  if (dryRun) {
    console.log(`🌀 Dry-run slots: ${dry}`);
  }
  console.log(`⚠️ Skipped: ${skipped}`);
}

main().catch((error: PostgrestError | Error | unknown) => {
  const message = error instanceof Error ? error.message : (error as PostgrestError)?.message ?? String(error);
  console.error('❌ Illustration backfill failed:', message);
  process.exit(1);
});
