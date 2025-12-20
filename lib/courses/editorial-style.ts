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
  const hasStandfirst = preSeparator.some((line) => {
    const t = line.trim();
    if (t.startsWith('**') && t.endsWith('**')) return true;
    // Editorial spec: lead paragraph inside a blockquote (not a pull quote).
    if (t.startsWith('>') && !t.startsWith('> ##')) return true;
    return false;
  });

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

function canonicalizeBoilerplateText(raw: string): string {
  let t = String(raw ?? '').trim();
  t = t.replace(/^>\s*/, '').trim();

  // One-cell table rows look like `| content |`.
  if (t.startsWith('|') && t.endsWith('|')) {
    t = t.slice(1, -1).trim();
  }

  // Remove surrounding emphasis markers.
  t = t.replace(/^\*{1,2}/, '').replace(/\*{1,2}$/, '').trim();

  // Normalize common typography (quotes/dashes) to stabilize boilerplate matching.
  t = t.replace(/[“”«»„]/g, '"').replace(/[‘’]/g, "'").replace(/[–—]/g, '-');

  return collapseWhitespace(t);
}

function isBoilerplateHeroLead(text: string): boolean {
  const t = canonicalizeBoilerplateText(text).toLowerCase();
  return (
    /^este módulo convierte un tema (difuso|confuso) en un modelo mental claro(?: y accionable)?\.?$/.test(t) ||
    /^this module turns a fuzzy topic into a clear(?:,)? usable mental model\.?$/.test(t)
  );
}

function isBoilerplateStandfirst(text: string): boolean {
  const t = canonicalizeBoilerplateText(text).toLowerCase();
  return (
    /^un módulo (directo|rápido|rapido) y estructurado sobre .+/.test(t) ||
    /^a (fast|direct),? structured module on .+/.test(t)
  );
}

function isBoilerplateAttribution(text: string): boolean {
  const t = canonicalizeBoilerplateText(text).toLowerCase();
  return (
    /^[—-]\s*idea ancla (?:del|para este) módulo\.?\"?$/.test(t) ||
    /^[—-]\s*short attribution\.?$/.test(t) ||
    /^[—-]\s*atribuci[oó]n breve\.?$/.test(t)
  );
}

function isBoilerplateTechInsight(text: string): boolean {
  const t = canonicalizeBoilerplateText(text).toLowerCase();
  return (
    /^una definición operativa hace(?: que)? un concepto (?:sea )?comprobable: qué es, qué (?:observas|se observa) y qué lo (?:refutaría|falsearía)\.?$/.test(
      t
    )
  );
}

function isBoilerplateKeyConcept(title: string, body: string, payload?: string): boolean {
  const t = canonicalizeBoilerplateText(title).toLowerCase();
  const b = canonicalizeBoilerplateText(body).toLowerCase();
  const p = canonicalizeBoilerplateText(payload ?? '').toLowerCase();

  const combined = `${t} ${b} ${p}`;

  const hasClaimVsEvidence =
    /(distinci[oó]n clave|key insight|punto clave)/i.test(t) &&
    /(afirmaci[oó]n|claim|assertion)\s*(?:≠|!=|not equal)\s*(evidencia|evidence)/i.test(combined);

  if (hasClaimVsEvidence) return true;

  const hasPatternTemplate =
    /(patr[oó]n|pattern)/i.test(t) &&
    /(definici[oó]n|definition)\s*(?:→|->)\s*observables?\s*(?:→|->)\s*(contraejemplos|counterexamples)/i.test(
      combined
    );

  return hasPatternTemplate;
}

function stripBoilerplateKeyConceptCallouts(markdown: string): string {
  const lines = normalizeNewlines(markdown).split('\n');
  const out: string[] = [];
  let inFence = false;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i] ?? '';
    const trimmed = rawLine.trim();

    if (trimmed.startsWith('```')) {
      inFence = !inFence;
      out.push(rawLine);
      continue;
    }

    if (inFence) {
      out.push(rawLine);
      continue;
    }

    const openMatch = trimmed.match(/^:::\s*keyconcept\s*\[(.+?)\]\s*$/i);
    if (!openMatch) {
      out.push(rawLine);
      continue;
    }

    const title = (openMatch[1] ?? '').trim();
    const bodyLines: string[] = [];
    let j = i + 1;
    while (j < lines.length) {
      const candidate = lines[j] ?? '';
      if (candidate.trim() === ':::') break;
      bodyLines.push(candidate);
      j += 1;
    }

    if (j >= lines.length) {
      // Unclosed block; keep as-is.
      out.push(rawLine);
      out.push(...bodyLines);
      i = j - 1;
      continue;
    }

    const body = bodyLines.join('\n').trim();
    if (isBoilerplateKeyConcept(title, body)) {
      // Drop the entire block, including the closing fence.
      i = j;
      continue;
    }

    out.push(rawLine, ...bodyLines, lines[j] ?? ':::');
    i = j;
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n');
}

function stripEditorialBoilerplate(markdown: string): string {
  const lines = normalizeNewlines(markdown).split('\n');
  const separatorIndex = lines.findIndex((l) => /^---+$/.test(l.trim()));

  const preSeparator = separatorIndex >= 0 ? lines.slice(0, separatorIndex) : lines;
  const postSeparator = separatorIndex >= 0 ? lines.slice(separatorIndex) : [];

  const out: string[] = [];

  const stripInlineAttribution = (rawLine: string): string => {
    let next = rawLine;

    // Remove the most common prompt boilerplate even if it gets glued into other lines.
    // Keep this targeted to phrases we never want to show to readers.
    const boilerplatePatterns: RegExp[] = [
      /\beste m(?:ó|o)dulo convierte un tema (?:difuso|confuso) en un modelo mental claro(?: y accionable)?\.?/gi,
      /\bthis module turns a fuzzy topic into a clear(?:,)? usable mental model\.?/gi,
      /\bun m(?:ó|o)dulo (?:directo|r(?:á|a)pido|rapido) y estructurado sobre[^.\n]{6,200}\.?/gi,
      /\ba (?:fast|direct),?\s*structured module on[^.\n]{6,200}\.?/gi,
    ];

    for (const pattern of boilerplatePatterns) {
      next = next.replace(pattern, ' ');
    }

    // Remove inline placeholder attributions that sometimes get glued to the quote line.
    // Examples:
    // - `— Idea ancla del módulo`
    // - `-- Short attribution`
    // Keep this conservative: only target known placeholder phrases.
    const patterns: RegExp[] = [
      /(?:\s*[—–-]{1,2}\s*idea ancla (?:del|para este) m(?:ó|o)dulo\.?\s*)/gi,
      /(?:\s*[—–-]{1,2}\s*short attribution\.?\s*)/gi,
      /(?:\s*[—–-]{1,2}\s*atribuci[oó]n breve\.?\s*)/gi,
    ];

    for (const pattern of patterns) {
      next = next.replace(pattern, ' ');
    }

    // Clean up extra whitespace without aggressively altering markdown punctuation.
    next = next.replace(/[ \t]{2,}/g, ' ').trimEnd();

    // If we removed everything inside an attribution fragment (e.g. "> *— Idea ancla...*"),
    // drop the now-empty line to avoid rendering stray markers like "* *".
    const probe = next.replace(/^\s*>\s*/, '').replace(/[*_`"']/g, '').trim();
    if (!probe) return '';

    return next;
  };

  for (const line of preSeparator) {
    const canonical = canonicalizeBoilerplateText(line);
    if (isBoilerplateHeroLead(canonical)) continue;
    if (isBoilerplateStandfirst(canonical)) continue;
    out.push(line);
  }

  for (let i = 0; i < postSeparator.length; i++) {
    const line = stripInlineAttribution(postSeparator[i]);
    const trimmed = line.trim();

    // Remove boilerplate TECH INSIGHT / PERSPECTIVA TÉCNICA tables (one-cell).
    if (
      trimmed.startsWith('|') &&
      /(TECH INSIGHT|PERSPECTIVA TÉCNICA|PERSPECTIVA TECNICA)/i.test(trimmed) &&
      i + 2 < postSeparator.length
    ) {
      const separator = postSeparator[i + 1]?.trim() ?? '';
      const body = postSeparator[i + 2]?.trim() ?? '';
      const isOneCellSeparator = separator === '| :--- |' || /^\|\s*:?-{3,}\s*\|\s*$/.test(separator);

      if (isOneCellSeparator && body.startsWith('|')) {
        const bodyText = canonicalizeBoilerplateText(body);
        if (isBoilerplateTechInsight(bodyText)) {
          i += 2;
          continue;
        }
      }
    }

    const canonical = canonicalizeBoilerplateText(trimmed);
    if (isBoilerplateHeroLead(canonical)) continue;
    if (isBoilerplateStandfirst(canonical)) continue;
    if (isBoilerplateAttribution(canonical)) continue;

    out.push(line);
  }

  // Avoid excessive blank space when we removed boilerplate lines/blocks.
  return out.join('\n').replace(/\n{3,}/g, '\n\n');
}

function stripBoilerplateBlockquoteCallouts(markdown: string): string {
  const lines = normalizeNewlines(markdown).split('\n');
  const out: string[] = [];
  let inFence = false;

  const normalizeForMatch = (input: string): string =>
    canonicalizeBoilerplateText(input)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i] ?? '';
    const trimmed = rawLine.trim();

    if (trimmed.startsWith('```')) {
      inFence = !inFence;
      out.push(rawLine);
      continue;
    }

    if (inFence) {
      out.push(rawLine);
      continue;
    }

    if (!trimmed.startsWith('>')) {
      out.push(rawLine);
      continue;
    }

    // Gather contiguous blockquote block.
    const blockLines: string[] = [rawLine];
    let j = i + 1;
    while (j < lines.length && (lines[j] ?? '').trim().startsWith('>')) {
      blockLines.push(lines[j] ?? '');
      j += 1;
    }

    const blockText = blockLines
      .map((l) => l.replace(/^\s*>\s?/, ''))
      .join('\n')
      .trim();

    const firstNonEmpty = blockLines
      .map((l) => l.replace(/^\s*>\s?/, '').trim())
      .find((l) => Boolean(l)) ?? '';
    const title = firstNonEmpty.replace(/^#{1,6}\s*/, '').trim();

    const titleNorm = normalizeForMatch(title);
    const bodyNorm = normalizeForMatch(blockText);

    const isTemplateTitle = /^(distincion clave|punto clave|key insight|patron|pattern)\b/i.test(titleNorm);
    const isTemplateBody =
      /(afirmacion|claim|assertion)\s*(?:≠|!=)\s*(evidencia|evidence)/i.test(bodyNorm) ||
      /(definicion|definition)\s*(?:→|->)\s*observables?/i.test(bodyNorm) ||
      /(contraejemplos|counterexamples)/i.test(bodyNorm) ||
      /(incertidumbre|uncertainty)/i.test(bodyNorm);

    if (isTemplateTitle && isTemplateBody) {
      // Drop entire blockquote callout.
      i = j - 1;
      continue;
    }

    out.push(...blockLines);
    i = j - 1;
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n');
}

function splitInlineMarkdownHeadings(markdown: string): string {
  const lines = normalizeNewlines(markdown).split('\n');
  const out: string[] = [];
  let inFence = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('```')) {
      inFence = !inFence;
      out.push(line);
      continue;
    }

    if (inFence) {
      out.push(line);
      continue;
    }

    // Some generators accidentally emit multiple headings on one line:
    // `# Module 1 ... ## Introduction and Context ...`
    // Split those into separate lines so downstream logic can parse them.
    if (/^#{1,6}\s*\S/.test(trimmed) && /\s#{2,6}\s*\S/.test(line)) {
      const split = line.replace(/\s(#{2,6}\s*)/g, '\n\n$1');
      out.push(...split.split('\n'));
      continue;
    }

    out.push(line);
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n');
}

function splitInlineBlockquoteSegments(markdown: string): string {
  const lines = normalizeNewlines(markdown).split('\n');
  const out: string[] = [];
  let inFence = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('```')) {
      inFence = !inFence;
      out.push(line);
      continue;
    }

    if (inFence) {
      out.push(line);
      continue;
    }

    // Some generators glue multiple blockquote lines together:
    // `> ## "Quote..." > *Attribution*`
    // Split them so later stages can remove boilerplate attributions cleanly.
    if (/^\s*>/.test(trimmed) && /\s+>\s*(?=[*#])/.test(line)) {
      const split = line.replace(/\s+>\s*(?=[*#])/g, '\n> ');
      out.push(...split.split('\n'));
      continue;
    }

    out.push(line);
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n');
}

function repairBrokenCompoundHeadings(markdown: string): string {
  const lines = normalizeNewlines(markdown).split('\n');
  const out: string[] = [];
  let inFence = false;

  const fixCollapsedConjunctions = (text: string): string => {
    // Fix missing spaces in headings like "Síntesis yConclusiones" / "Synthesis andConclusions".
    return text
      .replace(/\b(y|and)(?=(conclusi[oó]n(?:es)?|conclusions?))/gi, '$1 ')
      .replace(/\b(y)(?=(pr[aá]ctica|aut[oó]noma))/gi, '$1 ')
      .replace(/\b(and)(?=(autonomous))/gi, '$1 ');
  };

  const isNonStructural = (raw: string): boolean => {
    const t = raw.trim();
    return Boolean(t) && !isStructuralLine(t);
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i] ?? '';
    const trimmed = rawLine.trim();

    if (trimmed.startsWith('```')) {
      inFence = !inFence;
      out.push(rawLine);
      continue;
    }

    if (inFence) {
      out.push(rawLine);
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s*(.+?)\s*$/);
    if (!headingMatch) {
      out.push(rawLine);
      continue;
    }

    const hashPrefix = headingMatch[1] ?? '##';
    const headingOriginal = (headingMatch[2] ?? '').trim();
    const headingText = collapseWhitespace(fixCollapsedConjunctions(headingOriginal));
    const lower = headingText.toLowerCase();
    const reconstructedHeading = `${hashPrefix} ${headingText}`.trimEnd();

    const nextNonEmpty = (startIndex: number): { index: number; line: string } => {
      let j = startIndex;
      while (j < lines.length && !(lines[j] ?? '').trim()) {
        j += 1;
      }
      return { index: j, line: lines[j] ?? '' };
    };

    // Fix: "## Síntesis yConclusiones" / "## Síntesis y Conclusiones" -> canonical heading.
    if (/^s[ií]ntesis y\s*conclusi[oó]n(?:es)?$/i.test(headingText)) {
      out.push(`${hashPrefix} Síntesis y Conclusión`);
      continue;
    }

    // Fix: "## Synthesis andConclusions" -> canonical heading.
    if (/^synthesis and\s*conclusions?$/i.test(headingText)) {
      out.push(`${hashPrefix} Synthesis and Conclusions`);
      continue;
    }

    // Fix: run-on "## BordeCasos, limitaciones y consideraciones avanzadas ..." -> canonical heading + paragraph.
    if (
      /^borde\s*casos\b[,:\-]?\s*limitaciones\s*y\s*consideraciones\s*avanzadas\b/i.test(headingText)
    ) {
      const remainder = headingText
        .replace(
          /^borde\s*casos\b[,:\-]?\s*limitaciones\s*y\s*consideraciones\s*avanzadas\b[,:\-]?\s*/i,
          '',
        )
        .trim();

      out.push(`${hashPrefix} Casos Límite, Limitaciones y Consideraciones Avanzadas`);
      if (remainder) out.push(remainder);
      continue;
    }

    // Fix: "## Borde" + next line "Casos, limitaciones y consideraciones avanzadas ..." -> canonical heading.
    if (lower === 'borde') {
      const next = nextNonEmpty(i + 1);
      const nextLine = next.line;
      const nextTrim = nextLine.trim();

      if (isNonStructural(nextLine) && /^casos\b/i.test(nextTrim)) {
        out.push(`${hashPrefix} Casos Límite, Limitaciones y Consideraciones Avanzadas`);
        let rewritten = nextLine.replace(/^(\s*)casos\b[,:\-]?\s*/i, '$1');
        rewritten = rewritten.replace(
          /^(\s*)limitaciones\s*y\s*consideraciones\s*avanzadas\b[,:\-]?\s*/i,
          '$1',
        );
        if (rewritten.trim()) out.push(rewritten);
        i = next.index;
        continue;
      }
    }

    // Fix: "## Introduction and" + next line "Context ..." -> "## Introduction and Context"
    if (lower === 'introduction and') {
      const next = nextNonEmpty(i + 1);
      const nextLine = next.line;
      const nextTrim = nextLine.trim();
      if (isNonStructural(nextLine) && /^context\b/i.test(nextTrim)) {
        out.push(`${hashPrefix} Introduction and Context`);
        const rewritten = nextLine.replace(/^(\s*)context\b[:\-]?\s*/i, '$1');
        if (rewritten.trim()) {
          out.push(rewritten);
        }
        i = next.index;
        continue;
      }
    }

    // Fix: "## Introducción y" + next line "Contexto ..." -> "## Introducción y Contexto"
    if (lower === 'introducción y' || lower === 'introduccion y') {
      const next = nextNonEmpty(i + 1);
      const nextLine = next.line;
      const nextTrim = nextLine.trim();
      if (isNonStructural(nextLine) && /^contexto\b/i.test(nextTrim)) {
        out.push(`${hashPrefix} Introducción y Contexto`);
        const rewritten = nextLine.replace(/^(\s*)contexto\b[:\-]?\s*/i, '$1');
        if (rewritten.trim()) {
          out.push(rewritten);
        }
        i = next.index;
        continue;
      }
    }

    // Fix: "## Síntesis y" + next line "Conclusión ..." (rare)
    if (lower === 'síntesis y' || lower === 'sintesis y') {
      const next = nextNonEmpty(i + 1);
      const nextLine = next.line;
      const nextTrim = nextLine.trim();
      if (isNonStructural(nextLine) && /^conclusi[oó]n(?:es)?\b/i.test(nextTrim)) {
        out.push(`${hashPrefix} Síntesis y Conclusión`);
        const rewritten = nextLine.replace(/^(\s*)conclusi[oó]n(?:es)?\b[:\-]?\s*/i, '$1');
        if (rewritten.trim()) {
          out.push(rewritten);
        }
        i = next.index;
        continue;
      }
    }

    // Fix: "## Fundacional" + next line "Conceptos ..." -> "## Conceptos Fundamentales"
    if (lower === 'fundacional') {
      out.push(`${hashPrefix} Conceptos Fundamentales`);
      const next = nextNonEmpty(i + 1);
      const nextLine = next.line;
      const nextTrim = nextLine.trim();
      if (isNonStructural(nextLine) && /^conceptos?\b/i.test(nextTrim)) {
        const rewritten = nextLine.replace(/^(\s*)conceptos?\b[:\-]?\s*/i, '$1');
        if (rewritten.trim()) {
          out.push(rewritten);
        }
        i = next.index;
      }
      continue;
    }

    // Fix: "## Núcleo" + next line "Teoría y principios ..." -> "## Teoría y Principios Principales"
    if (lower === 'núcleo' || lower === 'nucleo') {
      out.push(`${hashPrefix} Teoría y Principios Principales`);
      const next = nextNonEmpty(i + 1);
      const nextLine = next.line;
      const nextTrim = nextLine.trim();
      if (isNonStructural(nextLine) && /^(teoría y principios|teoria y principios)\b/i.test(nextTrim)) {
        const rewritten = nextLine.replace(/^(\s*)(teoría y principios|teoria y principios)\b[:\-]?\s*/i, '$1');
        if (rewritten.trim()) {
          out.push(rewritten);
        }
        i = next.index;
      }
      continue;
    }

    // Fix: "## Avanzado" + next line "Análisis profundo ..." -> "## Inmersión Profunda Avanzada"
    if (lower === 'avanzado') {
      out.push(`${hashPrefix} Inmersión Profunda Avanzada`);
      const next = nextNonEmpty(i + 1);
      const nextLine = next.line;
      const nextTrim = nextLine.trim();
      if (isNonStructural(nextLine) && /^análisis profundo\b/i.test(nextTrim)) {
        const rewritten = nextLine.replace(/^(\s*)análisis profundo\b[:\-]?\s*/i, '$1');
        if (rewritten.trim()) {
          out.push(rewritten);
        }
        i = next.index;
      }
      continue;
    }

    // Fix: "## Práctico" + next line "Guía de implementación ..." -> "## Guía Práctica de Implementación"
    if (lower === 'práctico' || lower === 'practico') {
      out.push(`${hashPrefix} Guía Práctica de Implementación`);
      const next = nextNonEmpty(i + 1);
      const nextLine = next.line;
      const nextTrim = nextLine.trim();
      if (isNonStructural(nextLine) && /^guía de implementación\b/i.test(nextTrim)) {
        const rewritten = nextLine.replace(/^(\s*)guía de implementación\b[:\-]?\s*/i, '$1');
        if (rewritten.trim()) {
          out.push(rewritten);
        }
        i = next.index;
      }
      continue;
    }

    // Fix: "## Synthesis and" + next line "Conclusions ..." -> "## Synthesis and Conclusions"
    if (lower === 'synthesis and') {
      const next = nextNonEmpty(i + 1);
      const nextLine = next.line;
      const nextTrim = nextLine.trim();
      if (isNonStructural(nextLine) && /^(conclusion|conclusions)\b/i.test(nextTrim)) {
        out.push(`${hashPrefix} Synthesis and Conclusions`);
        const rewritten = nextLine.replace(/^(\s*)(conclusion|conclusions)\b[:\-]?\s*/i, '$1');
        if (rewritten.trim()) {
          out.push(rewritten);
        }
        i = next.index;
        continue;
      }
    }

    // Fix: "## Foundational" + next line "Concepts ..." -> "## Foundational Concepts"
    if (lower === 'foundational') {
      const next = nextNonEmpty(i + 1);
      const nextLine = next.line;
      const nextTrim = nextLine.trim();
      if (isNonStructural(nextLine) && /^concepts\b/i.test(nextTrim)) {
        out.push(`${hashPrefix} Foundational Concepts`);
        const rewritten = nextLine.replace(/^(\s*)concepts\b[:\-]?\s*/i, '$1');
        if (rewritten.trim()) {
          out.push(rewritten);
        }
        i = next.index;
        continue;
      }
    }

    // Fix: "## Core" + next line "Theory and Principles ..." -> "## Core Theory and Principles"
    if (lower === 'core') {
      const next = nextNonEmpty(i + 1);
      const nextLine = next.line;
      const nextTrim = nextLine.trim();
      if (isNonStructural(nextLine) && /^theory and principles\b/i.test(nextTrim)) {
        out.push(`${hashPrefix} Core Theory and Principles`);
        const rewritten = nextLine.replace(/^(\s*)theory and principles\b[:\-]?\s*/i, '$1');
        if (rewritten.trim()) {
          out.push(rewritten);
        }
        i = next.index;
        continue;
      }
    }

    // Fix: "## Advanced" + next line "Deep Dive ..." -> "## Advanced Deep Dive"
    if (lower === 'advanced') {
      const next = nextNonEmpty(i + 1);
      const nextLine = next.line;
      const nextTrim = nextLine.trim();
      if (isNonStructural(nextLine) && /^deep dive\b/i.test(nextTrim)) {
        out.push(`${hashPrefix} Advanced Deep Dive`);
        const rewritten = nextLine.replace(/^(\s*)deep dive\b[:\-]?\s*/i, '$1');
        if (rewritten.trim()) {
          out.push(rewritten);
        }
        i = next.index;
        continue;
      }
    }

    // Fix: "## Practical" + next line "Implementation Guide ..." -> "## Practical Implementation Guide"
    if (lower === 'practical') {
      const next = nextNonEmpty(i + 1);
      const nextLine = next.line;
      const nextTrim = nextLine.trim();
      if (isNonStructural(nextLine) && /^implementation guide\b/i.test(nextTrim)) {
        out.push(`${hashPrefix} Practical Implementation Guide`);
        const rewritten = nextLine.replace(/^(\s*)implementation guide\b[:\-]?\s*/i, '$1');
        if (rewritten.trim()) {
          out.push(rewritten);
        }
        i = next.index;
        continue;
      }
    }

    // Fix: "## Edge" + next line "Cases, ..." -> full heading.
    if (lower === 'edge') {
      const next = nextNonEmpty(i + 1);
      const nextLine = next.line;
      const nextTrim = nextLine.trim();
      if (isNonStructural(nextLine) && /^cases\b/i.test(nextTrim)) {
        out.push(`${hashPrefix} Edge Cases, Limitations and Advanced Considerations`);
        let rewritten = nextLine.replace(/^(\s*)cases\b[,:\-]?\s*/i, '$1');
        rewritten = rewritten.replace(
          /^(\s*)limitations\b[,:\-]?\s*(?:and\s*)?advanced considerations\b[,:\-]?\s*/i,
          '$1',
        );
        if (rewritten.trim()) {
          out.push(rewritten);
        }
        i = next.index;
        continue;
      }
    }

    // Fix: already-canonical edge heading, but paragraph repeats "Limitations, and Advanced Considerations ..."
    if (/^edge cases\b/i.test(headingText) && /advanced considerations\b/i.test(headingText)) {
      const next = nextNonEmpty(i + 1);
      const nextLine = next.line;
      const nextTrim = nextLine.trim();
      if (isNonStructural(nextLine) && /^limitations\b/i.test(nextTrim)) {
        const rewritten = nextLine.replace(
          /^(\s*)limitations\b[,:\-]?\s*(?:and\s*)?advanced considerations\b[,:\-]?\s*/i,
          '$1',
        );
        out.push(reconstructedHeading);
        if (rewritten.trim()) out.push(rewritten);
        i = next.index;
        continue;
      }
    }

    // Fix: "## Real" + "- World" + next line "Applications and Case Studies ..." -> merge into full heading.
    if (lower === 'real') {
      const next = nextNonEmpty(i + 1);
      const nextLine = next.line;
      const nextTrim = nextLine.trim();
      const worldMatch = nextTrim.match(/^(?:[-*]\s+)?(world|mundo)\b/i);
      if (worldMatch) {
        const after = nextNonEmpty(next.index + 1);
        const afterWorldLine = after.line;
        const afterWorldTrim = afterWorldLine.trim();

        if (isNonStructural(afterWorldLine) && /^applications and case studies\b/i.test(afterWorldTrim)) {
          out.push(`${hashPrefix} Real-World Applications and Case Studies`);
          const rewritten = afterWorldLine.replace(/^(\s*)applications and case studies\b[:\-]?\s*/i, '$1');
          if (rewritten.trim()) out.push(rewritten);
          i = after.index;
          continue;
        }

        if (
          isNonStructural(afterWorldLine) &&
          /^aplicaciones\b/i.test(afterWorldTrim) &&
          /(?:casos?\s+de\s+estudio|estudios?\s+de\s+casos)/i.test(afterWorldTrim)
        ) {
          out.push(`${hashPrefix} Aplicaciones Reales y Casos de Estudio`);
          const rewritten = afterWorldLine.replace(
            /^(\s*)aplicaciones(?:\s+reales)?\s+y\s+(?:casos?\s+de\s+estudio|estudios?\s+de\s+casos)(?:\b|(?=[A-ZÁÉÍÓÚÑ]))[:\-]?\s*/i,
            '$1',
          );
          if (rewritten.trim()) out.push(rewritten);
          i = after.index;
          continue;
        }
      }
    }

    out.push(headingText === headingOriginal ? rawLine : reconstructedHeading);
  }

  return out.join('\n');
}

function normalizeInlineInsightMarkers(markdown: string, locale: 'en' | 'es' | undefined): string {
  const lines = normalizeNewlines(markdown).split('\n');
  const out: string[] = [];
  let inFence = false;

  const defaultTitle = locale === 'es' ? 'Punto clave' : 'Key insight';

  const stripMetaParentheticals = (input: string): string => {
    const s = String(input ?? '');
    return s
      .replace(/\(([^)]*)\)/g, (full, inner) => {
        const t = String(inner ?? '').toLowerCase();
        if (/(incertidumbre|uncertainty|explicit|sigue|follow)/i.test(t)) return '';
        return full;
      })
      .replace(/\s{2,}/g, ' ')
      .trim();
  };

  const normalizeForMatch = (input: string): string =>
    stripMetaParentheticals(input)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

  const humanizeInsight = (title: string, body: string): string => {
    const t = normalizeForMatch(title);
    const b = normalizeForMatch(body);
    const combined = `${t} ${b}`.trim();

    if (/(distincion clave|key insight|punto clave)/i.test(combined) && /(afirmacion|claim|assertion)/i.test(combined) && /(evidencia|evidence)/i.test(combined)) {
      return locale === 'es'
        ? 'Una afirmación no es evidencia. Indica qué observarías para respaldarla y qué la refutaría.'
        : 'A claim is not evidence. State what you would observe to support it and what would falsify it.';
    }

    if (/(patron|pattern)/i.test(combined) && /(definicion|definition)/i.test(combined) && /(observables?)/i.test(combined) && /(contraejemplos|counterexamples)/i.test(combined)) {
      return locale === 'es'
        ? 'Sigue este patrón: define el concepto, lista señales observables y añade contraejemplos.'
        : 'Use this pattern: define the concept, list observable signals, and add counterexamples.';
    }

    return stripMetaParentheticals(body);
  };

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();

    if (trimmed.startsWith('```')) {
      inFence = !inFence;
      out.push(rawLine);
      continue;
    }

    if (inFence) {
      out.push(rawLine);
      continue;
    }

    // Accept both plain lines and headings like:
    // - "💡 INSIGHT >> ..."
    // - "### 💡 INSIGHT > > ..."
    const match = trimmed.match(/^(?:#{1,6}\s*)?(?:[^a-z0-9]*\s*)?insights?\s*(?:>>|>\s*>|»{1,2}|:|-)\s*(.+)$/i);
    if (!match) {
      out.push(rawLine);
      continue;
    }

    const payload = match[1]?.trim() ?? '';
    if (!payload) {
      out.push(rawLine);
      continue;
    }

    const [head, ...tail] = payload.split(':');
    const title = (head ?? '').trim();
    const body = tail.join(':').trim();

    const calloutTitle = title || defaultTitle;
    const calloutBody = body || payload;

    // Some legacy content leaks prompt boilerplate as "INSIGHT" lines. Drop it entirely.
    if (isBoilerplateKeyConcept(calloutTitle, calloutBody, payload)) {
      continue;
    }

    if (out.length && out[out.length - 1]?.trim()) out.push('');

    // Rewrite as a natural inline note instead of a callout box to avoid "prompt-y" UI artifacts.
    const cleanTitle = stripMetaParentheticals(calloutTitle);
    const cleanBody = humanizeInsight(cleanTitle, calloutBody);

    if (cleanTitle && cleanBody) {
      out.push(`**${cleanTitle}:** ${cleanBody}`);
      out.push('');
      continue;
    }

    if (cleanBody) {
      out.push(cleanBody);
      out.push('');
    }
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n');
}

function fixCommonTranslationTypos(markdown: string, locale: 'en' | 'es' | undefined): string {
  if (locale !== 'es') return markdown;

  // Keep this deterministic and conservative: only fix known, high-confidence mistakes.
  return markdown.replace(/\bchallengente\b/gi, 'desafiante');
}

function getFirstNonEmptyLineIndex(lines: string[]): number {
  return lines.findIndex((l) => l.trim().length > 0);
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
    return [`# ${safeTitle}`, '---', ''];
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
  let idx2 = getFirstNonEmptyLineIndex(lines);

  // Some legacy content starts directly with a section heading as H1 (e.g. "# Introduction and Context").
  // Demote that heading and inject the real module title so the reader sees a proper chapter title.
  if (idx2 >= 0 && typeof options.title === 'string' && options.title.trim().length > 0) {
    const firstLine = lines[idx2]?.trim() ?? '';
    const firstText = firstLine.replace(/^#\s+/, '').trim();
    const desiredTitle = options.title.trim();

    const isH1 = firstLine.startsWith('# ');
    const isSameAsTitle = firstText.toLowerCase() === desiredTitle.toLowerCase();
    const isKnownSectionHeading = KNOWN_HEADING_PREFIXES.some(
      (prefix) => prefix.toLowerCase() === firstText.toLowerCase()
    );

    if (isH1 && isKnownSectionHeading && !isSameAsTitle) {
      lines[idx2] = `## ${firstText}`;
      lines.splice(idx2, 0, `# ${desiredTitle}`, '');
      idx2 = getFirstNonEmptyLineIndex(lines);
    }
  }

  const afterTitle = idx2 >= 0 ? lines.slice(idx2 + 1) : lines;

  // Hero format uses a meta line + (optional) lead paragraph in a blockquote.
  const hero = hasHeroHeaderBlock(afterTitle);

  // Only inject a standfirst when we already have a real, non-boilerplate one
  // (never synthesize generic template copy).
  if (!hero && !hasBoldStandfirst(afterTitle)) {
    const standfirstRaw = typeof options.standfirst === 'string' ? options.standfirst.trim() : '';
    const isCandidate = Boolean(standfirstRaw) && !isBoilerplateStandfirst(standfirstRaw) && !isBoilerplateHeroLead(standfirstRaw);

    if (isCandidate) {
      const standfirst = standfirstRaw.startsWith('**') && standfirstRaw.endsWith('**')
        ? standfirstRaw
        : `**${standfirstRaw}**`;

      // Insert standfirst immediately after H1.
      const insertAt = (idx2 >= 0 ? idx2 + 1 : 0);
      // Keep one blank line between title and standfirst.
      if (lines[insertAt]?.trim().length) {
        lines.splice(insertAt, 0, '');
      }
      lines.splice(insertAt + 1, 0, standfirst, '');
    }
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

    if (/^\s*>/.test(line)) {
      const quoteRawLines: string[] = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) {
        quoteRawLines.push(lines[i]);
        i++;
      }
      i--;

      const innerLines = quoteRawLines.map((l) => l.replace(/^\s*>\s?/, ''));
      const isStructuredQuote = innerLines.some((inner) => isStructuralLine(inner.trim()));

      // Simple blockquote: collapse single-word line breaks into one readable sentence.
      if (!isStructuredQuote) {
        const quoteText = collapseWhitespace(innerLines.join(' '));
        tokens.push({ type: 'structural', value: `> ${quoteText}` });
        continue;
      }

      // Structured blockquote (Insight Cards / Pull Quotes):
      // preserve line structure but unwrap soft breaks inside paragraph runs.
      const outQuoteLines: string[] = [];
      let paragraphBuffer: string[] = [];

      const flushParagraph = () => {
        if (!paragraphBuffer.length) return;
        const merged = collapseWhitespace(paragraphBuffer.join(' '));
        if (merged) outQuoteLines.push(`> ${merged}`);
        paragraphBuffer = [];
      };

      for (const inner of innerLines) {
        const t = inner.trim();
        if (!t) {
          // Remove empty quote lines that break downstream parsers and don't carry meaning.
          flushParagraph();
          continue;
        }

        if (t.startsWith('```') || t.startsWith(':::') || isStructuralLine(t)) {
          flushParagraph();
          outQuoteLines.push(`> ${t}`);
          continue;
        }

        paragraphBuffer.push(t);
      }

      flushParagraph();
      tokens.push({ type: 'structural', value: outQuoteLines.join('\n') });
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

function normalizePullQuoteHeadings(markdown: string): string {
  const lines = normalizeNewlines(markdown).split('\n');
  const out: string[] = [];
  let lastPullQuote: string | null = null;

  const countQuoteMarks = (text: string): number => (text.match(/["“”]/g) || []).length;

  const normalizeQuoteText = (text: string): string => {
    let t = collapseWhitespace(text).replace(/[“”]/g, '"');
    if (!t) return '';
    if (!t.startsWith('"')) t = `"${t}`;
    if (!t.endsWith('"')) t = `${t}"`;
    return t;
  };

  const isAttribution = (inner: string): boolean => /^\*?[-—]\s+/.test(inner.trim());

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i]?.trim() ?? '';
    const headingMatch = trimmed.match(/^(#{2,6})\s+(.+)$/);
    const remainder = headingMatch?.[2]?.trim() ?? '';

    // Legacy artifact: pull quotes emitted as headings that begin with a quote mark.
    if (!headingMatch || !/^[\"“]/.test(remainder)) {
      out.push(lines[i]);
      continue;
    }

    const parts: string[] = [remainder];
    let quoteCount = countQuoteMarks(remainder);
    let j = i + 1;
    let abortIndex: number | null = null;

    while (j < lines.length) {
      const candidate = lines[j]?.trim() ?? '';
      if (!candidate) {
        j += 1;
        continue;
      }

      // Stop early if we hit a structural boundary before closing the quote.
      if (quoteCount % 2 === 1 && isStructuralLine(candidate)) {
        abortIndex = j;
        break;
      }

      parts.push(candidate);
      quoteCount += countQuoteMarks(candidate);

      if (quoteCount > 0 && quoteCount % 2 === 0) {
        break;
      }

      j += 1;
    }

    // If we never closed the quote, drop the broken block and resume at the boundary.
    if (abortIndex !== null || quoteCount % 2 === 1 || quoteCount === 0) {
      i = (abortIndex ?? j) - 1;
      continue;
    }

    const normalizedQuote = normalizeQuoteText(parts.join(' '));
    if (!normalizedQuote) {
      i = j;
      continue;
    }

    // Consume attribution lines (if present) so they don't float independently.
    let k = j + 1;
    while (k < lines.length && !lines[k]?.trim()) k += 1;

    const attributionLines: string[] = [];
    while (k < lines.length) {
      const candidate = lines[k]?.trim() ?? '';
      if (!candidate.startsWith('>')) break;
      const inner = candidate.replace(/^>\s*/, '').trim();
      if (!inner) {
        k += 1;
        continue;
      }
      if (!isAttribution(inner)) break;
      attributionLines.push(`> ${inner}`);
      k += 1;
    }

    // De-dupe consecutive identical pull quotes (common generation failure).
    if (normalizedQuote !== lastPullQuote) {
      out.push(`> ## ${normalizedQuote}`);
      out.push(...attributionLines);
      lastPullQuote = normalizedQuote;
    }

    i = k - 1;
  }

  return out.join('\n');
}

const KNOWN_HEADING_PREFIXES = [
  'Introducción y Contexto',
  'Introduccion y Contexto',
  'Conceptos Fundamentales',
  'Teoría y Principios Principales',
  'Teoria y Principios Principales',
  'Inmersión Profunda Avanzada',
  'Inmersion Profunda Avanzada',
  'Aplicaciones Reales y Casos de Estudio',
  'Guía Práctica de Implementación',
  'Guia Práctica de Implementación',
  'Guía Práctica de Implementacion',
  'Guia Práctica de Implementacion',
  'Casos Límite, Limitaciones y Consideraciones Avanzadas',
  'Casos Limite, Limitaciones y Consideraciones Avanzadas',
  'Síntesis y Conclusión',
  'Sintesis y Conclusión',
  'Síntesis y Conclusion',
  'Sintesis y Conclusion',
  'Síntesis y Práctica Autónoma',
  'Sintesis y Práctica Autónoma',
  'Síntesis y Práctica Autonoma',
  'Sintesis y Práctica Autonoma',
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
    const headingMatch = trimmed.match(/^(#{1,6})\s*(.+)$/);
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
  const inlineHeadingsSplit = splitInlineMarkdownHeadings(sidebarFixed);
  const blockquotesSplit = splitInlineBlockquoteSegments(inlineHeadingsSplit);
  const unwrapped = unwrapSoftLineBreaks(blockquotesSplit);
  const boilerplateStripped = stripEditorialBoilerplate(unwrapped);
  const boilerplateCalloutsStripped = stripBoilerplateBlockquoteCallouts(boilerplateStripped);
  const insightsFixed = normalizeInlineInsightMarkers(boilerplateCalloutsStripped, options.locale);
  const insightsCalloutsStripped = stripBoilerplateKeyConceptCallouts(insightsFixed);
  const typosFixed = fixCommonTranslationTypos(insightsCalloutsStripped, options.locale);
  const pullQuotesFixed = normalizePullQuoteHeadings(typosFixed);
  const danglingQuotesFixed = removeDanglingQuoteHeadings(pullQuotesFixed);
  const compoundHeadingsRepaired = repairBrokenCompoundHeadings(danglingQuotesFixed);
  const headingsSplit = splitRunOnKnownHeadings(compoundHeadingsRepaired);
  const inlineListsFixed = normalizeInlineLists(headingsSplit);
  const lines = inlineListsFixed.split('\n');

  const hooked = ensureHookStructure([...lines], options);
  const listed = normalizeEditorialListSyntax(hooked);

  // Trim excessive trailing whitespace but preserve a single ending newline when present.
  const joined = listed.join('\n').replace(/[ \t]+$/gm, '');
  return joined.trim() ? `${joined.trim()}\n` : '';
}
