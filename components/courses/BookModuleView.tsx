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
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface BookPage {
  pageNumber: number;
  content: string;
  section?: string;
  isChapterStart?: boolean;
}

interface TableOfContentsItem {
  title: string;
  page: number;
  level: number;
}

interface BookModuleViewProps {
  content: string;
  title: string;
  moduleNumber: number;
  totalModules: number;
  onComplete?: () => void;
  onNavigate?: (direction: 'prev' | 'next') => void;
  locale: 'en' | 'es';
  initialPage?: number;
  onPageChange?: (page: number) => void;
}

const _WORDS_PER_PAGE = 350; // Approximately words per page (reserved for future use)
const MIN_CHARS_PER_PAGE = 1800; // Minimum characters per page

export function BookModuleView({
  content,
  title,
  moduleNumber,
  totalModules,
  onComplete,
  onNavigate,
  locale,
  initialPage = 1,
  onPageChange
}: BookModuleViewProps) {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pages, setPages] = useState<BookPage[]>([]);
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
  const bookRef = useRef<HTMLDivElement>(null);

  const t = useMemo(() => locale === 'en' ? {
    chapter: 'Chapter',
    of: 'of',
    page: 'Page',
    pages: 'pages',
    tableOfContents: 'Table of Contents',
    settings: 'Reading Settings',
    fontSize: 'Font Size',
    darkMode: 'Dark Mode',
    twoPageView: 'Two-Page View',
    fullscreen: 'Fullscreen',
    exitFullscreen: 'Exit Fullscreen',
    bookmark: 'Bookmark',
    bookmarked: 'Bookmarked',
    search: 'Search',
    searchPlaceholder: 'Search in chapter...',
    noResults: 'No results found',
    previousChapter: 'Previous Chapter',
    nextChapter: 'Next Chapter',
    completeChapter: 'Complete Chapter',
    pressEsc: 'Press ESC to exit fullscreen',
    useArrows: 'Use ← → arrows to navigate'
  } : {
    chapter: 'Capítulo',
    of: 'de',
    page: 'Página',
    pages: 'páginas',
    tableOfContents: 'Tabla de Contenidos',
    settings: 'Configuración de Lectura',
    fontSize: 'Tamaño de Fuente',
    darkMode: 'Modo Oscuro',
    twoPageView: 'Vista de Dos Páginas',
    fullscreen: 'Pantalla Completa',
    exitFullscreen: 'Salir de Pantalla Completa',
    bookmark: 'Marcar',
    bookmarked: 'Marcado',
    search: 'Buscar',
    searchPlaceholder: 'Buscar en el capítulo...',
    noResults: 'No se encontraron resultados',
    previousChapter: 'Capítulo Anterior',
    nextChapter: 'Siguiente Capítulo',
    completeChapter: 'Completar Capítulo',
    pressEsc: 'Presiona ESC para salir',
    useArrows: 'Usa las flechas ← → para navegar'
  }, [locale]);

  // Parse content into pages
  useEffect(() => {
    const parseContentIntoPages = () => {
      const lines = content.split('\n');
      const parsedPages: BookPage[] = [];
      const toc: TableOfContentsItem[] = [];
      let currentPageContent: string[] = [];
      let currentCharCount = 0;
      let currentSection = '';
      let pageNum = 1;

      const createPage = (isChapterStart = false) => {
        if (currentPageContent.length > 0 || isChapterStart) {
          parsedPages.push({
            pageNumber: pageNum,
            content: currentPageContent.join('\n'),
            section: currentSection,
            isChapterStart
          });
          pageNum++;
          currentPageContent = [];
          currentCharCount = 0;
        }
      };

      for (const line of lines) {
        // Check for headings to build TOC
        const h1Match = line.match(/^# (.+)/);
        const h2Match = line.match(/^## (.+)/);
        const h3Match = line.match(/^### (.+)/);

        if (h1Match) {
          createPage(true);
          currentSection = h1Match[1];
          toc.push({ title: h1Match[1], page: pageNum, level: 1 });
          currentPageContent.push(line);
          currentCharCount += line.length;
          continue;
        }

        if (h2Match) {
          // Start new page for major sections
          if (currentCharCount > MIN_CHARS_PER_PAGE / 2) {
            createPage();
          }
          currentSection = h2Match[1];
          toc.push({ title: h2Match[1], page: parsedPages.length + 1, level: 2 });
          currentPageContent.push(line);
          currentCharCount += line.length;
          continue;
        }

        if (h3Match) {
          toc.push({ title: h3Match[1], page: parsedPages.length + 1, level: 3 });
        }

        // Check if adding this line would exceed page limit
        if (currentCharCount + line.length > MIN_CHARS_PER_PAGE) {
          // Try to break at a paragraph boundary
          if (line.trim() === '' || line.startsWith('-') || line.startsWith('*')) {
            createPage();
          }
        }

        currentPageContent.push(line);
        currentCharCount += line.length;

        // Force page break if way over limit
        if (currentCharCount > MIN_CHARS_PER_PAGE * 1.5) {
          createPage();
        }
      }

      // Don't forget the last page
      createPage();

      setPages(parsedPages);
      setTableOfContents(toc);
    };

    parseContentIntoPages();
  }, [content]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        setCurrentPage(prev => Math.min(pages.length, prev + (isTwoPageView ? 2 : 1)));
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        setCurrentPage(prev => Math.max(1, prev - (isTwoPageView ? 2 : 1)));
      } else if (e.key === 'Escape') {
        setIsFullscreen(false);
        setShowToc(false);
        setShowSettings(false);
        setShowSearch(false);
      } else if (e.key === 'f' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setShowSearch(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTwoPageView, pages.length]);

  // Fullscreen handling
  useEffect(() => {
    if (isFullscreen && bookRef.current) {
      bookRef.current.requestFullscreen?.();
    } else if (!isFullscreen && document.fullscreenElement) {
      document.exitFullscreen?.();
    }
  }, [isFullscreen]);

  // Check window size for two-page view
  useEffect(() => {
    const checkWidth = () => {
      setIsTwoPageView(window.innerWidth >= 1200);
    };
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
    setBookmarkedPages(prev =>
      prev.includes(currentPage)
        ? prev.filter(p => p !== currentPage)
        : [...prev, currentPage]
    );
  }, [currentPage]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const results: number[] = [];
    pages.forEach(page => {
      if (page.content.toLowerCase().includes(query.toLowerCase())) {
        results.push(page.pageNumber);
      }
    });
    setSearchResults(results);
  }, [pages]);

  const isBookmarked = bookmarkedPages.includes(currentPage);
  const currentPageData = pages[currentPage - 1];
  const nextPageData = isTwoPageView ? pages[currentPage] : null;
  const totalPages = pages.length;
  const progress = (currentPage / totalPages) * 100;
  const isLastPage = currentPage >= totalPages - (isTwoPageView ? 1 : 0);

  const PageContent = ({ page, isLeft }: { page: BookPage; isLeft: boolean }) => (
    <div
      className={`
        flex-1 h-full overflow-y-auto px-8 md:px-12 py-8
        ${isLeft ? 'border-r border-border/30' : ''}
        ${isDarkMode ? 'bg-card' : 'bg-[#FDF6E3]'}
      `}
      style={{ fontSize: `${fontSize}px` }}
    >
      {page.isChapterStart && (
        <div className="text-center mb-8 pt-8">
          <div className="text-sm uppercase tracking-widest text-muted-foreground mb-2">
            {t.chapter} {moduleNumber}
          </div>
          <div className="h-px w-24 mx-auto bg-primary/50 mb-4" />
        </div>
      )}

      <div className={`prose max-w-none ${isDarkMode ? 'prose-invert' : 'prose-stone'}`}>
        <ReactMarkdown
          components={{
            h1: ({ ...props }) => (
              <h1 
                className={`text-2xl md:text-3xl font-serif font-bold mb-6 mt-4 ${isDarkMode ? 'text-foreground' : 'text-stone-800'}`}
                {...props}
              />
            ),
            h2: ({ ...props }) => (
              <h2 
                className={`text-xl md:text-2xl font-serif font-semibold mb-4 mt-8 border-b pb-2 ${isDarkMode ? 'text-foreground border-border' : 'text-stone-700 border-stone-300'}`}
                {...props}
              />
            ),
            h3: ({ ...props }) => (
              <h3 
                className={`text-lg md:text-xl font-serif font-medium mb-3 mt-6 ${isDarkMode ? 'text-foreground' : 'text-stone-700'}`}
                {...props}
              />
            ),
            p: ({ ...props }) => (
              <p 
                className={`leading-relaxed mb-4 text-justify ${isDarkMode ? 'text-muted-foreground' : 'text-stone-600'}`}
                style={{ textIndent: '1.5em' }}
                {...props}
              />
            ),
            blockquote: ({ ...props }) => (
              <blockquote 
                className={`border-l-4 pl-4 italic my-6 ${isDarkMode ? 'border-primary bg-primary/5' : 'border-amber-600 bg-amber-50'} py-3 rounded-r`}
                {...props}
              />
            ),
            ul: ({ ...props }) => (
              <ul className="space-y-2 my-4 pl-4" {...props} />
            ),
            ol: ({ ...props }) => (
              <ol className="space-y-2 my-4 pl-4" {...props} />
            ),
            li: ({ ...props }) => (
              <li className="leading-relaxed" {...props} />
            ),
            a: ({ ...props }) => (
              <a className="text-primary underline hover:no-underline" {...props} />
            ),
            table: ({ ...props }) => (
              <div className="overflow-x-auto my-4">
                <table className="min-w-full border-collapse" {...props} />
              </div>
            ),
            th: ({ ...props }) => (
              <th className={`border px-3 py-2 text-left font-semibold ${isDarkMode ? 'border-border bg-secondary' : 'border-stone-300 bg-stone-100'}`} {...props} />
            ),
            td: ({ ...props }) => (
              <td className={`border px-3 py-2 ${isDarkMode ? 'border-border' : 'border-stone-300'}`} {...props} />
            ),
            code(props) {
              const { inline, className, children, ...rest } = props as {
                inline?: boolean;
                className?: string;
                children?: React.ReactNode;
              };
              const match = /language-(\w+)/.exec(className || '');
              return !inline && match ? (
                <div className="my-4 rounded-lg overflow-hidden">
                  <SyntaxHighlighter
                    style={isDarkMode ? vscDarkPlus : vs}
                    language={match[1]}
                    PreTag="div"
                    {...rest}
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                </div>
              ) : (
                <code 
                  className={`px-1.5 py-0.5 rounded text-sm font-mono ${isDarkMode ? 'bg-secondary text-primary' : 'bg-amber-100 text-amber-900'}`}
                  {...rest}
                >
                  {children}
                </code>
              );
            },
          }}
        >
          {page.content}
        </ReactMarkdown>
      </div>

      {/* Page number */}
      <div className={`text-center mt-8 pt-4 border-t ${isDarkMode ? 'border-border/30 text-muted-foreground' : 'border-stone-300 text-stone-500'}`}>
        <span className="font-serif italic">{page.pageNumber}</span>
      </div>
    </div>
  );

  return (
    <div
      ref={bookRef}
      className={`
        relative w-full h-[calc(100vh-4rem)] md:h-[calc(100vh-2rem)]
        ${isDarkMode ? 'bg-background' : 'bg-stone-200'}
        ${isFullscreen ? 'fixed inset-0 z-50' : 'rounded-2xl overflow-hidden'}
      `}
    >
      {/* Top toolbar */}
      <div className={`
        absolute top-0 left-0 right-0 z-30 h-14
        flex items-center justify-between px-4
        ${isDarkMode ? 'bg-background/90' : 'bg-stone-100/90'}
        backdrop-blur-sm border-b border-border/30
      `}>
        {/* Left side */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowToc(true)}
            title={t.tableOfContents}
          >
            <List className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSearch(true)}
            title={t.search}
          >
            <Search className="h-5 w-5" />
          </Button>
          <div className="hidden md:block ml-4 font-serif text-sm">
            <span className="text-muted-foreground">{t.chapter} {moduleNumber}:</span>{' '}
            <span className="font-medium">{title}</span>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleBookmark}
            title={isBookmarked ? t.bookmarked : t.bookmark}
          >
            {isBookmarked ? (
              <BookmarkCheck className="h-5 w-5 text-primary" />
            ) : (
              <Bookmark className="h-5 w-5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSettings(true)}
            title={t.settings}
          >
            <Settings className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? t.exitFullscreen : t.fullscreen}
          >
            {isFullscreen ? (
              <Minimize2 className="h-5 w-5" />
            ) : (
              <Maximize2 className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Book content */}
      <div className="absolute top-14 bottom-20 left-0 right-0 flex">
        {/* Left navigation area */}
        <button
          onClick={() => goToPage(currentPage - (isTwoPageView ? 2 : 1))}
          disabled={currentPage <= 1}
          className={`
            w-16 md:w-24 flex items-center justify-center
            ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-black/5'}
            disabled:opacity-30 disabled:cursor-not-allowed
            transition-colors
          `}
        >
          <ChevronLeft className="h-8 w-8 text-muted-foreground" />
        </button>

        {/* Pages */}
        <div className="flex-1 flex overflow-hidden shadow-2xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className="flex w-full h-full"
            >
              {currentPageData && (
                <PageContent page={currentPageData} isLeft={true} />
              )}
              {isTwoPageView && nextPageData && (
                <PageContent page={nextPageData} isLeft={false} />
              )}
              {isTwoPageView && !nextPageData && currentPageData && (
                <div className={`flex-1 h-full ${isDarkMode ? 'bg-card' : 'bg-[#FDF6E3]'} flex items-center justify-center`}>
                  <div className="text-center text-muted-foreground">
                    <BookOpen className="h-16 w-16 mx-auto mb-4 opacity-30" />
                    <p className="font-serif italic">End of chapter</p>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Right navigation area */}
        <button
          onClick={() => goToPage(currentPage + (isTwoPageView ? 2 : 1))}
          disabled={isLastPage}
          className={`
            w-16 md:w-24 flex items-center justify-center
            ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-black/5'}
            disabled:opacity-30 disabled:cursor-not-allowed
            transition-colors
          `}
        >
          <ChevronRight className="h-8 w-8 text-muted-foreground" />
        </button>
      </div>

      {/* Bottom toolbar */}
      <div className={`
        absolute bottom-0 left-0 right-0 z-30 h-20
        flex flex-col items-center justify-center px-4
        ${isDarkMode ? 'bg-background/90' : 'bg-stone-100/90'}
        backdrop-blur-sm border-t border-border/30
      `}>
        {/* Progress bar */}
        <div className="w-full max-w-xl mb-2">
          <div className={`h-1 rounded-full ${isDarkMode ? 'bg-secondary' : 'bg-stone-300'}`}>
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Page info and navigation */}
        <div className="flex items-center justify-between w-full max-w-xl">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate?.('prev')}
            disabled={moduleNumber <= 1}
            className="text-xs"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            {t.previousChapter}
          </Button>

          <div className="text-sm font-serif">
            <span className="text-muted-foreground">{t.page}</span>{' '}
            <input
              type="number"
              value={currentPage}
              onChange={(e) => goToPage(parseInt(e.target.value) || 1)}
              className={`w-12 text-center bg-transparent border-b ${isDarkMode ? 'border-border' : 'border-stone-400'}`}
              min={1}
              max={totalPages}
            />
            <span className="text-muted-foreground"> {t.of} {totalPages}</span>
          </div>

          {isLastPage ? (
            <Button
              variant="default"
              size="sm"
              onClick={onComplete}
              className="text-xs"
            >
              {t.completeChapter}
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate?.('next')}
              disabled={moduleNumber >= totalModules}
              className="text-xs"
            >
              {t.nextChapter}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </div>

      {/* Table of Contents Drawer */}
      <AnimatePresence>
        {showToc && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black z-40"
              onClick={() => setShowToc(false)}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className={`
                fixed top-0 left-0 bottom-0 w-80 z-50
                ${isDarkMode ? 'bg-card' : 'bg-white'}
                shadow-2xl overflow-y-auto
              `}
            >
              <div className="sticky top-0 flex items-center justify-between p-4 border-b border-border bg-inherit">
                <h2 className="font-serif font-bold">{t.tableOfContents}</h2>
                <Button variant="ghost" size="icon" onClick={() => setShowToc(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <div className="p-4">
                {tableOfContents.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      goToPage(item.page);
                      setShowToc(false);
                    }}
                    className={`
                      w-full text-left py-2 px-3 rounded-lg
                      hover:bg-secondary transition-colors
                      ${item.level === 1 ? 'font-bold text-base' : ''}
                      ${item.level === 2 ? 'font-medium text-sm pl-6' : ''}
                      ${item.level === 3 ? 'text-sm text-muted-foreground pl-10' : ''}
                      ${item.page === currentPage ? 'bg-primary/10 text-primary' : ''}
                    `}
                  >
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
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black z-40"
              onClick={() => setShowSettings(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className={`
                fixed top-0 right-0 bottom-0 w-80 z-50
                ${isDarkMode ? 'bg-card' : 'bg-white'}
                shadow-2xl
              `}
            >
              <div className="sticky top-0 flex items-center justify-between p-4 border-b border-border bg-inherit">
                <h2 className="font-serif font-bold">{t.settings}</h2>
                <Button variant="ghost" size="icon" onClick={() => setShowSettings(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <div className="p-4 space-y-6">
                {/* Font size */}
                <div>
                  <label className="block text-sm font-medium mb-2">{t.fontSize}</label>
                  <div className="flex items-center gap-4">
                    <span className="text-xs">A</span>
                    <input
                      type="range"
                      min={12}
                      max={24}
                      value={fontSize}
                      onChange={(e) => setFontSize(parseInt(e.target.value))}
                      className="flex-1"
                    />
                    <span className="text-lg">A</span>
                  </div>
                  <div className="text-center text-sm text-muted-foreground mt-1">
                    {fontSize}px
                  </div>
                </div>

                {/* Dark mode */}
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">{t.darkMode}</label>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setIsDarkMode(!isDarkMode)}
                  >
                    {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                  </Button>
                </div>

                {/* Bookmarked pages */}
                {bookmarkedPages.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      {t.bookmarked} ({bookmarkedPages.length})
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {bookmarkedPages.sort((a, b) => a - b).map(page => (
                        <Button
                          key={page}
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            goToPage(page);
                            setShowSettings(false);
                          }}
                        >
                          {page}
                        </Button>
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
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black z-40"
              onClick={() => setShowSearch(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              className={`
                fixed top-20 left-1/2 -translate-x-1/2 w-full max-w-lg z-50
                ${isDarkMode ? 'bg-card' : 'bg-white'}
                rounded-2xl shadow-2xl overflow-hidden
              `}
            >
              <div className="p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder={t.searchPlaceholder}
                    className={`
                      w-full pl-10 pr-10 py-3 rounded-xl
                      ${isDarkMode ? 'bg-secondary' : 'bg-stone-100'}
                      border-none focus:ring-2 focus:ring-primary
                    `}
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      onClick={() => handleSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      <X className="h-5 w-5 text-muted-foreground" />
                    </button>
                  )}
                </div>
              </div>
              {searchQuery && (
                <div className="max-h-64 overflow-y-auto border-t border-border">
                  {searchResults.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      {t.noResults}
                    </div>
                  ) : (
                    searchResults.map(page => (
                      <button
                        key={page}
                        onClick={() => {
                          goToPage(page);
                          setShowSearch(false);
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-secondary flex items-center justify-between"
                      >
                        <span>{t.page} {page}</span>
                        <span className="text-sm text-muted-foreground">
                          {pages[page - 1]?.section}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Fullscreen hint */}
      {isFullscreen && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 text-xs text-muted-foreground animate-pulse">
          {t.pressEsc} • {t.useArrows}
        </div>
      )}
    </div>
  );
}

export default BookModuleView;
