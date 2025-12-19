'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  BookOpen,
  List,
  Maximize2,
  Minimize2,
  Settings,
  Bookmark,
  BookmarkCheck,
  Search,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ModuleIllustration } from '@/components/courses/ModuleIllustration';
import { useModuleVisualSlots } from '@/hooks/use-module-visual-slots';
import { getIllustrationStyleForSlot } from '@/lib/utils/visual-slots';
import type { ModuleVisualSlot } from '@/lib/types/visual-slots';
import { normalizeEditorialMarkdown } from '@/lib/courses/editorial-style';
import {
  ChapterDecorator,
  CalloutBox,
  QuoteBlock,
  FormattedText,
  CodeBlock,
  TableBlock,
  ListBlock
} from './TextbookComponents';

// ============================================================================
// TYPES
// ============================================================================

export interface TextbookPage {
  pageNumber: number;
  content: ContentBlock[];
  section?: string;
  isChapterStart?: boolean;
}

export interface ContentBlock {
  type: 'heading1' | 'heading2' | 'heading3' | 'meta' | 'standfirst' | 'paragraph' | 'callout' | 
        'didyouknow' | 'example' | 'exercise' | 'quote' | 'list' | 
        'numbered-list' | 'code' | 'table' | 'figure' | 'marginal-note' |
        'key-concept' | 'warning' | 'tip' | 'summary';
  content: string;
  items?: string[];
  caption?: string;
  source?: string;
}

function injectVisualFigures(blocks: ContentBlock[], slots: ModuleVisualSlot[]): ContentBlock[] {
  const normalized = slots.map((slot) => {
    if (slot.slotType !== 'header') return slot;
    // Never place visuals at the very start of the lesson.
    // If header slots don't have a meaningful blockIndex, insert after the first couple blocks.
    const safeIndex = typeof slot.blockIndex === 'number' ? slot.blockIndex : 2;
    return { ...slot, blockIndex: safeIndex };
  });

  const insertable = normalized
    .filter((slot) => typeof slot.blockIndex === 'number' && slot.blockIndex >= 0)
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

function selectIntegratedSlots(allSlots: ModuleVisualSlot[], moduleTitle: string): ModuleVisualSlot[] {
  const slots = allSlots.filter((slot) => slot.slotType !== 'header');
  const diagram = slots.find((slot) => slot.slotType === 'diagram') ?? null;
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

  return [diagram, bestInline].filter(Boolean) as ModuleVisualSlot[];
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
  // Reuse the existing pipeline, but render in a textbook-like figure layout.
  const style = getIllustrationStyleForSlot(slot);
  const isDiagram = slot.slotType === 'diagram';

  const wrapperClassName = isDiagram
    ? 'my-10 w-full clear-both break-inside-avoid -mx-6 md:-mx-10 lg:-mx-14'
    : 'md:float-right md:w-[320px] md:ml-6 md:mb-4 my-2 break-inside-avoid';

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

export interface TableOfContentsItem {
  title: string;
  page: number;
  level: number;
}

export interface TextbookViewProps {
  content: string;
  title: string;
  moduleNumber: number;
  totalModules: number;
  moduleId?: string;
  onComplete?: () => void;
  onNavigate?: (direction: 'prev' | 'next') => void;
  locale: 'en' | 'es';
  initialPage?: number;
  onPageChange?: (page: number) => void;
}

// ============================================================================
// CONTENT PARSER
// ============================================================================

export function parseContentIntoBlocks(rawContent: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  let inHero = true;
  
  // First pass: Convert styled div boxes to callouts
  let content = rawContent
    // Match styled divs with title in <b> tags (Did You Know boxes)
    .replace(/<div[^>]*style=["'][^"']*border[^"']*["'][^>]*>\s*<b>([^<]+)<\/b>\s*(?:<br\s*\/?>)?\s*([\s\S]*?)<\/div>/gi, 
      (_, title, body) => {
        const cleanBody = body
          .replace(/<\/?(div|span|b|br|i|em|strong|p)[^>]*>/gi, '')
          .trim();
        return `\n:::didyouknow[${title.trim()}]\n${cleanBody}\n:::\n`;
      })
    // Match any remaining styled divs as general callouts
    .replace(/<div[^>]*style=["'][^"']*["'][^>]*>([\s\S]*?)<\/div>/gi, (_, inner) => {
      return inner.replace(/<\/?(b|br|i|em|strong|span)[^>]*>/gi, '').trim();
    });
  
  // Second pass: Clean remaining HTML tags
  content = content
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(?:div|span|b|i|em|strong|p)[^>]*>/gi, '')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n');

  const lines = content.split('\n');
  let i = 0;
  
  while (i < lines.length) {
    const line = lines[i].trim();
    
    if (!line) { i++; continue; }

    // Horizontal rules are layout separators in markdown; don't render them as text.
    if (/^---+$/.test(line)) {
      inHero = false;
      i++;
      continue;
    }

    // Hero meta line (time/level/tags) should render as metadata, not as a paragraph.
    if (inHero && line.includes('|') && /\b(Tiempo|Nivel|Tags|Level|Duration)\b/i.test(line)) {
      blocks.push({ type: 'meta', content: line });
      i++;
      continue;
    }

    // Match headings with or without space after hash marks
    const h1Match = line.match(/^#\s*(.+)$/);
    if (h1Match && !line.startsWith('##')) {
      blocks.push({ type: 'heading1', content: h1Match[1].trim() });
      i++; continue;
    }
    const h2Match = line.match(/^##\s*(.+)$/);
    if (h2Match && !line.startsWith('###')) {
      blocks.push({ type: 'heading2', content: h2Match[1].trim() });
      i++; continue;
    }
    const h3Match = line.match(/^###\s*(.+)$/);
    if (h3Match) {
      blocks.push({ type: 'heading3', content: h3Match[1].trim() });
      i++; continue;
    }

    // Some generators emit deeper headings (####, #####). Render them as heading3.
    const h4PlusMatch = line.match(/^#{4,}\s*(.+)$/);
    if (h4PlusMatch) {
      blocks.push({ type: 'heading3', content: h4PlusMatch[1].trim() });
      i++; continue;
    }

    const calloutMatch = line.match(/^:::(\w+)(?:\[([^\]]*)\])?/);
    if (calloutMatch) {
      const calloutType = calloutMatch[1].toLowerCase();
      const calloutTitle = calloutMatch[2] || '';
      const calloutLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith(':::')) {
        calloutLines.push(lines[i]);
        i++;
      }
      i++;
      const mappedType = mapCalloutType(calloutType);
      blocks.push({
        type: mappedType,
        content: calloutTitle ? `**${calloutTitle}**\n\n${calloutLines.join('\n').trim()}` : calloutLines.join('\n').trim()
      });
      continue;
    }

    if (line.startsWith('> ')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('> ')) {
        quoteLines.push(lines[i].trim().slice(2));
        i++;
      }

      const first = quoteLines[0]?.trim() ?? '';
      const isPullQuote = first.startsWith('##') || first.startsWith('## ');
      if (isPullQuote) {
        blocks.push({ type: 'quote', content: quoteLines.join('\n') });
        continue;
      }

      // Hero standfirst (lead paragraph) is always inside a blockquote per the editorial spec.
      if (inHero) {
        blocks.push({ type: 'standfirst', content: quoteLines.join('\n').trim() });
        continue;
      }

      // Insight Card pattern: first line is a markdown heading ("### ...").
      const calloutHeadingMatch = first.match(/^###\s*(.+)$/);
      if (calloutHeadingMatch) {
        const title = calloutHeadingMatch[1].trim();
        const body = quoteLines.slice(1).join('\n').trim();
        const titleLower = title.toLowerCase();

        const calloutType: ContentBlock['type'] =
          title.includes('⚠️') || titleLower.includes('warning') || titleLower.includes('peligro')
            ? 'warning'
            : title.includes('💡') || titleLower.includes('insight') || titleLower.includes('idea')
              ? 'didyouknow'
              : title.includes('✅') || titleLower.includes('tip') || titleLower.includes('consejo')
                ? 'tip'
                : title.includes('🎯') || titleLower.includes('key concept') || titleLower.includes('concepto')
                  ? 'key-concept'
                  : title.includes('✏️') || titleLower.includes('exercise') || titleLower.includes('ejercicio')
                    ? 'exercise'
                    : 'callout';

        const merged = body ? `**${title}**\n\n${body}` : `**${title}**`;
        blocks.push({ type: calloutType, content: merged });
        continue;
      }

      blocks.push({ type: 'callout', content: quoteLines.join('\n').trim() });
      continue;
    }

    // Some legacy generators emit the standfirst as a single bold line (outside the blockquote).
    if (inHero && line.startsWith('**') && line.endsWith('**') && line.length >= 6) {
      blocks.push({ type: 'standfirst', content: line });
      i++;
      continue;
    }

    // Editorial image placeholder: ![DISEÑO: ...]
    if (line.startsWith('![') && /\[\s*DISEÑO\s*:/i.test(line)) {
      const altMatch = line.match(/^!\[\s*DISEÑO\s*:\s*([^\]]+)\]/i);
      const prompt = altMatch?.[1]?.trim();
      if (prompt) {
        blocks.push({ type: 'callout', content: `**DISEÑO**\n\n${prompt}` });
        i++;
        continue;
      }
    }

    if (line.startsWith('💡') || line.toLowerCase().includes('did you know')) {
      blocks.push({ type: 'didyouknow', content: line.replace(/^💡\s*/, '') });
      i++; continue;
    }
    if (line.startsWith('⚠️') || line.startsWith('🔴')) {
      blocks.push({ type: 'warning', content: line.replace(/^[⚠️🔴]\s*/, '') });
      i++; continue;
    }
    if (line.startsWith('✅') || line.startsWith('💚')) {
      blocks.push({ type: 'tip', content: line.replace(/^[✅💚]\s*/, '') });
      i++; continue;
    }
    if (line.startsWith('🎯') || line.startsWith('📌')) {
      blocks.push({ type: 'key-concept', content: line.replace(/^[🎯📌]\s*/, '') });
      i++; continue;
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
      blocks.push({ type: 'code', content: codeLines.join('\n'), caption: lang });
      continue;
    }

    if (line.includes('|') && line.startsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].includes('|')) {
        tableLines.push(lines[i]);
        i++;
      }

      // Sidebar box widget (one-cell table) → render as a callout box.
      // Expected format:
      // | 💡 TECH INSIGHT: TITLE |
      // | :--- |
      // | Body |
      const normalized = tableLines.map((l) => l.trim()).filter(Boolean);
      const isSidebarBox =
        normalized.length >= 3 &&
        /^\|\s*:?---+:?\s*\|?$/.test(normalized[1].replace(/\s+/g, ' ')) &&
        normalized.every((l) => l.startsWith('|'));

      if (isSidebarBox) {
        const firstRowCells = normalized[0].split('|').map((c) => c.trim()).filter(Boolean);
        const bodyRowCells = normalized[2].split('|').map((c) => c.trim()).filter(Boolean);
        if (firstRowCells.length === 1 && bodyRowCells.length === 1) {
          blocks.push({ type: 'callout', content: `**${firstRowCells[0]}**\n\n${bodyRowCells[0]}` });
          continue;
        }
      }

      blocks.push({ type: 'table', content: tableLines.join('\n') });
      continue;
    }

    const paragraphLines: string[] = [line];
    i++;
    while (i < lines.length && 
           lines[i].trim() && 
           !lines[i].trim().startsWith('#') &&
           !lines[i].trim().startsWith('-') &&
           !lines[i].trim().startsWith('*') &&
           !lines[i].trim().startsWith('>') &&
           !lines[i].trim().startsWith('```') &&
           !lines[i].trim().startsWith(':::') &&
           !lines[i].trim().startsWith('|') &&
           !/^\d+\.\s/.test(lines[i].trim())) {
      paragraphLines.push(lines[i].trim());
      i++;
    }
    blocks.push({ type: 'paragraph', content: paragraphLines.join(' ') });
  }

  return blocks;
}

function mapCalloutType(type: string): ContentBlock['type'] {
  const mapping: Record<string, ContentBlock['type']> = {
    'didyouknow': 'didyouknow', 'tip': 'tip', 'warning': 'warning',
    'example': 'example', 'exercise': 'exercise', 'note': 'callout',
    'info': 'callout', 'important': 'key-concept', 'summary': 'summary',
    'keyconcept': 'key-concept', 'key-concept': 'key-concept'
  };
  return mapping[type] || 'callout';
}

const MIN_BLOCKS_PER_PAGE = 4;
const MAX_BLOCKS_PER_PAGE = 8;

// ============================================================================
// CONTENT BLOCK RENDERER
// ============================================================================

function ContentBlockRenderer({ block, isDark }: { block: ContentBlock; isDark: boolean }) {
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
      // Figure blocks are injected later where we have module context.
      return null;
    default:
      return (
        <p className="text-muted-foreground">
          <FormattedText text={block.content} isDark={isDark} />
        </p>
      );
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function TextbookView({
  content,
  title,
  moduleNumber,
  totalModules,
  moduleId,
  onComplete,
  onNavigate,
  locale,
  initialPage = 1,
  onPageChange
}: TextbookViewProps) {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pages, setPages] = useState<TextbookPage[]>([]);
  const [tableOfContents, setTableOfContents] = useState<TableOfContentsItem[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showToc, setShowToc] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const isDarkMode = true;
  const [fontSize, setFontSize] = useState(16);
  const [bookmarkedPages, setBookmarkedPages] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [isTwoPageView, setIsTwoPageView] = useState(false);
  const {
    slots: visualSlots,
  } = useModuleVisualSlots(moduleId ?? null, locale);
  const slotsById = useMemo(() => new Map(visualSlots.map((slot) => [slot.id, slot])), [visualSlots]);
  const bookRef = useRef<HTMLDivElement>(null);
  const pageScrollRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const normalizedContent = useMemo(() => {
    return normalizeEditorialMarkdown(content || '', {
      title,
      locale,
    });
  }, [content, title, locale]);

  const t = useMemo(() => locale === 'en' ? {
    chapter: 'Chapter', of: 'of', page: 'Page',
    tableOfContents: 'Table of Contents', settings: 'Settings',
    fontSize: 'Font Size', darkMode: 'Dark Mode', lightMode: 'Light Mode',
    bookmark: 'Bookmark', bookmarked: 'Bookmarked',
    search: 'Search', searchPlaceholder: 'Search...', noResults: 'No results',
    previousChapter: 'Previous', nextChapter: 'Next', completeChapter: 'Complete',
    pressEsc: 'ESC to exit', useArrows: '← → to navigate', endOfChapter: 'End of Chapter',
    fullscreen: 'Fullscreen', exitFullscreen: 'Exit',
    visualHighlights: 'Visual highlights',
    visualGalleryNote: 'AI illustrations anchored to this module',
    refreshVisuals: 'Refresh visuals'
  } : {
    chapter: 'Capítulo', of: 'de', page: 'Página',
    tableOfContents: 'Índice', settings: 'Ajustes',
    fontSize: 'Tamaño', darkMode: 'Oscuro', lightMode: 'Claro',
    bookmark: 'Marcar', bookmarked: 'Marcado',
    search: 'Buscar', searchPlaceholder: 'Buscar...', noResults: 'Sin resultados',
    previousChapter: 'Anterior', nextChapter: 'Siguiente', completeChapter: 'Completar',
    pressEsc: 'ESC salir', useArrows: '← → navegar', endOfChapter: 'Fin',
    fullscreen: 'Completa', exitFullscreen: 'Salir',
    visualHighlights: 'Destellos visuales',
    visualGalleryNote: 'Ilustraciones IA ancladas a este módulo',
    refreshVisuals: 'Actualizar visuales'
  }, [locale]);

  const totalPages = pages.length;
  const progress = totalPages > 0 ? (currentPage / totalPages) * 100 : 0;
  const isLastPage = currentPage >= totalPages - (isTwoPageView ? 1 : 0);

  const goToPage = useCallback((page: number) => {
    const newPage = Math.max(1, Math.min(page, pages.length));
    setCurrentPage(newPage);
    onPageChange?.(newPage);
  }, [pages.length, onPageChange]);

  const step = isTwoPageView ? 2 : 1;

  const handleNextPage = useCallback(() => {
    if (isLastPage) {
      onComplete?.();
      return;
    }
    goToPage(currentPage + step);
  }, [currentPage, goToPage, isLastPage, onComplete, step]);

  const handlePrevPage = useCallback(() => {
    goToPage(currentPage - step);
  }, [currentPage, goToPage, step]);

  // Parse content
  useEffect(() => {
    const rawBlocks = parseContentIntoBlocks(normalizedContent);
    const blocks = injectVisualFigures(rawBlocks, selectIntegratedSlots(visualSlots, title));
    const parsedPages: TextbookPage[] = [];
    const toc: TableOfContentsItem[] = [];
    let currentPageBlocks: ContentBlock[] = [];
    let currentSection = '';
    let pageNum = 1;
    let isChapterStart = true;

    const createPage = (forceChapterStart = false) => {
      if (currentPageBlocks.length > 0) {
        parsedPages.push({
          pageNumber: pageNum, content: currentPageBlocks,
          section: currentSection, isChapterStart: forceChapterStart || isChapterStart
        });
        pageNum++;
        currentPageBlocks = [];
        isChapterStart = false;
      }
    };

    for (const block of blocks) {
      if (block.type === 'heading1') {
        if (currentPageBlocks.length > 0) createPage(true);
        currentSection = block.content;
        toc.push({ title: block.content, page: pageNum, level: 1 });
        isChapterStart = true;
      } else if (block.type === 'heading2') {
        if (currentPageBlocks.length >= MIN_BLOCKS_PER_PAGE) createPage();
        currentSection = block.content;
        toc.push({ title: block.content, page: parsedPages.length + 1, level: 2 });
      } else if (block.type === 'heading3') {
        toc.push({ title: block.content, page: parsedPages.length + 1, level: 3 });
      }
      currentPageBlocks.push(block);
      if (currentPageBlocks.length >= MAX_BLOCKS_PER_PAGE) createPage();
    }
    createPage();
    setPages(parsedPages);
    setTableOfContents(toc);
  }, [normalizedContent, visualSlots, title]);

  const scrollPagesBy = useCallback((delta: number) => {
    const targets: Array<HTMLDivElement | null | undefined> = [];
    targets.push(pageScrollRefs.current.get(currentPage));
    if (isTwoPageView) targets.push(pageScrollRefs.current.get(currentPage + 1));
    targets.forEach((el) => el?.scrollBy({ top: delta, behavior: 'smooth' }));
  }, [currentPage, isTwoPageView]);

  const setPageRef = useCallback((pageNumber: number) => (el: HTMLDivElement | null) => {
    if (el) pageScrollRefs.current.set(pageNumber, el);
    else pageScrollRefs.current.delete(pageNumber);
  }, []);

  // Keyboard nav
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        handleNextPage();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        handlePrevPage();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        scrollPagesBy(220);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        scrollPagesBy(-220);
      } else if (e.key === 'Escape') {
        setIsFullscreen(false); setShowToc(false); setShowSettings(false); setShowSearch(false);
      } else if (e.key === 'f' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setShowSearch(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNextPage, handlePrevPage, scrollPagesBy]);

  useEffect(() => {
    if (isFullscreen && bookRef.current) bookRef.current.requestFullscreen?.();
    else if (!isFullscreen && document.fullscreenElement) document.exitFullscreen?.();
  }, [isFullscreen]);

  useEffect(() => {
    const checkWidth = () => setIsTwoPageView(window.innerWidth >= 1200);
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  const toggleBookmark = useCallback(() => {
    setBookmarkedPages(prev => prev.includes(currentPage) ? prev.filter(p => p !== currentPage) : [...prev, currentPage]);
  }, [currentPage]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (!query.trim()) { setSearchResults([]); return; }
    const results: number[] = [];
    pages.forEach(page => {
      const pageText = page.content.map(b => b.content + (b.items?.join(' ') || '')).join(' ');
      if (pageText.toLowerCase().includes(query.toLowerCase())) results.push(page.pageNumber);
    });
    setSearchResults(results);
  }, [pages]);

  const isBookmarked = bookmarkedPages.includes(currentPage);
  const currentPageData = pages[currentPage - 1];
  const nextPageData = isTwoPageView ? pages[currentPage] : null;

  const renderPage = (page: TextbookPage, isLeft: boolean) => (
    <div
      className={`relative flex-1 h-full ${isLeft && isTwoPageView ? 'border-r border-white/10' : ''}`}
      style={{ fontSize: `${fontSize}px` }}
    >
      <div
        ref={setPageRef(page.pageNumber)}
        className={`relative h-full w-full overflow-y-auto scroll-smooth px-6 md:px-10 lg:px-14 py-8 md:py-10 ${isLeft ? 'pl-6 md:pl-10' : 'pr-6 md:pr-10'}`}
      >
        <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-white/50 mb-6 font-mono">
          <span>{t.chapter} {moduleNumber}</span>
          <span className="truncate max-w-[45%] text-right">{title}</span>
        </div>

        {page.isChapterStart && (
          <div className="relative mb-8">
            <ChapterDecorator number={moduleNumber} isDark={isDarkMode} />
            <div className="text-center pt-12 pb-4">
              <div className="text-[10px] uppercase tracking-[0.4em] mb-3 text-white/50">
                {t.chapter} {moduleNumber}
              </div>
              <div className="w-14 h-[1px] mx-auto bg-white/25" />
            </div>
          </div>
        )}

        <div className="space-y-6 text-white pb-6">
          {page.content.map((block, i) => {
            if (block.type === 'figure') {
              const slotId = block.content;
              const slot = slotsById.get(slotId);
              if (!moduleId || !slot) return null;
              return (
                <InlineFigure
                  key={`${slotId}-${i}`}
                  moduleId={moduleId}
                  moduleContent={normalizedContent}
                  locale={locale}
                  slot={slot}
                  caption={block.caption}
                />
              );
            }
            return <ContentBlockRenderer key={i} block={block} isDark={isDarkMode} />;
          })}
        </div>

        <div className="mt-8 pt-5 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-white/60">
          <span>{page.section || title}</span>
          <span className="font-semibold text-white/80">{page.pageNumber}</span>
        </div>
      </div>
    </div>
  );

  const renderEmptyPage = () => (
    <div className="flex-1 h-full flex items-center justify-center bg-card">
      <div className="text-center">
        <BookOpen className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
        <p className="font-serif italic text-sm text-muted-foreground">{t.endOfChapter}</p>
      </div>
    </div>
  );

  return (
    <>
      <div
        ref={bookRef}
        className={`relative w-full h-[calc(100vh-4rem)] md:h-[calc(100vh-2rem)] bg-black ${isFullscreen ? 'fixed inset-0 z-50' : 'rounded-[32px] overflow-hidden shadow-[0_40px_120px_-60px_rgba(0,0,0,0.8)] border border-white/10'}`}
      >
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-30 h-11 flex items-center justify-between px-3 bg-[#0b0f19]/90 backdrop-blur-md border-b border-white/10 text-white">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => setShowToc(true)} className="h-8 w-8 p-0"><List className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => setShowSearch(true)} className="h-8 w-8 p-0"><Search className="h-4 w-4" /></Button>
          <div className="hidden md:block ml-3 text-xs truncate max-w-[180px]">
            <span className="text-white/60 font-mono uppercase tracking-[0.2em]">{t.chapter} {moduleNumber}:</span>{' '}
            <span className="font-semibold">{title}</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={toggleBookmark} className="h-8 w-8 p-0">
            {isBookmarked ? <BookmarkCheck className="h-4 w-4 text-primary" /> : <Bookmark className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowSettings(true)} className="h-8 w-8 p-0"><Settings className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => setIsFullscreen(!isFullscreen)} className="h-8 w-8 p-0">
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="absolute top-11 bottom-14 left-0 right-0 flex">
        <button onClick={handlePrevPage} disabled={currentPage <= 1}
          className="w-10 md:w-14 flex items-center justify-center hover:bg-white/10 disabled:opacity-20 transition-colors text-white">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 flex overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div key={currentPage} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="relative flex w-full h-full">
              {isTwoPageView && (
                <div className="pointer-events-none absolute left-1/2 top-0 bottom-0 w-px bg-white/10" />
              )}
              {currentPageData && renderPage(currentPageData, true)}
              {isTwoPageView && nextPageData && renderPage(nextPageData, false)}
              {isTwoPageView && !nextPageData && currentPageData && renderEmptyPage()}
            </motion.div>
          </AnimatePresence>
        </div>
        <button onClick={handleNextPage}
          className="w-10 md:w-14 flex items-center justify-center hover:bg-white/10 disabled:opacity-20 transition-colors text-white">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Bottom bar */}
      <div className="absolute bottom-0 left-0 right-0 z-30 h-16 flex flex-col items-center justify-center px-3 bg-[#0b0f19]/90 backdrop-blur-md border-t border-white/10 text-white">
        <div className="w-full max-w-sm mb-2">
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-[#3ba1ff] rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className="flex items-center justify-between w-full max-w-sm">
          <Button variant="ghost" size="sm" onClick={() => onNavigate?.('prev')} disabled={moduleNumber <= 1} className="text-xs h-7 px-2 text-white">
            <ChevronLeft className="h-3 w-3" /><span className="hidden sm:inline ml-1">{t.previousChapter}</span>
          </Button>
          <div className="text-xs font-mono uppercase tracking-[0.2em]">
            {t.page}{' '}
            <input type="number" value={currentPage} onChange={(e) => goToPage(parseInt(e.target.value) || 1)}
              className="w-10 text-center bg-transparent border-b border-white/30 focus:border-primary outline-none" min={1} max={totalPages} />
            {' '}{t.of} {totalPages}
          </div>
          {isLastPage ? (
            <Button variant="default" size="sm" onClick={onComplete} className="text-xs h-8 px-3 font-semibold bg-[#3ba1ff] text-black hover:bg-[#62b3ff]">{t.completeChapter}</Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => onNavigate?.('next')} disabled={moduleNumber >= totalModules} className="text-xs h-7 px-2 text-white">
              <span className="hidden sm:inline mr-1">{t.nextChapter}</span><ChevronRight className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* TOC Drawer */}
      <AnimatePresence>
        {showToc && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black z-40" onClick={() => setShowToc(false)} />
            <motion.div initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', damping: 25 }}
              className="fixed top-0 left-0 bottom-0 w-72 z-50 bg-card shadow-2xl overflow-y-auto">
              <div className="sticky top-0 flex items-center justify-between p-3 border-b border-border bg-inherit">
                <h2 className="font-serif font-bold text-sm">{t.tableOfContents}</h2>
                <Button variant="ghost" size="sm" onClick={() => setShowToc(false)} className="h-7 w-7 p-0"><X className="h-4 w-4" /></Button>
              </div>
              <div className="p-3">
                {tableOfContents.map((item, i) => (
                  <button key={i} onClick={() => { goToPage(item.page); setShowToc(false); }}
                    className={`w-full text-left py-1.5 px-2 rounded text-sm hover:bg-secondary transition-colors
                      ${item.level === 1 ? 'font-bold' : item.level === 2 ? 'font-medium pl-4' : 'text-muted-foreground pl-8'}
                      ${item.page === currentPage ? 'bg-primary/10 text-primary' : ''}`}>
                    <span>{item.title}</span>
                    <span className="float-right text-xs text-muted-foreground">{item.page}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Settings Drawer */}
      <AnimatePresence>
        {showSettings && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black z-40" onClick={() => setShowSettings(false)} />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25 }}
              className="fixed top-0 right-0 bottom-0 w-72 z-50 bg-card shadow-2xl">
              <div className="sticky top-0 flex items-center justify-between p-3 border-b border-border bg-inherit">
                <h2 className="font-serif font-bold text-sm">{t.settings}</h2>
                <Button variant="ghost" size="sm" onClick={() => setShowSettings(false)} className="h-7 w-7 p-0"><X className="h-4 w-4" /></Button>
              </div>
              <div className="p-4 space-y-5">
                <div>
                  <label className="block text-xs font-medium mb-2">{t.fontSize}</label>
                  <div className="flex items-center gap-3">
                    <span className="text-xs">A</span>
                    <input type="range" min={14} max={22} value={fontSize} onChange={(e) => setFontSize(parseInt(e.target.value))} className="flex-1" />
                    <span className="text-base">A</span>
                  </div>
                  <div className="text-center text-xs text-muted-foreground mt-1">{fontSize}px</div>
                </div>
                {bookmarkedPages.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium mb-2">{t.bookmarked} ({bookmarkedPages.length})</label>
                    <div className="flex flex-wrap gap-1.5">
                      {bookmarkedPages.sort((a, b) => a - b).map(page => (
                        <Button key={page} variant="outline" size="sm" onClick={() => { goToPage(page); setShowSettings(false); }} className="h-7 text-xs px-2">{page}</Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Search Modal */}
      <AnimatePresence>
        {showSearch && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black z-40" onClick={() => setShowSearch(false)} />
            <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }}
              className="fixed top-16 left-1/2 -translate-x-1/2 w-full max-w-md z-50 bg-card rounded-xl shadow-2xl overflow-hidden">
              <div className="p-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input type="text" value={searchQuery} onChange={(e) => handleSearch(e.target.value)} placeholder={t.searchPlaceholder} autoFocus
                    className="w-full pl-9 pr-9 py-2.5 rounded-lg text-sm bg-secondary border-none focus:ring-2 focus:ring-primary" />
                  {searchQuery && <button onClick={() => handleSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="h-4 w-4 text-muted-foreground" /></button>}
                </div>
              </div>
              {searchQuery && (
                <div className="max-h-48 overflow-y-auto border-t border-border">
                  {searchResults.length === 0 ? (
                    <div className="p-3 text-center text-sm text-muted-foreground">{t.noResults}</div>
                  ) : (
                    searchResults.map(page => (
                      <button key={page} onClick={() => { goToPage(page); setShowSearch(false); }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-secondary flex items-center justify-between">
                        <span>{t.page} {page}</span>
                        <span className="text-xs text-muted-foreground">{pages[page - 1]?.section}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {isFullscreen && (
        <div className="fixed bottom-16 left-1/2 -translate-x-1/2 text-xs text-muted-foreground animate-pulse">
          {t.pressEsc} • {t.useArrows}
        </div>
      )}
      </div>
    </>
  );
}

export { TextbookView as BookModuleView };
export default TextbookView;
