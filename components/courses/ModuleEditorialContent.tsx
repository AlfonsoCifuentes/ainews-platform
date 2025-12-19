'use client';

import { useMemo } from 'react';
import { ModuleIllustration } from '@/components/courses/ModuleIllustration';
import type { ModuleVisualSlot } from '@/lib/types/visual-slots';
import { getIllustrationStyleForSlot } from '@/lib/utils/visual-slots';
import { parseContentIntoBlocks, type ContentBlock } from '@/components/courses/TextbookView';
import {
  CalloutBox,
  CodeBlock,
  FormattedText,
  ListBlock,
  QuoteBlock,
  TableBlock,
} from '@/components/courses/TextbookComponents';

function selectIntegratedSlots(allSlots: ModuleVisualSlot[], moduleTitle: string): ModuleVisualSlot[] {
  const slots = allSlots.filter((slot) => slot.slotType !== 'header');

  const inlineSlots = slots.filter((slot) => slot.slotType === 'inline');

  const bestInline =
    inlineSlots.find((slot) => {
      const heading = (slot.heading ?? '').trim();
      if (!heading) return false;
      if (!moduleTitle) return true;
      return heading.toLowerCase() !== moduleTitle.toLowerCase();
    }) ??
    inlineSlots[0] ??
    null;

  if (bestInline) return [bestInline];

  const diagram = slots.find((slot) => slot.slotType === 'diagram') ?? null;
  return diagram ? [diagram] : [];
}

function injectFigureBlocks(blocks: ContentBlock[], slots: ModuleVisualSlot[]): ContentBlock[] {
  const insertable = slots
    .filter((slot) => typeof slot.blockIndex === 'number' && (slot.blockIndex ?? -1) >= 0)
    .sort((a, b) => (a.blockIndex ?? 0) - (b.blockIndex ?? 0));

  if (!insertable.length) return blocks;

  const next: ContentBlock[] = [...blocks];
  let offset = 0;

  for (const slot of insertable) {
    const rawIndex = slot.blockIndex ?? 0;
    const clamped = Math.max(0, Math.min(rawIndex, next.length));
    const index = clamped + offset;
    const caption = slot.heading || slot.summary || (slot.slotType === 'diagram' ? 'Diagram' : 'Figure');

    next.splice(index, 0, {
      type: 'figure',
      content: slot.id,
      caption,
      source: slot.slotType,
    });
    offset += 1;
  }

  return next;
}

function ContentBlockRenderer({ block }: { block: ContentBlock }) {
  const isDark = true;

  switch (block.type) {
    case 'heading1':
      return (
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-serif font-bold mb-6 mt-2 text-foreground">
          {block.content}
        </h1>
      );
    case 'heading2':
      return (
        <h2 className="text-xl md:text-2xl font-serif font-semibold mb-4 mt-10 pb-2 border-b text-foreground border-border/50">
          {block.content}
        </h2>
      );
    case 'heading3':
      return (
        <h3 className="text-lg md:text-xl font-serif font-medium mb-3 mt-6 text-foreground">
          {block.content}
        </h3>
      );
    case 'meta':
      return (
        <div className="my-2 text-[11px] uppercase tracking-[0.25em] text-muted-foreground font-mono">
          <FormattedText text={block.content} isDark={isDark} />
        </div>
      );
    case 'standfirst':
      return (
        <p className="my-6 text-lg md:text-xl leading-relaxed text-foreground">
          <FormattedText text={block.content} isDark={isDark} />
        </p>
      );
    case 'paragraph':
      return (
        <p className="leading-[1.8] text-justify text-muted-foreground" style={{ textIndent: '2em' }}>
          <FormattedText text={block.content} isDark={isDark} />
        </p>
      );
    case 'quote':
      return <QuoteBlock content={block.content} isDark={isDark} />;
    case 'list':
      return <ListBlock items={block.items || []} isDark={isDark} />;
    case 'numbered-list':
      return <ListBlock items={block.items || []} ordered isDark={isDark} />;
    case 'code':
      return <CodeBlock code={block.content} language={block.caption} isDark={isDark} />;
    case 'table':
      return <TableBlock content={block.content} isDark={isDark} />;
    case 'didyouknow':
    case 'warning':
    case 'tip':
    case 'key-concept':
    case 'example':
    case 'exercise':
    case 'summary':
    case 'callout':
      return <CalloutBox type={block.type} content={block.content} isDark={isDark} />;
    case 'figure':
      return null;
    default:
      return (
        <p className="text-muted-foreground">
          <FormattedText text={block.content} isDark={isDark} />
        </p>
      );
  }
}

function InlineFigure({
  moduleId,
  moduleContent,
  locale,
  slot,
  caption,
}: {
  moduleId: string;
  moduleContent: string;
  locale: 'en' | 'es';
  slot: ModuleVisualSlot;
  caption?: string;
}) {
  const style = getIllustrationStyleForSlot(slot);
  const isDiagram = slot.slotType === 'diagram';

  const wrapperClassName = isDiagram
    ? 'my-8 break-inside-avoid'
    : 'md:float-right md:w-[320px] md:ml-6 md:mb-4 my-4 break-inside-avoid';

  return (
    <figure className={wrapperClassName}>
      <ModuleIllustration
        moduleId={moduleId}
        content={moduleContent}
        locale={locale}
        style={style}
        visualStyle={slot.suggestedVisualStyle}
        slot={slot}
        variant="figure"
        className="p-0 border-0 bg-transparent"
      />
      {caption ? (
        <figcaption className="mt-2 text-[11px] uppercase tracking-[0.25em] text-white/60 font-mono">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

export function ModuleEditorialContent({
  moduleId,
  locale,
  normalizedContent,
  moduleTitle,
  visualSlots,
}: {
  moduleId: string;
  locale: 'en' | 'es';
  normalizedContent: string;
  moduleTitle: string;
  visualSlots: ModuleVisualSlot[];
}) {
  const integratedSlots = useMemo(
    () => selectIntegratedSlots(visualSlots, moduleTitle),
    [visualSlots, moduleTitle]
  );

  const slotsById = useMemo(
    () => new Map(integratedSlots.map((slot) => [slot.id, slot])),
    [integratedSlots]
  );

  const blocks = useMemo(() => {
    const rawBlocks = parseContentIntoBlocks(normalizedContent);
    return injectFigureBlocks(rawBlocks, integratedSlots);
  }, [normalizedContent, integratedSlots]);

  return (
    <div className="space-y-6">
      {blocks.map((block, index) => {
        if (block.type === 'figure') {
          const slot = slotsById.get(block.content);
          if (!slot) return null;
          return (
            <InlineFigure
              key={`${block.content}-${index}`}
              moduleId={moduleId}
              moduleContent={normalizedContent}
              locale={locale}
              slot={slot}
              caption={block.caption}
            />
          );
        }
        return <ContentBlockRenderer key={`${block.type}-${index}`} block={block} />;
      })}
    </div>
  );
}
