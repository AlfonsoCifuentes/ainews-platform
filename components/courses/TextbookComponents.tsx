'use client';

import React from 'react';
import {
  Lightbulb,
  AlertTriangle,
  Info,
  CheckCircle,
  GraduationCap,
  Pencil,
  Brain,
  Zap
} from 'lucide-react';

// ============================================================================
// CHAPTER DECORATOR - Marginal number badge
// ============================================================================

export function ChapterDecorator({ number, isDark }: { number: number; isDark: boolean }) {
  return (
    <div className="absolute -left-4 md:-left-8 top-0 bottom-0 w-1 md:w-2">
      <div className={`h-full ${isDark ? 'bg-gradient-to-b from-primary/80 via-primary/40 to-transparent' : 'bg-gradient-to-b from-blue-600/80 via-blue-400/40 to-transparent'}`} />
      <div className={`absolute top-8 -left-6 md:-left-10 w-14 md:w-20 h-14 md:h-20 rounded-full flex items-center justify-center
        ${isDark ? 'bg-primary/20 border-2 border-primary/40' : 'bg-blue-100 border-2 border-blue-300'}`}>
        <span className={`text-2xl md:text-3xl font-bold font-serif ${isDark ? 'text-primary' : 'text-blue-700'}`}>
          {number}
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// CALLOUT BOX - Did You Know, Warning, Tip, etc.
// ============================================================================

interface CalloutBoxProps {
  type: string;
  content: string;
  isDark: boolean;
  locale: 'en' | 'es';
}

type CalloutBodyBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] };

function parseCalloutBody(content: string): CalloutBodyBlock[] {
  const blocks: CalloutBodyBlock[] = [];
  const lines = String(content ?? '')
    .replace(/\r\n/g, '\n')
    .split('\n');

  let paragraphLines: string[] = [];
  let listItems: string[] = [];

  const flushParagraph = () => {
    const merged = paragraphLines.join(' ').replace(/\s+/g, ' ').trim();
    if (merged) blocks.push({ type: 'paragraph', text: merged });
    paragraphLines = [];
  };

  const flushList = () => {
    if (listItems.length) blocks.push({ type: 'list', items: listItems });
    listItems = [];
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    const listMatch = line.match(/^[-*]\s+(.+)$/);
    if (listMatch) {
      flushParagraph();
      listItems.push(listMatch[1].trim());
      continue;
    }

    flushList();
    paragraphLines.push(line);
  }

  flushParagraph();
  flushList();

  return blocks;
}

export function CalloutBox({ type, content, isDark, locale }: CalloutBoxProps) {
  const configs: Record<string, { 
    icon: React.ReactNode; 
    title: string; 
    bgClass: string; 
    borderClass: string;
    iconBg: string;
    accentColor: string;
  }> = {
    'didyouknow': {
      icon: <Lightbulb className="w-5 h-5" />,
      title: '💡 Did You Know?',
      bgClass: isDark ? 'bg-amber-500/10' : 'bg-amber-50',
      borderClass: isDark ? 'border-amber-500/40' : 'border-amber-400',
      iconBg: isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-200 text-amber-700',
      accentColor: isDark ? 'text-amber-400' : 'text-amber-700'
    },
    'warning': {
      icon: <AlertTriangle className="w-5 h-5" />,
      title: '⚠️ Warning',
      bgClass: isDark ? 'bg-red-500/10' : 'bg-red-50',
      borderClass: isDark ? 'border-red-500/40' : 'border-red-400',
      iconBg: isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-200 text-red-700',
      accentColor: isDark ? 'text-red-400' : 'text-red-700'
    },
    'tip': {
      icon: <CheckCircle className="w-5 h-5" />,
      title: '✅ Pro Tip',
      bgClass: isDark ? 'bg-green-500/10' : 'bg-green-50',
      borderClass: isDark ? 'border-green-500/40' : 'border-green-400',
      iconBg: isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-200 text-green-700',
      accentColor: isDark ? 'text-green-400' : 'text-green-700'
    },
    'key-concept': {
      icon: <Brain className="w-5 h-5" />,
      title: '🧠 Did You Know?',
      bgClass: isDark ? 'bg-primary/10' : 'bg-blue-50',
      borderClass: isDark ? 'border-primary/40' : 'border-blue-400',
      iconBg: isDark ? 'bg-primary/20 text-primary' : 'bg-blue-200 text-blue-700',
      accentColor: isDark ? 'text-primary' : 'text-blue-700'
    },
    'example': {
      icon: <Zap className="w-5 h-5" />,
      title: '📝 Example',
      bgClass: isDark ? 'bg-blue-500/10' : 'bg-blue-50',
      borderClass: isDark ? 'border-blue-500/40' : 'border-blue-400',
      iconBg: isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-200 text-blue-700',
      accentColor: isDark ? 'text-blue-400' : 'text-blue-700'
    },
    'exercise': {
      icon: <Pencil className="w-5 h-5" />,
      title: '✏️ Exercise',
      bgClass: isDark ? 'bg-cyan-500/10' : 'bg-cyan-50',
      borderClass: isDark ? 'border-cyan-500/40' : 'border-cyan-400',
      iconBg: isDark ? 'bg-cyan-500/20 text-cyan-400' : 'bg-cyan-200 text-cyan-700',
      accentColor: isDark ? 'text-cyan-400' : 'text-cyan-700'
    },
    'summary': {
      icon: <GraduationCap className="w-5 h-5" />,
      title: '📚 Summary',
      bgClass: isDark ? 'bg-indigo-500/10' : 'bg-indigo-50',
      borderClass: isDark ? 'border-indigo-500/40' : 'border-indigo-400',
      iconBg: isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-200 text-indigo-700',
      accentColor: isDark ? 'text-indigo-400' : 'text-indigo-700'
    },
    'callout': {
      icon: <Info className="w-5 h-5" />,
      title: 'ℹ️ Note',
      bgClass: isDark ? 'bg-slate-500/10' : 'bg-slate-100',
      borderClass: isDark ? 'border-slate-500/40' : 'border-slate-400',
      iconBg: isDark ? 'bg-slate-500/20 text-slate-400' : 'bg-slate-200 text-slate-600',
      accentColor: isDark ? 'text-slate-400' : 'text-slate-600'
    }
  };

  const config = configs[type] || configs['callout'];
  
  // Parse content for title if it starts with **title**
  const titleMatch = content.match(/^\*\*([^*]+)\*\*\n\n?([\s\S]*)/);

  const localizedTitles: Record<string, { en: string; es: string }> = {
    didyouknow: { en: 'Did you know?', es: '¿Sabías que?' },
    warning: { en: 'Warning', es: 'Advertencia' },
    tip: { en: 'Tip', es: 'Consejo' },
    'key-concept': { en: 'Did you know?', es: '¿Sabías que?' },
    example: { en: 'Example', es: 'Ejemplo' },
    exercise: { en: 'Exercise', es: 'Ejercicio' },
    summary: { en: 'Summary', es: 'Resumen' },
    callout: { en: 'Note', es: 'Nota' },
  };

  const fallbackTitle = localizedTitles[type]?.[locale] ?? localizedTitles.callout[locale];
  const rawTitle = titleMatch ? titleMatch[1] : null;
  const rawContent = titleMatch ? titleMatch[2] : content;

  const isLegacyKeyDistinctionTitle = (value: string | null) => {
    if (!value) return false;
    const normalized = value.trim().toLowerCase();
    return (
      normalized === 'key distinction' ||
      normalized === 'key concept' ||
      normalized === 'distinción clave' ||
      normalized === 'distincion clave'
    );
  };

  // Brain / fun-fact callouts must always be rendered as “Did you know?” regardless
  // of leaked rubric titles like “Key Distinction”.
  const shouldForceFunFactTitle = type === 'key-concept' || type === 'didyouknow';
  const displayTitle = (shouldForceFunFactTitle || isLegacyKeyDistinctionTitle(rawTitle))
    ? fallbackTitle
    : (rawTitle ?? fallbackTitle);

  const displayContent = String(rawContent ?? '').trim();
  if (!displayContent) {
    return null;
  }
  const bodyBlocks = parseCalloutBody(displayContent);

  return (
    <div className={`
      relative my-8 rounded-xl overflow-hidden
      border-l-4 ${config.borderClass}
      ${config.bgClass}
      shadow-lg
    `}>
      {/* Header bar */}
      <div className={`
        flex items-center gap-3 px-5 py-3
        ${isDark ? 'bg-black/20' : 'bg-white/50'}
        border-b ${isDark ? 'border-white/10' : 'border-black/5'}
      `}>
        <div className={`
          w-8 h-8 rounded-lg flex items-center justify-center
          ${config.iconBg}
        `}>
          {config.icon}
        </div>
        <h4 className={`font-bold text-sm uppercase tracking-wide ${config.accentColor}`}>
          {displayTitle}
        </h4>
      </div>
      
      {/* Content */}
      <div className={`
        px-5 py-4 text-sm leading-relaxed
        ${isDark ? 'text-muted-foreground' : 'text-gray-700'}
      `}>
        {bodyBlocks.length ? (
          bodyBlocks.map((block, idx) => {
            if (block.type === 'paragraph') {
              return (
                <p key={idx} className={idx === 0 ? '' : 'mt-3'}>
                  <FormattedText text={block.text} isDark={isDark} />
                </p>
              );
            }

            return (
              <ul key={idx} className={`${idx === 0 ? '' : 'mt-3'} space-y-2 pl-0`}>
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex} className="flex items-start gap-3">
                    <span className={`
                      mt-2 w-1.5 h-1.5 rounded-full flex-shrink-0
                      ${isDark ? 'bg-primary' : 'bg-blue-500'}
                    `} />
                    <span className="flex-1">
                      <FormattedText text={item} isDark={isDark} />
                    </span>
                  </li>
                ))}
              </ul>
            );
          })
        ) : (
          <FormattedText text={displayContent} isDark={isDark} />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// QUOTE BLOCK - Blockquotes with attribution
// ============================================================================

export function QuoteBlock({ content, isDark }: { content: string; isDark: boolean }) {
  const lines = content.split('\n').map((l) => l.trim()).filter(Boolean);
  const lastLine = lines[lines.length - 1] || '';

  const stripMarkdown = (text: string) => {
    let t = text.trim();
    t = t.replace(/^#+\s*/, ''); // headings
    t = t.replace(/^\*+|\*+$/g, ''); // surrounding emphasis
    t = t.replace(/^"|"$/g, ''); // surrounding quotes
    return t.trim();
  };

  const attributionMatch = lastLine.match(/^\*?\s*[—\-–]\s*(.+?)\s*\*?$/);
  const isAttribution = Boolean(attributionMatch);

  const quoteRaw = isAttribution ? lines.slice(0, -1).join('\n') : lines.join('\n');
  const quote = stripMarkdown(quoteRaw);
  const attribution = isAttribution ? stripMarkdown(attributionMatch?.[1] ?? '') : null;

  return (
    <figure className={`
      relative my-10 mx-0 md:mx-6
    `}>
      {/* Decorative quote marks */}
      <div className={`
        absolute -top-4 -left-2 text-6xl font-serif leading-none select-none
        ${isDark ? 'text-primary/20' : 'text-blue-200'}
      `}>
        &ldquo;
      </div>
      
      <blockquote className={`
        relative z-10 pl-8 pr-4 py-4
        border-l-2
        ${isDark ? 'border-primary/30' : 'border-blue-300'}
      `}>
        <p className={`
          font-serif italic text-lg md:text-xl leading-relaxed
          ${isDark ? 'text-foreground' : 'text-stone-700'}
        `}>
          {quote}
        </p>
      </blockquote>
      
      {attribution && (
        <figcaption className={`
          mt-3 pl-8 text-sm
          ${isDark ? 'text-muted-foreground' : 'text-stone-500'}
        `}>
          <span className={isDark ? 'text-primary' : 'text-blue-600'}>—</span> {attribution}
        </figcaption>
      )}
    </figure>
  );
}

// ============================================================================
// FORMATTED TEXT - Inline formatting (bold, italic, code, links)
// ============================================================================

export function FormattedText({ text, isDark }: { text: string; isDark: boolean }) {
  if (!text) return null;
  
  // Split by formatting markers and render appropriately
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g);
  
  return (
    <>
      {parts.map((part, i) => {
        if (!part) return null;
        
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
          return <em key={i}>{part.slice(1, -1)}</em>;
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <code 
              key={i} 
              className={`
                px-1.5 py-0.5 rounded text-[0.9em] font-mono
                ${isDark ? 'bg-secondary text-primary' : 'bg-stone-200 text-stone-800'}
              `}
            >
              {part.slice(1, -1)}
            </code>
          );
        }
        const linkMatch = part.match(/\[([^\]]+)\]\(([^)]+)\)/);
        if (linkMatch) {
          return (
            <a 
              key={i} 
              href={linkMatch[2]} 
              className={`
                underline decoration-1 underline-offset-2
                ${isDark ? 'text-primary hover:text-primary/80' : 'text-blue-600 hover:text-blue-500'}
              `}
              target="_blank" 
              rel="noopener noreferrer"
            >
              {linkMatch[1]}
            </a>
          );
        }
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </>
  );
}

// ============================================================================
// CODE BLOCK - Syntax highlighted code
// ============================================================================

type CommentConfig = {
  lineMarkers: string[];
  blockStart?: string;
  blockEnd?: string;
};

function getCommentConfig(language?: string): CommentConfig {
  const lang = (language ?? '').trim().toLowerCase();
  if (['python', 'py', 'bash', 'sh', 'shell', 'yaml', 'yml', 'dockerfile', 'makefile'].includes(lang)) {
    return { lineMarkers: ['#'] };
  }
  if (['sql'].includes(lang)) {
    return { lineMarkers: ['--'], blockStart: '/*', blockEnd: '*/' };
  }
  if (['html', 'xml'].includes(lang)) {
    return { lineMarkers: [], blockStart: '<!--', blockEnd: '-->' };
  }
  if (['css', 'scss', 'less'].includes(lang)) {
    return { lineMarkers: [], blockStart: '/*', blockEnd: '*/' };
  }
  return { lineMarkers: ['//', '#'], blockStart: '/*', blockEnd: '*/' };
}

function findLineCommentIndex(line: string, markers: string[]): { index: number; marker: string } | null {
  let best: { index: number; marker: string } | null = null;
  for (const marker of markers) {
    let idx = line.indexOf(marker);
    while (idx >= 0) {
      if (marker === '#') {
        const rest = line.slice(idx);
        if (rest.startsWith('#!') || /^#(include|define|pragma)\b/i.test(rest)) {
          idx = line.indexOf(marker, idx + 1);
          continue;
        }
        if (idx > 0 && !/\s/.test(line[idx - 1])) {
          idx = line.indexOf(marker, idx + 1);
          continue;
        }
      }
      if (marker === '//' && idx > 0 && line[idx - 1] === ':') {
        idx = line.indexOf(marker, idx + 2);
        continue;
      }
      if (!best || idx < best.index) {
        best = { index: idx, marker };
      }
      break;
    }
  }
  return best;
}

function renderCodeWithCommentHighlights(code: string, language?: string): React.ReactNode[] {
  const normalized = String(code ?? '').replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');
  const config = getCommentConfig(language);
  const nodes: React.ReactNode[] = [];
  let inBlock = false;

  lines.forEach((line, idx) => {
    let before = line;
    let comment = '';
    let after = '';
    let nextInBlock = inBlock;
    const blockStart = config.blockStart ?? '';

    if (inBlock && config.blockEnd) {
      const endIdx = line.indexOf(config.blockEnd);
      if (endIdx >= 0) {
        before = '';
        comment = line.slice(0, endIdx + config.blockEnd.length);
        after = line.slice(endIdx + config.blockEnd.length);
        nextInBlock = false;
      } else {
        before = '';
        comment = line;
        after = '';
        nextInBlock = true;
      }
    } else {
      const blockIdx = blockStart ? line.indexOf(blockStart) : -1;
      const lineComment = findLineCommentIndex(line, config.lineMarkers);

      if (blockIdx >= 0 && (!lineComment || blockIdx < lineComment.index)) {
        before = line.slice(0, blockIdx);
        if (config.blockEnd) {
          const endIdx = line.indexOf(config.blockEnd, blockIdx + blockStart.length);
          if (endIdx >= 0) {
            comment = line.slice(blockIdx, endIdx + config.blockEnd.length);
            after = line.slice(endIdx + config.blockEnd.length);
            nextInBlock = false;
          } else {
            comment = line.slice(blockIdx);
            after = '';
            nextInBlock = true;
          }
        } else {
          comment = line.slice(blockIdx);
        }
      } else if (lineComment) {
        before = line.slice(0, lineComment.index);
        comment = line.slice(lineComment.index);
        after = '';
      }
    }

    nodes.push(
      <React.Fragment key={`line-${idx}`}>
        {before}
        {comment ? (
          <span key={`comment-${idx}`} className="text-emerald-400/80">
            {comment}
          </span>
        ) : null}
        {after}
        {idx < lines.length - 1 ? '\n' : ''}
      </React.Fragment>
    );

    inBlock = nextInBlock;
  });

  return nodes;
}

function looksLikeSql(code: string): boolean {
  const text = String(code ?? '').trim();
  if (!text) return false;

  const compacted = text.replace(/\s+/g, ' ').toLowerCase();

  // Heuristic: if it contains common SQL structure/keywords, treat as real SQL.
  const keyword = /\b(select|insert|update|delete|from|where|join|group by|order by|having|create table|alter table|drop table|with|limit|offset)\b/i;
  const hasKeyword = keyword.test(compacted);

  const hasSqlPunctuation = /;|\binto\b|\bvalues\b|\bset\b/i.test(compacted);
  const hasSqlComment = /(^|\n)\s*--/.test(text) || /\/\*/.test(text);

  // If it's a single sentence with no SQL syntax cues, assume it's prose.
  const looksLikeProse =
    !hasKeyword &&
    !hasSqlPunctuation &&
    !hasSqlComment &&
    compacted.length < 260 &&
    /[a-z]/.test(compacted) &&
    !/[{}<>]/.test(compacted);

  if (looksLikeProse) return false;
  return hasKeyword || hasSqlPunctuation || hasSqlComment;
}

export function CodeBlock({
  code,
  language,
  subtitle,
  isDark,
}: {
  code: string;
  language?: string;
  subtitle?: string;
  isDark: boolean;
}) {
  const normalizedLanguage = (language ?? '').trim().toLowerCase();

  // Some legacy modules contain prose wrapped in ```sql fences.
  // Render those as a plain content box (no language label, no monospace).
  if (normalizedLanguage === 'sql' && !looksLikeSql(code)) {
    const text = String(code ?? '').trim();
    if (!text) return null;
    return (
      <div
        className={
          `my-8 w-full max-w-full min-w-0 border border-white/20 bg-black/60 rounded-none px-5 py-4 ` +
          (isDark ? 'text-muted-foreground' : 'text-gray-100')
        }
      >
        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{text}</p>
      </div>
    );
  }

  const renderedCode = renderCodeWithCommentHighlights(code, language);
  return (
    <figure className="my-8 w-full max-w-full min-w-0 rounded-xl overflow-hidden shadow-lg">
      {/* Language header */}
      {language && (
        <div className={`
          px-4 py-2 text-xs font-mono uppercase tracking-wide
          ${isDark ? 'bg-gray-900 text-gray-500 border-b border-gray-800' : 'bg-gray-800 text-gray-400 border-b border-gray-700'}
        `}>
          {language}
        </div>
      )}

      {/* Code content */}
      <pre className={`
        p-4 md:p-6 overflow-x-auto text-sm leading-relaxed max-w-full min-w-0
        ${isDark ? 'bg-gray-950 text-gray-100' : 'bg-gray-900 text-gray-100'}
      `}>
        <code className="font-mono">{renderedCode}</code>
      </pre>

      {subtitle && (
        <figcaption className={`
          px-4 pb-3 pt-1 text-xs italic
          ${isDark ? 'bg-gray-950 text-gray-400' : 'bg-gray-900 text-gray-300'}
        `}>
          {subtitle}
        </figcaption>
      )}
    </figure>
  );
}

// ============================================================================
// TABLE BLOCK - Markdown tables
// ============================================================================

export function TableBlock({ content, isDark }: { content: string; isDark: boolean }) {
  const lines = content.split('\n').filter(l => l.trim());
  if (lines.length < 2) return null;

  const parseRow = (line: string) => 
    line.split('|').filter(cell => cell.trim()).map(cell => cell.trim());

  const headers = parseRow(lines[0]);
  // Skip separator line (index 1) and parse data rows
  const rows = lines.slice(2).map(parseRow);

  return (
    <figure className="my-8 overflow-x-auto">
      <div className="rounded-xl overflow-hidden shadow-lg border">
        <table className={`
          w-full border-collapse text-sm
          ${isDark ? 'border-border' : 'border-stone-200'}
        `}>
          <thead>
            <tr className={isDark ? 'bg-secondary' : 'bg-stone-100'}>
              {headers.map((header, i) => (
                <th 
                  key={i} 
                  className={`
                    px-4 py-3 text-left text-xs font-bold uppercase tracking-wide
                    ${isDark ? 'text-foreground border-border' : 'text-stone-700 border-stone-200'}
                    ${i > 0 ? 'border-l' : ''}
                  `}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr 
                key={i} 
                className={`
                  ${i % 2 === 0 
                    ? (isDark ? 'bg-card' : 'bg-white') 
                    : (isDark ? 'bg-secondary/30' : 'bg-stone-50')
                  }
                  ${isDark ? 'hover:bg-secondary/50' : 'hover:bg-stone-100'}
                  transition-colors
                `}
              >
                {row.map((cell, j) => (
                  <td 
                    key={j} 
                    className={`
                      px-4 py-3 border-t
                      ${isDark ? 'border-border/50 text-muted-foreground' : 'border-stone-100 text-stone-600'}
                      ${j > 0 ? 'border-l' : ''}
                    `}
                  >
                    <FormattedText text={cell} isDark={isDark} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}

// ============================================================================
// LIST BLOCK - Unordered and ordered lists with custom bullets
// ============================================================================

export function ListBlock({ 
  items, 
  ordered = false, 
  isDark 
}: { 
  items: string[]; 
  ordered?: boolean; 
  isDark: boolean;
}) {
  return (
    <ul className="my-6 space-y-3 pl-0">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-4">
          {/* Custom bullet/number */}
          {!ordered ? (
            <span className={`
              mt-2.5 w-2 h-2 rounded-full flex-shrink-0
              ${isDark ? 'bg-primary' : 'bg-blue-500'}
            `} />
          ) : (
            <span className={`
              flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center
              text-xs font-bold
              ${isDark ? 'bg-primary/20 text-primary' : 'bg-blue-100 text-blue-700'}
            `}>
              {i + 1}
            </span>
          )}
          
          {/* Item content */}
          <span className={`
            leading-relaxed flex-1
            ${isDark ? 'text-muted-foreground' : 'text-stone-600'}
          `}>
            <FormattedText text={item} isDark={isDark} />
          </span>
        </li>
      ))}
    </ul>
  );
}
