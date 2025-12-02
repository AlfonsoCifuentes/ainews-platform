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
  Moon,
  Sun,
  Settings,
  Bookmark,
  BookmarkCheck,
  Search,
  RefreshCw,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ModuleIllustration } from '@/components/courses/ModuleIllustration';
import { useModuleVisualSlots } from '@/hooks/use-module-visual-slots';
import { getIllustrationStyleForSlot } from '@/lib/utils/visual-slots';
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
  type: 'heading1' | 'heading2' | 'heading3' | 'paragraph' | 'callout' | 
        'didyouknow' | 'example' | 'exercise' | 'quote' | 'list' | 
        'numbered-list' | 'code' | 'table' | 'figure' | 'marginal-note' |
        'key-concept' | 'warning' | 'tip' | 'summary';
  content: string;
  items?: string[];
  caption?: string;
  source?: string;
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

    if (line.startsWith('# ')) {
      blocks.push({ type: 'heading1', content: line.slice(2) });
      i++; continue;
    }
    if (line.startsWith('## ')) {
      blocks.push({ type: 'heading2', content: line.slice(3) });
      i++; continue;
    }
    if (line.startsWith('### ')) {
      blocks.push({ type: 'heading3', content: line.slice(4) });
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
      blocks.push({ type: 'quote', content: quoteLines.join('\n') });
      continue;
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
        <h1 className={`text-2xl md:text-3xl lg:text-4xl font-serif font-bold mb-6 mt-2 ${isDark ? 'text-foreground' : 'text-stone-800'}`}>
          {block.content}
        </h1>
      );
    case 'heading2':
      return (
        <h2 className={`text-xl md:text-2xl font-serif font-semibold mb-4 mt-10 pb-2 border-b ${isDark ? 'text-foreground border-border/50' : 'text-stone-700 border-stone-300'}`}>
          {block.content}
        </h2>
      );
    case 'heading3':
      return (
        <h3 className={`text-lg md:text-xl font-serif font-medium mb-3 mt-6 ${isDark ? 'text-foreground' : 'text-stone-700'}`}>
          {block.content}
        </h3>
      );
    case 'paragraph':
      return (
        <p className={`leading-[1.8] text-justify ${isDark ? 'text-muted-foreground' : 'text-stone-600'}`} style={{ textIndent: '2em' }}>
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
    default:
      return (
        <p className={isDark ? 'text-muted-foreground' : 'text-stone-600'}>
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
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [fontSize, setFontSize] = useState(16);
  const [bookmarkedPages, setBookmarkedPages] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [isTwoPageView, setIsTwoPageView] = useState(false);
  const {
    slots: visualSlots,
    loading: visualSlotsLoading,
    refresh: refreshVisualSlots,
  } = useModuleVisualSlots(moduleId ?? null, locale);
  const supportingSlots = useMemo(
    () => visualSlots.filter((slot) => slot.slotType !== 'header'),
    [visualSlots]
  );
  const gallerySlots = useMemo(() => supportingSlots.slice(0, 4), [supportingSlots]);
  const canRenderVisualGallery = Boolean(moduleId && gallerySlots.length > 0);
  const bookRef = useRef<HTMLDivElement>(null);

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

  // Parse content
  useEffect(() => {
    const blocks = parseContentIntoBlocks(content);
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
  }, [content]);

  // Keyboard nav
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        setCurrentPage(prev => Math.min(pages.length, prev + (isTwoPageView ? 2 : 1)));
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        setCurrentPage(prev => Math.max(1, prev - (isTwoPageView ? 2 : 1)));
      } else if (e.key === 'Escape') {
        setIsFullscreen(false); setShowToc(false); setShowSettings(false); setShowSearch(false);
      } else if (e.key === 'f' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setShowSearch(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTwoPageView, pages.length]);

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

  const goToPage = useCallback((page: number) => {
    const newPage = Math.max(1, Math.min(page, pages.length));
    setCurrentPage(newPage);
    onPageChange?.(newPage);
  }, [pages.length, onPageChange]);

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
  const totalPages = pages.length;
  const progress = totalPages > 0 ? (currentPage / totalPages) * 100 : 0;
  const isLastPage = currentPage >= totalPages - (isTwoPageView ? 1 : 0);

  const renderPage = (page: TextbookPage, isLeft: boolean) => (
    <div className={`relative flex-1 h-full overflow-y-auto ${isLeft && isTwoPageView ? 'border-r' : ''} ${isDarkMode ? 'border-border/20' : 'border-stone-200'}`} style={{ fontSize: `${fontSize}px` }}>
      <div className={`min-h-full ${isDarkMode ? 'bg-gradient-to-br from-card via-card to-secondary/20' : 'bg-gradient-to-br from-[#FFFEF9] via-[#FDF6E3] to-[#F5ECD7]'}`}>
        <div className={`px-6 md:px-10 lg:px-14 py-8 md:py-10 ${isLeft ? 'pl-4 md:pl-8' : 'pr-4 md:pr-8'}`}>
          {page.isChapterStart && (
            <div className="relative mb-10">
              <ChapterDecorator number={moduleNumber} isDark={isDarkMode} />
              <div className="text-center pt-14 pb-6">
                <div className={`text-xs uppercase tracking-[0.3em] mb-3 ${isDarkMode ? 'text-muted-foreground' : 'text-stone-500'}`}>
                  {t.chapter} {moduleNumber}
                </div>
                <div className={`w-12 h-px mx-auto ${isDarkMode ? 'bg-primary/50' : 'bg-blue-400/50'}`} />
              </div>
            </div>
          )}
          <div className="space-y-5">
            {page.content.map((block, i) => <ContentBlockRenderer key={i} block={block} isDark={isDarkMode} />)}
          </div>
          <div className={`mt-10 pt-4 border-t text-center ${isDarkMode ? 'border-border/30' : 'border-stone-300'}`}>
            <span className={`font-serif italic text-sm ${isDarkMode ? 'text-muted-foreground' : 'text-stone-500'}`}>{page.pageNumber}</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderEmptyPage = () => (
    <div className={`flex-1 h-full flex items-center justify-center ${isDarkMode ? 'bg-card' : 'bg-[#FDF6E3]'}`}>
      <div className="text-center">
        <BookOpen className={`h-12 w-12 mx-auto mb-3 ${isDarkMode ? 'text-muted-foreground/30' : 'text-stone-300'}`} />
        <p className={`font-serif italic text-sm ${isDarkMode ? 'text-muted-foreground' : 'text-stone-500'}`}>{t.endOfChapter}</p>
      </div>
    </div>
  );

  return (
    <>
      {canRenderVisualGallery && moduleId && (
        <div
          className={`mb-6 rounded-3xl border p-5 ${
            isDarkMode ? 'bg-card/70 border-white/10' : 'bg-white/80 border-stone-200'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.5em] text-primary/80">
                {t.visualHighlights}
              </p>
              <p className="text-sm text-muted-foreground">{t.visualGalleryNote}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshVisualSlots}
              disabled={visualSlotsLoading}
              className="text-xs"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${visualSlotsLoading ? 'animate-spin' : ''}`} />
              {t.refreshVisuals}
            </Button>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {gallerySlots.map((slot) => (
              <ModuleIllustration
                key={slot.id}
                moduleId={moduleId}
                content={content}
                locale={locale}
                style={getIllustrationStyleForSlot(slot)}
                visualStyle={slot.suggestedVisualStyle}
                slot={slot}
                autoGenerate={false}
              />
            ))}
          </div>
        </div>
      )}

      <div
        ref={bookRef}
        className={`relative w-full h-[calc(100vh-4rem)] md:h-[calc(100vh-2rem)] ${
          isDarkMode ? 'bg-background' : 'bg-stone-300'
        } ${isFullscreen ? 'fixed inset-0 z-50' : 'rounded-xl overflow-hidden shadow-2xl'}`}
      >
      {/* Top bar */}
      <div className={`absolute top-0 left-0 right-0 z-30 h-11 flex items-center justify-between px-3 ${isDarkMode ? 'bg-card/95' : 'bg-stone-100/95'} backdrop-blur-sm border-b ${isDarkMode ? 'border-border/30' : 'border-stone-300'}`}>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => setShowToc(true)} className="h-8 w-8 p-0"><List className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => setShowSearch(true)} className="h-8 w-8 p-0"><Search className="h-4 w-4" /></Button>
          <div className="hidden md:block ml-3 text-xs truncate max-w-[180px]">
            <span className={isDarkMode ? 'text-muted-foreground' : 'text-stone-500'}>{t.chapter} {moduleNumber}:</span>{' '}
            <span className="font-medium">{title}</span>
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
        <button onClick={() => goToPage(currentPage - (isTwoPageView ? 2 : 1))} disabled={currentPage <= 1}
          className={`w-10 md:w-14 flex items-center justify-center ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-black/5'} disabled:opacity-20 transition-colors`}>
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 flex overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div key={currentPage} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="flex w-full h-full">
              {currentPageData && renderPage(currentPageData, true)}
              {isTwoPageView && nextPageData && renderPage(nextPageData, false)}
              {isTwoPageView && !nextPageData && currentPageData && renderEmptyPage()}
            </motion.div>
          </AnimatePresence>
        </div>
        <button onClick={() => goToPage(currentPage + (isTwoPageView ? 2 : 1))} disabled={isLastPage}
          className={`w-10 md:w-14 flex items-center justify-center ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-black/5'} disabled:opacity-20 transition-colors`}>
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Bottom bar */}
      <div className={`absolute bottom-0 left-0 right-0 z-30 h-14 flex flex-col items-center justify-center px-3 ${isDarkMode ? 'bg-card/95' : 'bg-stone-100/95'} backdrop-blur-sm border-t ${isDarkMode ? 'border-border/30' : 'border-stone-300'}`}>
        <div className="w-full max-w-sm mb-1.5">
          <div className={`h-1 rounded-full ${isDarkMode ? 'bg-secondary' : 'bg-stone-300'}`}>
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className="flex items-center justify-between w-full max-w-sm">
          <Button variant="ghost" size="sm" onClick={() => onNavigate?.('prev')} disabled={moduleNumber <= 1} className="text-xs h-7 px-2">
            <ChevronLeft className="h-3 w-3" /><span className="hidden sm:inline ml-1">{t.previousChapter}</span>
          </Button>
          <div className="text-xs font-serif">
            {t.page}{' '}
            <input type="number" value={currentPage} onChange={(e) => goToPage(parseInt(e.target.value) || 1)}
              className={`w-8 text-center bg-transparent border-b ${isDarkMode ? 'border-border' : 'border-stone-400'}`} min={1} max={totalPages} />
            {' '}{t.of} {totalPages}
          </div>
          {isLastPage ? (
            <Button variant="default" size="sm" onClick={onComplete} className="text-xs h-7 px-2">{t.completeChapter}</Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => onNavigate?.('next')} disabled={moduleNumber >= totalModules} className="text-xs h-7 px-2">
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
              className={`fixed top-0 left-0 bottom-0 w-72 z-50 ${isDarkMode ? 'bg-card' : 'bg-white'} shadow-2xl overflow-y-auto`}>
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
              className={`fixed top-0 right-0 bottom-0 w-72 z-50 ${isDarkMode ? 'bg-card' : 'bg-white'} shadow-2xl`}>
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
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium">{isDarkMode ? t.darkMode : t.lightMode}</label>
                  <Button variant="outline" size="sm" onClick={() => setIsDarkMode(!isDarkMode)} className="h-8 w-8 p-0">
                    {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  </Button>
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
              className={`fixed top-16 left-1/2 -translate-x-1/2 w-full max-w-md z-50 ${isDarkMode ? 'bg-card' : 'bg-white'} rounded-xl shadow-2xl overflow-hidden`}>
              <div className="p-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input type="text" value={searchQuery} onChange={(e) => handleSearch(e.target.value)} placeholder={t.searchPlaceholder} autoFocus
                    className={`w-full pl-9 pr-9 py-2.5 rounded-lg text-sm ${isDarkMode ? 'bg-secondary' : 'bg-stone-100'} border-none focus:ring-2 focus:ring-primary`} />
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
