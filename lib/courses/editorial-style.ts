export type EditorialStyleIssue = {
  code:
    | 'missing_h1'
    | 'missing_standfirst'
    | 'missing_separator'
    | 'missing_pull_quote'
    | 'missing_sidebar_box'
    | 'code_fence_missing_language'
    | 'too_many_plain_paragraphs';
  message: string;
};

export type NormalizeEditorialOptions = {
  title?: string;
  standfirst?: string;
  locale?: 'en' | 'es';
};

function isPlainParagraph(block: string): boolean {
  const t = block.trim();
  if (!t) return false;
  if (t.startsWith('#')) return false;
  if (t.startsWith('>')) return false;
  if (t.startsWith('```')) return false;
  if (t.startsWith('|')) return false;
  if (t.startsWith('- ') || t.startsWith('* ') || /^\d+\.\s/.test(t)) return false;
  if (t.startsWith(':::')) return false;
  if (/^---+$/.test(t)) return false;
  if (t.startsWith('![DISEÑO:') || t.startsWith('![DISE\u00d1O:') || /!\[\s*DISE\u00d1O\s*:/i.test(t)) return false;
  return true;
}

function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function isMetaLine(text: string): boolean {
  return text.includes('|') && /\b(Tiempo|Nivel|Tags|Level|Duration)\b/i.test(text);
}

function isStructuralLine(text: string): boolean {
  if (!text) return false;
  if (text.startsWith('#')) return true;
  if (text.startsWith('>')) return true;
  if (text.startsWith('|')) return true;
  if (text.startsWith('```')) return true;
  if (text.startsWith(':::')) return true;
  if (text.startsWith('- ') || text.startsWith('* ') || /^\d+\.\s/.test(text)) return true;
  if (/^---+$/.test(text)) return true;
  if (/^!\[\s*DISE/i.test(text)) return true;
  if (text.startsWith('**') && text.endsWith('**')) return true;
  if (isMetaLine(text)) return true;
  return false;
}

/**
 * Lightweight audit for the editorial/magazine markdown rules.
 * Returns a list of issues (empty means "looks compliant enough").
 */
export function auditEditorialMarkdown(markdown: string): EditorialStyleIssue[] {
  const issues: EditorialStyleIssue[] = [];
  const lines = markdown.split(/\r?\n/);

  const firstNonEmptyIndex = lines.findIndex((l) => l.trim().length > 0);
  const firstLine = firstNonEmptyIndex >= 0 ? lines[firstNonEmptyIndex].trim() : '';

  if (!firstLine.startsWith('# ')) {
    issues.push({
      code: 'missing_h1',
      message: 'Missing H1 title as the first non-empty line (# Title).',
    });
  }

  const afterTitle = firstNonEmptyIndex >= 0 ? lines.slice(firstNonEmptyIndex + 1) : lines;
  const firstSeparatorIndex = afterTitle.findIndex((l) => /^---+$/.test(l.trim()));

  const preSeparator = firstSeparatorIndex >= 0 ? afterTitle.slice(0, firstSeparatorIndex) : afterTitle;
  const hasStandfirst = preSeparator.some((l) => l.trim().startsWith('**') && l.trim().endsWith('**'));

  if (!hasStandfirst) {
    issues.push({
      code: 'missing_standfirst',
      message: 'Missing bold 2-line standfirst immediately after the H1.',
    });
  }

  if (firstSeparatorIndex < 0) {
    issues.push({
      code: 'missing_separator',
      message: 'Missing --- separator after the hook (title + standfirst).',
    });
  }

  const hasPullQuote = markdown.includes('> ##');
  if (!hasPullQuote) {
    issues.push({
      code: 'missing_pull_quote',
      message: 'No pull quote found. Expected at least one blockquote with "> ##".',
    });
  }

  const hasSidebarBox = /\|\s*💡\s*TECH\s+INSIGHT\s*:/i.test(markdown);
  if (!hasSidebarBox) {
    issues.push({
      code: 'missing_sidebar_box',
      message: 'No sidebar box found. Expected a one-cell table starting with "| 💡 TECH INSIGHT:".',
    });
  }

  // Code fences should specify language
  const fenceRegex = /```([^\n\r]*)/g;
  let fenceMatch: RegExpExecArray | null;
  while ((fenceMatch = fenceRegex.exec(markdown)) !== null) {
    const lang = (fenceMatch[1] ?? '').trim();
    if (!lang) {
      issues.push({
        code: 'code_fence_missing_language',
        message: 'Found a code fence without a language (```python, ```ts, etc.).',
      });
      break;
    }
  }

  // Approximate "3 plain paragraphs" rule.
  // Split by blank lines into blocks and count consecutive plain paragraph blocks.
  const blocks = markdown
    .split(/\n\s*\n/g)
    .map((b) => b.trim())
    .filter(Boolean);

  let run = 0;
  let maxRun = 0;
  for (const b of blocks) {
    if (isPlainParagraph(b)) {
      run += 1;
      maxRun = Math.max(maxRun, run);
    } else {
      run = 0;
    }
  }

  if (maxRun > 3) {
    issues.push({
      code: 'too_many_plain_paragraphs',
      message: `Detected ${maxRun} consecutive plain paragraphs. The guide requires max 3 before a widget break.`,
    });
  }

  return issues;
}

function normalizeNewlines(input: string): string {
  return input.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function normalizeSeparatorLines(markdown: string): string {
  return markdown.replace(/^\s*--\s*$/gm, '---');
}

function removeEmptyListMarkers(markdown: string): string {
  return markdown
    .replace(/^\s*[-*]\s*$/gm, '')
    .replace(/^\s*[-*]\s*>\s*$/gm, '')
    .replace(/^\s*>\s*$/gm, '');
}

function fixSidebarTableArtifacts(markdown: string): string {
  const lines = normalizeNewlines(markdown).split('\n');
  const out: string[] = [];

  const isNoiseLine = (text: string): boolean => {
    if (!text.trim()) return true;
    if (/^[-*]+(\s+[-*]+)*$/.test(text)) return true;
    if (/^[|:\s-]+$/.test(text)) return true;
    return !/[A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ]/.test(text);
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith('|') && /(TECH\s+INSIGHT|INSIGHT|CONSEJO|TIP)/i.test(trimmed)) {
      const cells = trimmed.split('|').map((c) => c.trim()).filter(Boolean);
      const rawTitle = cells[0] || trimmed.replace(/^\|\s*|\s*\|$/g, '');
      const title = collapseWhitespace(rawTitle);

      let body = '';
      let j = i + 1;
      for (; j < lines.length; j++) {
        const candidate = lines[j].trim();
        if (isNoiseLine(candidate)) continue;
        if (/^\|\s*:?-{2,}:?\s*\|?$/.test(candidate)) continue;
        if (candidate.startsWith('|')) {
          const rowCells = candidate.split('|').map((c) => c.trim()).filter(Boolean);
          if (rowCells.length) {
            body = rowCells[rowCells.length - 1];
            break;
          }
        } else if (!isStructuralLine(candidate)) {
          body = candidate;
          break;
        } else {
          break;
        }
      }

      if (title && body) {
        out.push(`| ${title} |`, '| :--- |', `| ${collapseWhitespace(body)} |`);
        i = j;
        continue;
      }
    }

    out.push(line);
  }

  return out.join('\n');
}

function stripPromptArtifacts(markdown: string): string {
  const normalized = normalizeNewlines(markdown ?? '');
  const triggerRegex =
    /(required structure|estructura requerida|quality requirements|requisitos de calidad|final non-negotiable|requisitos no negociables|only valid|solo json|respond only|responde solo|generate exactly|genera exactamente)/i;

  if (!triggerRegex.test(normalized)) {
    return normalized;
  }

  const instructionHeadingRegex =
    /^(#{1,6}\s*)?(required structure|estructura requerida|quality requirements|requisitos de calidad|guidelines|directrices|style|estilo|critical|cr\u00edtico|non-negotiable|no negociables|final non-negotiable|final requirements|quality checklist|checklist|remember|recuerda)\b/i;
  const instructionLineRegex =
    /(only valid|solo json|respond only|responde solo|no markdown|sin markdown|no commentary|sin comentarios|do not include|no incluyas|generate exactly|genera exactamente|word count|m\u00ednimo|minimo|tokens?|schema|json|markdown|placeholders?)/i;
  const placeholderLineRegex = /^\s*\[[^\]]+\]\s*$/;
  const listLineRegex = /^\s*[-*•]\s+/;

  const lines = normalized.split('\n');
  const cleaned: string[] = [];
  let skippingBlock = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (instructionHeadingRegex.test(trimmed)) {
      skippingBlock = true;
      continue;
    }

    if (placeholderLineRegex.test(trimmed)) {
      continue;
    }

    if (instructionLineRegex.test(trimmed) && (skippingBlock || listLineRegex.test(trimmed))) {
      continue;
    }

    if (skippingBlock) {
      if (!trimmed) {
        skippingBlock = false;
        continue;
      }

      if (/^#{1,6}\s+/.test(trimmed) && !instructionHeadingRegex.test(trimmed)) {
        skippingBlock = false;
      } else {
        continue;
      }
    }

    cleaned.push(line);
  }

  return cleaned.join('\n');
}

function getFirstNonEmptyLineIndex(lines: string[]): number {
  return lines.findIndex((l) => l.trim().length > 0);
}

function defaultStandfirst(locale: 'en' | 'es' | undefined, title: string | undefined): string {
  if (locale === 'en') {
    return title ? `**A fast, structured module on ${title}.**` : '**A fast, structured module focused on fundamentals.**';
  }
  return title ? `**Un módulo directo y estructurado sobre ${title}.**` : '**Un módulo directo y estructurado para dominar los fundamentos.**';
}

function hasHeroHeaderBlock(linesAfterTitle: string[]): boolean {
  // Titanium-style hero: time/level/tags line.
  return linesAfterTitle.slice(0, 8).some((l) => l.trim().startsWith('**⏱️'));
}

function hasBoldStandfirst(linesAfterTitle: string[]): boolean {
  // Existing magazine hook: a bold standfirst line before the first ---.
  const firstSeparatorIndex = linesAfterTitle.findIndex((l) => /^---+$/.test(l.trim()));
  const preSeparator = firstSeparatorIndex >= 0 ? linesAfterTitle.slice(0, firstSeparatorIndex) : linesAfterTitle;
  return preSeparator.some((l) => {
    const t = l.trim();
    return t.startsWith('**') && t.endsWith('**') && t.length >= 6;
  });
}

function ensureHookStructure(lines: string[], options: NormalizeEditorialOptions): string[] {
  const locale = options.locale;
  const idx = getFirstNonEmptyLineIndex(lines);

  // If empty content, synthesize minimal hook.
  if (idx < 0) {
    const safeTitle = (options.title || (locale === 'en' ? 'MODULE' : 'MÓDULO')).trim();
    return [`# ${safeTitle}`, defaultStandfirst(locale, options.title), '---', ''];
  }

  const first = lines[idx].trim();

  // Promote "##" to "#" if it is the first heading.
  if (first.startsWith('## ') && !first.startsWith('### ')) {
    lines[idx] = `# ${first.replace(/^##\s+/, '').trim()}`;
  }

  // If the first non-empty line is not an H1, prepend H1.
  if (!lines[idx].trim().startsWith('# ')) {
    const safeTitle = (options.title || (locale === 'en' ? 'MODULE' : 'MÓDULO')).trim();
    lines.splice(idx, 0, `# ${safeTitle}`, '');
  }

  // Recompute after potential insertion.
  const idx2 = getFirstNonEmptyLineIndex(lines);
  const afterTitle = idx2 >= 0 ? lines.slice(idx2 + 1) : lines;

  // Hero format is already a valid hook. For non-hero, ensure a bold standfirst.
  const hero = hasHeroHeaderBlock(afterTitle);
  if (!hero && !hasBoldStandfirst(afterTitle)) {
    const standfirst = (options.standfirst && options.standfirst.trim().length > 0)
      ? `**${options.standfirst.trim()}**`
      : defaultStandfirst(locale, options.title);

    // Insert standfirst immediately after H1.
    const insertAt = (idx2 >= 0 ? idx2 + 1 : 0);
    // Keep one blank line between title and standfirst.
    if (lines[insertAt]?.trim().length) {
      lines.splice(insertAt, 0, '');
    }
    lines.splice(insertAt + 1, 0, standfirst, '');
  }

  // Ensure there is a separator early in the document.
  const firstNonEmpty = getFirstNonEmptyLineIndex(lines);
  const searchWindow = lines.slice(firstNonEmpty, firstNonEmpty + 25);
  const hasSeparatorEarly = searchWindow.some((l) => /^---+$/.test(l.trim()));
  if (!hasSeparatorEarly) {
    // Place after the initial hook area (after first bold line if present, otherwise after title).
    const start = firstNonEmpty >= 0 ? firstNonEmpty : 0;
    const end = Math.min(lines.length, start + 12);
    let insertAt = start + 1;
    for (let i = start + 1; i < end; i++) {
      const t = lines[i].trim();
      if (t.startsWith('**') && t.endsWith('**')) {
        insertAt = i + 1;
        break;
      }
    }
    lines.splice(insertAt, 0, '---', '');
  }

  return lines;
}

function normalizeEditorialListSyntax(lines: string[]): string[] {
  return lines.map((line) => {
    const trimmed = line.trim();
    const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/);
    if (!bulletMatch) return line;

    const item = bulletMatch[1].trim();
    // If already rich (starts with **), only normalize bullet marker to '*'.
    if (item.startsWith('**')) {
      return line.replace(/^\s*[-*]\s+/, (m) => m.replace('-', '*'));
    }

    // Convert "Key: value" into Editorial List style "* **Key:** value".
    const kv = item.match(/^([^:]{2,48}):\s+(.+)$/);
    if (kv) {
      const key = kv[1].trim();
      const value = kv[2].trim();
      // Avoid converting if key already contains heavy markdown.
      if (!/[`*_\[\]]/.test(key)) {
        const prefix = line.match(/^\s*/)?.[0] ?? '';
        return `${prefix}* **${key}:** ${value}`;
      }
    }

    // Otherwise, keep item as-is but normalize bullet marker to '*'.
    return line.replace(/^\s*[-*]\s+/, (m) => m.replace('-', '*'));
  });
}

function shouldMergeParagraphs(current: string, next: string): boolean {
  if (!current || !next) return false;
  const trimmed = current.trim();
  if (trimmed.startsWith('**') && trimmed.endsWith('**')) return false;
  if (isMetaLine(trimmed)) return false;
  const wordCount = trimmed.split(/\s+/).length;
  const endsSentence = /[.!?:;"'\)\]]$/.test(trimmed);
  if (wordCount <= 4) return true;
  if (!endsSentence && trimmed.length <= 80) return true;
  return false;
}

const HEADING_CONTINUATION_STOPWORDS = new Set([
  // Spanish
  'y',
  'e',
  'o',
  'de',
  'del',
  'la',
  'el',
  'los',
  'las',
  'a',
  'en',
  'para',
  // English
  'and',
  'or',
  'of',
  'to',
  'in',
  'for',
  'with',
  'on',
]);

function shouldMergeHeadingContinuation(headingText: string): boolean {
  const t = headingText.trim();
  if (!t) return false;
  if (/[—–\-:]$/.test(t)) return true;

  const quoteCount = (t.match(/"/g) || []).length;
  if (quoteCount % 2 === 1) return true;

  const words = t.toLowerCase().split(/\s+/).filter(Boolean);
  const last = words[words.length - 1] || '';
  return HEADING_CONTINUATION_STOPWORDS.has(last);
}

function isLikelyHeadingContinuationLine(line: string): boolean {
  const t = line.trim();
  if (!t) return false;
  if (t.length > 80) return false;
  const wordCount = t.split(/\s+/).filter(Boolean).length;
  if (wordCount > 12) return false;
  if (/[.!?]$/.test(t)) return false;
  return true;
}

function unwrapSoftLineBreaks(markdown: string): string {
  const lines = normalizeNewlines(markdown).split('\n');
  const tokens: Array<{ type: 'paragraph' | 'structural' | 'blank'; value: string }> = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (/^#{1,6}\s*/.test(trimmed)) {
      const match = trimmed.match(/^(#{1,6}\s+)/);
      const prefix = match ? match[1] : '# ';
      let headingText = trimmed.slice(prefix.length).trim();
      headingText = headingText.replace(/^#{1,6}\s+/, '');

      let j = i + 1;
      let merges = 0;
      while (j < lines.length && merges < 3 && shouldMergeHeadingContinuation(headingText)) {
        const next = lines[j].trim();
        if (!next) break;
        if (next.startsWith('```') || next.startsWith(':::')) break;
        if (isStructuralLine(next)) break;
        if (!isLikelyHeadingContinuationLine(next)) break;
        headingText = collapseWhitespace(`${headingText} ${next}`);
        merges += 1;
        j += 1;
      }

      tokens.push({ type: 'structural', value: `${prefix}${headingText}`.trimEnd() });
      i = j - 1;
      continue;
    }

    if (trimmed.startsWith('```')) {
      const blockLines = [line];
      i++;
      while (i < lines.length) {
        blockLines.push(lines[i]);
        if (lines[i].trim().startsWith('```')) {
          break;
        }
        i++;
      }
      tokens.push({ type: 'structural', value: blockLines.join('\n') });
      continue;
    }

    if (trimmed.startsWith(':::')) {
      const blockLines = [line];
      i++;
      while (i < lines.length) {
        blockLines.push(lines[i]);
        if (lines[i].trim().startsWith(':::')) {
          break;
        }
        i++;
      }
      tokens.push({ type: 'structural', value: blockLines.join('\n') });
      continue;
    }

    if (!trimmed) {
      tokens.push({ type: 'blank', value: '' });
      continue;
    }

    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].replace(/^>\s?/, '').trim());
        i++;
      }
      i--;
      const quoteText = collapseWhitespace(quoteLines.join(' '));
      tokens.push({ type: 'structural', value: `> ${quoteText}` });
      continue;
    }

    if (isStructuralLine(trimmed)) {
      tokens.push({ type: 'structural', value: line });
      continue;
    }

    const paragraphLines = [trimmed];
    while (i + 1 < lines.length) {
      const next = lines[i + 1].trim();
      if (!next) break;
      if (next.startsWith('```') || next.startsWith(':::') || next.startsWith('>') || isStructuralLine(next)) break;
      paragraphLines.push(next);
      i++;
    }
    tokens.push({ type: 'paragraph', value: collapseWhitespace(paragraphLines.join(' ')) });
  }

  const output: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.type === 'paragraph') {
      let merged = token.value;
      while (
        i + 2 < tokens.length &&
        tokens[i + 1].type === 'blank' &&
        tokens[i + 2].type === 'paragraph' &&
        shouldMergeParagraphs(merged, tokens[i + 2].value)
      ) {
        merged = collapseWhitespace(`${merged} ${tokens[i + 2].value}`);
        i += 2;
      }
      output.push(merged);
    } else if (token.type === 'blank') {
      if (output.length > 0 && output[output.length - 1] !== '') {
        output.push('');
      }
    } else {
      output.push(token.value);
    }
  }

  return output.join('\n');
}

function removeDanglingQuoteHeadings(markdown: string): string {
  const lines = normalizeNewlines(markdown).split('\n');
  const out: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (/^#{1,6}\s+/.test(trimmed) && trimmed.includes('"')) {
      const quoteCount = (trimmed.match(/"/g) || []).length;
      if (quoteCount % 2 === 1) {
        let j = i + 1;
        while (j < lines.length && !lines[j].trim()) {
          j += 1;
        }
        if (j < lines.length && lines[j].trim().startsWith('|')) {
          continue;
        }
      }
    }
    out.push(line);
  }

  return out.join('\n');
}

const KNOWN_HEADING_PREFIXES = [
  'Introducción y Contexto',
  'Conceptos Fundamentales',
  'Teoría y Principios Principales',
  'Inmersión Profunda Avanzada',
  'Aplicaciones Reales y Casos de Estudio',
  'Guía Práctica de Implementación',
  'Casos Límite, Limitaciones y Consideraciones Avanzadas',
  'Síntesis y Conclusión',
  'Síntesis y Práctica Autónoma',
  'Síntesis y Práctica Autonoma',
  'Synthesis and Conclusions',
  'Synthesis and Autonomous Practice',
  'Introduction and Context',
  'Foundational Concepts',
  'Core Theory and Principles',
  'Advanced Deep Dive',
  'Real-World Applications and Case Studies',
  'Practical Implementation Guide',
  'Edge Cases, Limitations and Advanced Considerations',
];

function normalizeInlineLists(markdown: string): string {
  const lines = normalizeNewlines(markdown).split('\n');
  const out: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      out.push(line);
      continue;
    }

    if (isStructuralLine(trimmed)) {
      out.push(line);
      continue;
    }

    const numberedMatches = [...line.matchAll(/(\d+)\.\s*/g)];
    if (numberedMatches.length >= 2 && !/^\s*\d+\.\s/.test(line)) {
      const firstIndex = numberedMatches[0]?.index ?? 0;
      const pre = line.slice(0, firstIndex).trim();
      const items: string[] = [];

      for (let i = 0; i < numberedMatches.length; i++) {
        const match = numberedMatches[i];
        const number = match[1];
        const start = (match.index ?? 0) + match[0].length;
        const end = i + 1 < numberedMatches.length ? (numberedMatches[i + 1].index ?? line.length) : line.length;
        const text = line.slice(start, end).trim();
        if (text) items.push(`${number}. ${text}`);
      }

      if (items.length >= 2) {
        if (pre) {
          out.push(pre);
          out.push('');
        }
        out.push(...items);
        continue;
      }
    }

    const bulletMatches = [...line.matchAll(/\*\s+/g)];
    if (bulletMatches.length >= 2 && !/^\s*[*-]\s+/.test(line)) {
      const firstIndex = bulletMatches[0]?.index ?? 0;
      const pre = line.slice(0, firstIndex).trim();
      const items = line
        .slice(firstIndex)
        .split(/\*\s+/)
        .map((part) => part.trim())
        .filter(Boolean);

      if (items.length >= 2) {
        if (pre) {
          out.push(pre);
          out.push('');
        }
        out.push(...items.map((item) => `* ${item}`));
        continue;
      }
    }

    out.push(line);
  }

  return out.join('\n');
}

function splitRunOnKnownHeadings(markdown: string): string {
  const lines = normalizeNewlines(markdown).split('\n');
  const out: string[] = [];

  const prefixes = KNOWN_HEADING_PREFIXES.map((prefix) => ({
    raw: prefix,
    lower: prefix.toLowerCase(),
  }));

  for (const line of lines) {
    const trimmed = line.trim();
    const headingMatch = trimmed.match(/^(#{2,6})\s+(.+)$/);
    if (!headingMatch) {
      out.push(line);
      continue;
    }

    const prefix = headingMatch[1];
    const rest = headingMatch[2].trim();
    const restLower = rest.toLowerCase();
    let matched = false;

    for (const entry of prefixes) {
      if (!restLower.startsWith(entry.lower)) continue;
      const remainder = rest.slice(entry.raw.length).trim();
      if (remainder) {
        const cleanedRemainder = remainder.replace(/^[:\-]\s*/, '');
        out.push(`${prefix} ${entry.raw}`);
        if (cleanedRemainder) {
          out.push(cleanedRemainder);
        }
        matched = true;
        break;
      }
    }

    if (!matched) {
      out.push(line);
    }
  }

  return out.join('\n');
}

/**
 * Deterministic, non-LLM normalization to make legacy/new markdown more compatible
 * with the THOTNET editorial spec in both normal and book views.
 *
 * This is intentionally conservative: it focuses on structural consistency
 * (hook + separator + editorial list formatting) and avoids inventing content.
 */
export function normalizeEditorialMarkdown(markdown: string, options: NormalizeEditorialOptions = {}): string {
  const input = normalizeNewlines(String(markdown ?? '')).replace(/^\uFEFF/, '');
  const cleaned = stripPromptArtifacts(input);
  const separatorsFixed = normalizeSeparatorLines(cleaned);
  const listsCleaned = removeEmptyListMarkers(separatorsFixed);
  const sidebarFixed = fixSidebarTableArtifacts(listsCleaned);
  const unwrapped = unwrapSoftLineBreaks(sidebarFixed);
  const danglingQuotesFixed = removeDanglingQuoteHeadings(unwrapped);
  const headingsSplit = splitRunOnKnownHeadings(danglingQuotesFixed);
  const inlineListsFixed = normalizeInlineLists(headingsSplit);
  const lines = inlineListsFixed.split('\n');

  const hooked = ensureHookStructure([...lines], options);
  const listed = normalizeEditorialListSyntax(hooked);

  // Trim excessive trailing whitespace but preserve a single ending newline when present.
  const joined = listed.join('\n').replace(/[ \t]+$/gm, '');
  return joined.trim() ? `${joined.trim()}\n` : '';
}
