import path from 'node:path';
import * as dotenv from 'dotenv';
import { createClient, type PostgrestError } from '@supabase/supabase-js';
import { generateIllustrationWithCascade } from '../lib/ai/image-cascade';
import { computeIllustrationChecksum } from '../lib/ai/illustration-utils';
import { persistModuleIllustration } from '../lib/db/module-illustrations';
import { generateFallbackImage } from '../lib/utils/generate-fallback-image';
import type { VisualStyle } from '../lib/types/illustrations';

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
  suggested_visual_style: VisualStyle | null;
  block_index: number | null;
  confidence: number | null;
}

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
    .select('id, summary, reason, heading, suggested_visual_style, block_index, confidence')
    .eq('module_id', moduleId)
    .eq('locale', locale)
    .eq('slot_type', 'header')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  return (data as HeaderSlotRow | null) ?? null;
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

function buildFallbackAsset(title: string) {
  const dataUrl = generateFallbackImage({
    title: title.slice(0, 160),
    category: 'research',
    width: 1920,
    height: 1080,
  });
  const [prefix, data] = dataUrl.split(',', 2);
  const mimeMatch = prefix.match(/^data:(.*?);base64$/);
  return {
    base64: data ?? '',
    mime: mimeMatch?.[1] ?? 'image/svg+xml',
  };
}

async function generateForLocale(module: ModuleRow, locale: Locale): Promise<'generated' | 'fallback' | 'skipped' | 'dry-run'> {
  const slot = await fetchHeaderSlot(module.id, locale);
  const visualStyle = slot?.suggested_visual_style ?? 'photorealistic';
  const promptContext = buildPromptContext(module, locale, slot);
  const moduleTitle = locale === 'en' ? module.title_en : module.title_es;

  if (dryRun) {
    console.log(`🌀 [DRY RUN] Would generate header for ${moduleTitle} (${locale.toUpperCase()})`);
    return 'dry-run';
  }

  const cascade = await generateIllustrationWithCascade({
    moduleContent: promptContext,
    locale,
    style: 'header',
    visualStyle,
  });

  const checksum = computeIllustrationChecksum({
    moduleId: module.id,
    content: promptContext,
    locale,
    style: 'header',
    visualStyle,
    slotId: slot?.id ?? null,
    anchor: slot
      ? {
          slotType: 'header',
          blockIndex: slot.block_index,
          heading: slot.heading,
        }
      : null,
  });

  if (cascade.success && cascade.images.length) {
    const image = cascade.images[0];
    const persisted = await persistModuleIllustration({
      moduleId: module.id,
      locale,
      style: 'header',
      visualStyle,
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
      },
    });

    if (!persisted) {
      console.warn(`⚠️ Persist failed for ${moduleTitle} (${locale}).`);
      return 'skipped';
    }

    console.log(`✅ Stored header for ${moduleTitle} [${locale.toUpperCase()}] via ${cascade.provider}/${cascade.model}`);
    return 'generated';
  }

  console.warn(`⚠️ Cascade failed for ${moduleTitle} (${locale}). Using fallback.`);
  const fallback = buildFallbackAsset(moduleTitle);
  const persistedFallback = await persistModuleIllustration({
    moduleId: module.id,
    locale,
    style: 'header',
    visualStyle,
    model: 'svg-fallback',
    provider: 'fallback',
    base64Data: fallback.base64,
    mimeType: fallback.mime,
    prompt: promptContext,
    source: 'fallback-script',
    slotId: slot?.id ?? null,
    anchor: slot
      ? {
          slotType: 'header',
          blockIndex: slot.block_index,
          heading: slot.heading,
        }
      : null,
    checksum,
    metadata: {
      courseId: module.course_id,
      fallback: true,
      script: 'backfill-module-illustrations',
      locale,
    },
  });

  if (!persistedFallback) {
    console.error(`❌ Failed to persist fallback for ${moduleTitle} (${locale}).`);
    return 'skipped';
  }

  console.log(`🛡️ Stored fallback header for ${moduleTitle} [${locale.toUpperCase()}].`);
  return 'fallback';
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

  const targets = await findTargets(limit, locales);
  if (!targets.length) {
    console.log('✅ No modules need header illustrations.');
    return;
  }

  console.log(`📝 Selected ${targets.length} module(s) for processing.`);

  let generated = 0;
  let fallback = 0;
  let skipped = 0;
  let dry = 0;

  for (const target of targets) {
    const moduleTitle = localeFilter === 'es' ? target.module.title_es : target.module.title_en;
    console.log(`\n────────────── 📖 ${moduleTitle} ──────────────`);
    for (const locale of target.locales) {
      try {
        const result = await generateForLocale(target.module, locale);
        if (result === 'generated') generated += 1;
        else if (result === 'fallback') fallback += 1;
        else if (result === 'dry-run') dry += 1;
        else skipped += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`❌ Failed to process ${target.module.id} (${locale}): ${message}`);
        skipped += 1;
      }
      await sleep(1500);
    }
  }

  console.log('\n════════════ SUMMARY ════════════');
  console.log(`✅ Generated: ${generated}`);
  console.log(`🛡️  Fallbacks: ${fallback}`);
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
