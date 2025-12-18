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
  const lines = cleaned.split('\n');

  const hooked = ensureHookStructure([...lines], options);
  const listed = normalizeEditorialListSyntax(hooked);

  // Trim excessive trailing whitespace but preserve a single ending newline when present.
  const joined = listed.join('\n').replace(/[ \t]+$/gm, '');
  return joined.trim() ? `${joined.trim()}\n` : '';
}
