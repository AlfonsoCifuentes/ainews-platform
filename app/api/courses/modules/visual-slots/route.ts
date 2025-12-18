import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { replaceModuleVisualSlots, fetchModuleVisualSlots } from '@/lib/db/module-visual-slots';
import { getSupabaseServerClient } from '@/lib/db/supabase';
import { VISUAL_DENSITIES, VISUAL_STYLES } from '@/lib/types/illustrations';
import type { ModuleVisualSlotType } from '@/lib/types/visual-slots';

const QuerySchema = z.object({
  moduleId: z.string().uuid(),
  locale: z.enum(['en', 'es']).default('en'),
  slotType: z.enum(['header', 'diagram', 'inline'] as const).optional(),
  limit: z.coerce.number().min(1).max(50).optional(),
  ensure: z.coerce.boolean().optional().default(false),
});

const SlotSchema = z.object({
  slotType: z.enum(['header', 'diagram', 'inline'] as const),
  density: z.enum(VISUAL_DENSITIES).optional(),
  suggestedVisualStyle: z.enum(VISUAL_STYLES).optional(),
  blockIndex: z.number().int().min(0).nullable().optional(),
  heading: z.string().min(1).max(280).optional(),
  summary: z.string().min(1).max(2000).optional(),
  reason: z.string().min(1).max(2000).optional(),
  llmPayload: z.record(z.any()).optional(),
  provider: z.string().optional(),
  model: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
});

const BodySchema = z.object({
  moduleId: z.string().uuid(),
  locale: z.enum(['en', 'es']),
  slots: z.array(SlotSchema),
});

function shouldFallbackToEmpty(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  const message = ((error as { message?: string } | null)?.message || '').toLowerCase();

  // Gracefully degrade when the table is missing or RLS blocks access (seen in early deploys)
  return (
    code === '42P01' || // table does not exist
    code === '42501' || // insufficient_privilege
    message.includes('permission denied') ||
    message.includes('does not exist')
  );
}

function cleanHeadingText(raw: string): string {
  return String(raw ?? '')
    .replace(/^#+\s*/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isNoisyHeading(raw: string | null | undefined): boolean {
  const cleaned = cleanHeadingText(raw ?? '');
  if (!cleaned) return false;

  if (/^["“”]/.test(cleaned)) {
    const quoteCount = (cleaned.match(/["“”]/g) || []).length;
    // Incomplete quote headings like `"En` are a common artifact; skip them.
    if (quoteCount < 2) return true;
  }

  const stripped = cleaned.replace(/^["“”]+/, '').trim();
  if (stripped.length <= 12 && /^en(\s+la)?$/i.test(stripped)) return true;

  return false;
}

function isSlotCorrupted(slot: { heading?: string | null; summary?: string | null; reason?: string | null }): boolean {
  const headingLength = (slot.heading ?? '').length;
  const summaryLength = (slot.summary ?? '').length;
  const reasonLength = (slot.reason ?? '').length;

  // Keep parity with the POST schema constraints.
  return headingLength > 280 || summaryLength > 2000 || reasonLength > 2000 || isNoisyHeading(slot.heading);
}

// Keep parity with `scripts/plan-module-visual-slots-gpt4o.ts` and the UI parser so block indexes are usable.
function parseContentIntoBlocks(rawContent: string): Array<{ type: string; content: string; items?: string[] }> {
  const blocks: Array<{ type: string; content: string; items?: string[] }> = [];

  let content = rawContent
    .replace(
      /<div[^>]*style=["'][^"']*border[^"']*["'][^>]*>\s*<b>([^<]+)<\/b>\s*(?:<br\s*\/?>(?:\s*)?)?\s*([\s\S]*?)<\/div>/gi,
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
    .replace(/<br\s*\/?>(?:\s*)?/gi, '\n')
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
      blocks.push({ type: 'heading1', content: cleanHeadingText(h1Match[1]) });
      i += 1;
      continue;
    }
    const h2Match = line.match(/^##\s*(.+)$/);
    if (h2Match && !line.startsWith('###')) {
      blocks.push({ type: 'heading2', content: cleanHeadingText(h2Match[1]) });
      i += 1;
      continue;
    }
    const h3Match = line.match(/^###\s*(.+)$/);
    if (h3Match) {
      blocks.push({ type: 'heading3', content: cleanHeadingText(h3Match[1]) });
      i += 1;
      continue;
    }

    const calloutMatch = line.match(/^:::(\w+)(?:\[([^\]]*)\])?/);
    if (calloutMatch) {
      const calloutTitle = calloutMatch[2] || '';
      const calloutLines: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith(':::')) {
        calloutLines.push(lines[i]);
        i += 1;
      }
      i += 1;
      blocks.push({
        type: calloutMatch[1].toLowerCase(),
        content: calloutTitle
          ? `**${calloutTitle}**\n\n${calloutLines.join('\n').trim()}`
          : calloutLines.join('\n').trim(),
      });
      continue;
    }

    if (line.startsWith('> ')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('> ')) {
        quoteLines.push(lines[i].trim().slice(2));
        i += 1;
      }
      blocks.push({ type: 'quote', content: quoteLines.join('\n') });
      continue;
    }

    if (line.startsWith('- ') || line.startsWith('* ')) {
      const listItems: string[] = [];
      while (i < lines.length && (lines[i].trim().startsWith('- ') || lines[i].trim().startsWith('* '))) {
        listItems.push(lines[i].trim().slice(2));
        i += 1;
      }
      blocks.push({ type: 'list', content: '', items: listItems });
      continue;
    }

    if (/^\d+\.\s/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        listItems.push(lines[i].trim().replace(/^\d+\.\s/, ''));
        i += 1;
      }
      blocks.push({ type: 'numbered-list', content: '', items: listItems });
      continue;
    }

    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i += 1;
      }
      i += 1;
      blocks.push({ type: 'code', content: codeLines.join('\n') || '', items: lang ? [lang] : undefined });
      continue;
    }

    if (line.includes('|') && line.startsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].includes('|')) {
        tableLines.push(lines[i]);
        i += 1;
      }
      blocks.push({ type: 'table', content: tableLines.join('\n') });
      continue;
    }

    const paragraphLines: string[] = [line];
    i += 1;
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
      i += 1;
    }

    blocks.push({ type: 'paragraph', content: paragraphLines.join(' ') });
  }

  return blocks;
}

function pickSectionHeading(blocks: Array<{ type: string; content: string }>, aroundIndex: number): string | null {
  for (let i = Math.min(aroundIndex, blocks.length - 1); i >= 0; i -= 1) {
    const b = blocks[i];
    if (b.type === 'heading2' || b.type === 'heading1' || b.type === 'heading3') {
      if (isNoisyHeading(b.content)) continue;
      return b.content;
    }
  }
  return null;
}

function buildHeuristicSlots(args: {
  moduleId: string;
  locale: 'en' | 'es';
  moduleTitle: string;
  moduleContent: string;
}) {
  const blocks = parseContentIntoBlocks(args.moduleContent);
  const total = blocks.length || 1;

  const inlineA = Math.max(2, Math.floor(total * 0.18));
  const diagram = Math.max(3, Math.floor(total * 0.36));
  const inlineB = Math.max(4, Math.floor(total * 0.62));

  const languageLabel = args.locale === 'es' ? 'Spanish' : 'English';
  const noTextNegative = args.locale === 'es'
    ? 'texto, letras, palabras, tipografía, marca de agua, logo, caption'
    : 'text, letters, words, typography, watermark, logo, caption';

  const headerPrompt = args.locale === 'es'
    ? `Portada ilustrada estilo libro para el módulo "${args.moduleTitle}". Ilustración educativa, limpia, moderna, sin texto, sin letras, sin logotipos. Fondo oscuro elegante, tema IA/tecnología.`
    : `Book-style cover illustration for the module "${args.moduleTitle}". Educational, clean, modern, no text, no letters, no logos. Elegant dark background, AI/technology theme.`;

  const diagramHeading = pickSectionHeading(blocks, diagram) ?? args.moduleTitle;
  const diagramPrompt = args.locale === 'es'
    ? `Crea un diagrama didáctico claro (con cajas y flechas) sobre "${diagramHeading}". Incluye etiquetas cortas en Español. Estilo limpio, alto contraste, legible.`
    : `Create a clear didactic diagram (boxes and arrows) explaining "${diagramHeading}". Include short labels in English. Clean style, high contrast, readable.`;

  const inlinePrompt = (heading: string | null) => (args.locale === 'es'
    ? `Ilustración educativa para explicar "${heading ?? args.moduleTitle}". Sin texto, sin letras, sin marcas. Estilo conceptual, claro, minimalista, enfoque didáctico.`
    : `Educational illustration to explain "${heading ?? args.moduleTitle}". No text, no letters, no branding. Conceptual, clear, minimalist, didactic.`);

  return [
    {
      moduleId: args.moduleId,
      locale: args.locale,
      slotType: 'header' as const,
      density: 'balanced' as const,
      suggestedVisualStyle: 'photorealistic' as const,
      blockIndex: null,
      heading: args.moduleTitle,
      summary: args.locale === 'es' ? 'Ilustración principal del módulo' : 'Main module illustration',
      reason: args.locale === 'es'
        ? 'Añade contexto visual inmediato y mejora la retención.'
        : 'Adds immediate visual context and improves retention.',
      llmPayload: {
        promptOverride: headerPrompt,
        negativePrompt: noTextNegative,
        labelLanguage: languageLabel,
      },
      provider: 'heuristic',
      model: null,
      confidence: 0.6,
    },
    {
      moduleId: args.moduleId,
      locale: args.locale,
      slotType: 'diagram' as const,
      density: 'balanced' as const,
      suggestedVisualStyle: 'photorealistic' as const,
      blockIndex: diagram,
      heading: diagramHeading,
      summary: args.locale === 'es' ? 'Esquema visual del concepto' : 'Visual schema of the concept',
      reason: args.locale === 'es'
        ? 'Convierte abstracciones en un esquema paso a paso.'
        : 'Turns abstractions into a step-by-step schema.',
      llmPayload: {
        promptOverride: diagramPrompt,
        negativePrompt: undefined,
        labelLanguage: languageLabel,
      },
      provider: 'heuristic',
      model: null,
      confidence: 0.55,
    },
    {
      moduleId: args.moduleId,
      locale: args.locale,
      slotType: 'inline' as const,
      density: 'balanced' as const,
      suggestedVisualStyle: 'photorealistic' as const,
      blockIndex: inlineA,
      heading: pickSectionHeading(blocks, inlineA) ?? args.moduleTitle,
      summary: args.locale === 'es' ? 'Ilustración de apoyo' : 'Supporting illustration',
      reason: args.locale === 'es'
        ? 'Refuerza la idea clave justo cuando aparece.'
        : 'Reinforces the key idea right when it appears.',
      llmPayload: {
        promptOverride: inlinePrompt(pickSectionHeading(blocks, inlineA)),
        negativePrompt: noTextNegative,
        labelLanguage: languageLabel,
      },
      provider: 'heuristic',
      model: null,
      confidence: 0.5,
    },
    {
      moduleId: args.moduleId,
      locale: args.locale,
      slotType: 'inline' as const,
      density: 'balanced' as const,
      suggestedVisualStyle: 'photorealistic' as const,
      blockIndex: inlineB,
      heading: pickSectionHeading(blocks, inlineB) ?? args.moduleTitle,
      summary: args.locale === 'es' ? 'Ilustración de apoyo' : 'Supporting illustration',
      reason: args.locale === 'es'
        ? 'Ayuda a mantener el ritmo y la atención.'
        : 'Helps maintain pacing and attention.',
      llmPayload: {
        promptOverride: inlinePrompt(pickSectionHeading(blocks, inlineB)),
        negativePrompt: noTextNegative,
        labelLanguage: languageLabel,
      },
      provider: 'heuristic',
      model: null,
      confidence: 0.5,
    },
  ];
}

export async function GET(request: NextRequest) {
  try {
    const params = QuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    let slots: Awaited<ReturnType<typeof fetchModuleVisualSlots>> = [];

    try {
      slots = await fetchModuleVisualSlots({
        moduleId: params.moduleId,
        locale: params.locale,
        slotType: params.slotType as ModuleVisualSlotType | undefined,
        limit: params.limit,
      });
    } catch (fetchError) {
      console.warn('[API/visual-slots] GET fallback to empty', fetchError);
      if (!shouldFallbackToEmpty(fetchError)) {
        return NextResponse.json(
          { success: true, slots: [], warning: 'visual slots unavailable', error: String(fetchError) },
          { status: 200 }
        );
      }
      slots = [];
    }

    const shouldEnsure = params.ensure && (slots.length === 0 || slots.some(isSlotCorrupted));
    if (shouldEnsure) {
      try {
        const db = getSupabaseServerClient();
        const { data: moduleRow } = await db
          .from('course_modules')
          .select('id, title_en, title_es, content_en, content_es')
          .eq('id', params.moduleId)
          .maybeSingle();

        const moduleTitle = params.locale === 'es' ? moduleRow?.title_es : moduleRow?.title_en;
        const moduleContent = params.locale === 'es' ? moduleRow?.content_es : moduleRow?.content_en;

        if (typeof moduleTitle === 'string' && moduleTitle.trim() && typeof moduleContent === 'string' && moduleContent.trim()) {
          const planned = buildHeuristicSlots({
            moduleId: params.moduleId,
            locale: params.locale,
            moduleTitle: moduleTitle.trim(),
            moduleContent,
          });

          const stored = await replaceModuleVisualSlots(params.moduleId, params.locale, planned);
          slots = stored
            .filter((slot) => (params.slotType ? slot.slotType === params.slotType : true))
            .slice(0, params.limit ?? stored.length);
        }
      } catch (ensureError) {
        console.warn('[API/visual-slots] ensure failed, returning empty', ensureError);
      }
    }

    return NextResponse.json({ success: true, slots });
  } catch (error) {
    console.error('[API/visual-slots] GET error', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Invalid query', details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: 'Failed to fetch visual slots' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = BodySchema.parse(body);

    const slotsPayload = parsed.slots.map((slot) => ({
      moduleId: parsed.moduleId,
      locale: parsed.locale,
      slotType: slot.slotType,
      density: slot.density,
      suggestedVisualStyle: slot.suggestedVisualStyle,
      blockIndex: slot.blockIndex ?? null,
      heading: slot.heading ?? null,
      summary: slot.summary ?? null,
      reason: slot.reason ?? null,
      llmPayload: slot.llmPayload ?? null,
      provider: slot.provider ?? 'cascade',
      model: slot.model ?? null,
      confidence: slot.confidence ?? 0.75,
    }));

    const stored = await replaceModuleVisualSlots(parsed.moduleId, parsed.locale, slotsPayload);

    return NextResponse.json({ success: true, slots: stored });
  } catch (error) {
    console.error('[API/visual-slots] POST error', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Invalid payload', details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: 'Failed to save visual slots' }, { status: 500 });
  }
}
