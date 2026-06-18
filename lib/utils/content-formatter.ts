/**
 * Content formatting utilities for article display
 */

/**
 * Remove common UI patterns and noise from scraped content
 * Cleans up button text, navigation elements, and other non-content text
 */
export function stripUnwantedSectionHeadings(text: string): string {
  if (!text) return '';

  // These headings come from internal editorial templates and should never be shown to users.
  // Key commonality: markdown headings with an outline number (e.g. "## 4. Implicaciones Futuras").
  // We remove those numbered headings regardless of the title text.
  const numberedHeadingPatterns: RegExp[] = [
    // Markdown headings with Arabic numerals: ## 4. Something
    /^\s*#{1,6}\s*\(?\s*\d{1,3}\s*\)?\s*[\.)\-:]\s*.+$/gim,
    // Markdown headings with Roman numerals: ## IV. Something
    /^\s*#{1,6}\s*\(?\s*[IVXLCM]{1,8}\s*\)?\s*[\.)\-:]\s*.+$/gim,
  ];

  const patterns: RegExp[] = [
    ...numberedHeadingPatterns,
  ];

  let cleaned = text;
  for (const pattern of patterns) {
    cleaned = cleaned.replace(pattern, '');
  }

  return cleaned;
}

export function sanitizeScrapedContent(text: string): string {
  if (!text) return '';
  
  // Common UI patterns to remove (case-insensitive)
  const uiPatterns = [
    /Save\s+Story\s*/gi,                    // "Save Story" buttons
    /Save\s+this\s+story\s*/gi,            // "Save this story" 
    /Share\s+this\s+article\s*/gi,         // "Share this article"
    /Read\s+more\s*/gi,                     // "Read more" links
    /Continue\s+reading\s*/gi,              // "Continue reading"
    /Click\s+here\s*/gi,                    // "Click here"
    /Subscribe\s+now\s*/gi,                 // "Subscribe now"
    /Sign\s+up\s*/gi,                       // "Sign up"
    /Log\s+in\s*/gi,                        // "Log in"
    /Advertisement\s*/gi,                   // "Advertisement"
    /Sponsored\s+content\s*/gi,             // "Sponsored content"
    /\[.*?\]/g,                             // Bracketed annotations like [ad]
    /©\s*\d{4}\s+.+$/gm,                   // Copyright notices
    /Follow\s+us\s+on\s+.+$/gim,           // Social media prompts
    /\s*La entrada\s+.{0,260}?\s+(?:se\s+)?public[oó]\s+primero\s+en\s+.+$/gis,
    /\s*El post\s+.{0,260}?\s+(?:se\s+)?public[oó]\s+primero\s+en\s+.+$/gis,
    /\s*The post\s+.{0,260}?\s+(?:appeared|was published)\s+(?:first\s+)?on\s+.+$/gis,
    /\s*The entry\s+.{0,260}?\s+(?:appeared|was published)\s+(?:first\s+)?on\s+.+$/gis,
  ];
  
  let cleaned = text;

  // Strip internal editorial template headings that sometimes leak into stored summaries/contents.
  cleaned = stripUnwantedSectionHeadings(cleaned);
  cleaned = cleaned
    .replace(/\barxiv:\d{4}\.\d{4,5}(?:v\d+)?\s*(?:abstract|resumen)?\s*:?\s*/gi, '')
    .replace(/^\s*(?:abstract|resumen)\s*:\s*/i, '');
  
  // Apply all patterns
  for (const pattern of uiPatterns) {
    cleaned = cleaned.replace(pattern, '');
  }
  
  // Remove excessive whitespace left by removals
  cleaned = cleaned
    .replace(/\n{3,}/g, '\n\n')             // Max 2 consecutive newlines
    .replace(/[ \t]{2,}/g, ' ')             // Max 1 space
    .replace(/^[ \t]+/gm, '')               // Trim line starts without removing paragraph breaks
    .trim();
  
  return cleaned;
}

type NewsMarkdownOptions = {
  minParagraphChars?: number;
  maxParagraphChars?: number;
  maxSentencesPerParagraph?: number;
};

export type NewsContentFormattingReport = {
  paragraphCount: number;
  maxParagraphChars: number;
  wordCount: number;
  hasEnoughParagraphs: boolean;
  hasOversizedParagraph: boolean;
  hasSourceBoilerplate: boolean;
  reasons: string[];
};

const SOURCE_BOILERPLATE_PATTERNS: RegExp[] = [
  /\bLa entrada\b.{0,260}\bpublic[oó]\s+primero\s+en\b/i,
  /\bEl post\b.{0,260}\bpublic[oó]\s+primero\s+en\b/i,
  /\bThe post\b.{0,260}\b(?:appeared|was published)\s+(?:first\s+)?on\b/i,
  /\bThe entry\b.{0,260}\b(?:appeared|was published)\s+(?:first\s+)?on\b/i,
  /\b(read more|continue reading|leer m[aá]s|continuar leyendo)\b/i,
  /\b(cookie policy|privacy policy|pol[ií]tica de cookies|pol[ií]tica de privacidad)\b/i,
  /\b(sign up|subscribe|newsletter|suscr[ií]bete|bolet[ií]n)\b/i,
  /\b(share this article|copy link|compartir este art[ií]culo|copiar enlace)\b/i,
  /\b(advertisement|sponsored content|publicidad|contenido patrocinado)\b/i,
];

const SOURCE_BOILERPLATE_LINE_PATTERNS: RegExp[] = [
  /^\s*(read more|continue reading|leer m[aá]s|continuar leyendo)\b.*$/i,
  /^\s*(sign up|subscribe|newsletter|suscr[ií]bete|bolet[ií]n)\b.*$/i,
  /^\s*(share|copy link|compartir|copiar enlace)\b.*$/i,
  /^\s*(advertisement|sponsored content|publicidad|contenido patrocinado)\s*$/i,
  /^\s*(related stories|more stories|contenido relacionado|noticias relacionadas)\b.*$/i,
];

const SENTENCE_ABBREVIATIONS = new Set([
  'mr.',
  'mrs.',
  'ms.',
  'dr.',
  'dra.',
  'prof.',
  'sr.',
  'sra.',
  'jr.',
  'inc.',
  'ltd.',
  'corp.',
  'co.',
  'vs.',
  'etc.',
  'e.g.',
  'i.e.',
  'p.ej.',
]);

function stripHtmlForMarkdown(text: string): string {
  return text
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\s*\/\s*(p|div|section|article|h[1-6]|blockquote)\s*>/gi, '\n\n')
    .replace(/<\s*li[^>]*>/gi, '- ')
    .replace(/<\s*\/\s*li\s*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');
}

function removeSourceBoilerplate(text: string): string {
  let cleaned = text
    .replace(/\[\s*(?:…|\.{3})\s*\]/g, ' ')
    .replace(/\s*La entrada\s+.{0,260}?\s+(?:se\s+)?public[oó]\s+primero\s+en\s+.+$/gis, '')
    .replace(/\s*El post\s+.{0,260}?\s+(?:se\s+)?public[oó]\s+primero\s+en\s+.+$/gis, '')
    .replace(/\s*The post\s+.{0,260}?\s+(?:appeared|was published)\s+(?:first\s+)?on\s+.+$/gis, '')
    .replace(/\s*The entry\s+.{0,260}?\s+(?:appeared|was published)\s+(?:first\s+)?on\s+.+$/gis, '');

  cleaned = cleaned
    .split('\n')
    .filter((line) => !SOURCE_BOILERPLATE_LINE_PATTERNS.some((pattern) => pattern.test(line.trim())))
    .join('\n');

  return cleaned;
}

function normalizeMarkdownWhitespace(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizeTextForParagraphs(raw: string): string {
  const htmlFlattened = /<[^>]+>/.test(raw) ? stripHtmlForMarkdown(raw) : raw;
  return normalizeMarkdownWhitespace(removeSourceBoilerplate(sanitizeScrapedContent(htmlFlattened)));
}

function lastWordLower(text: string): string {
  return (text.trim().split(/\s+/).pop() ?? '').toLowerCase();
}

function isSentenceBoundary(buffer: string, char: string, nextChar: string | undefined): boolean {
  if (!'.!?'.includes(char)) return false;
  if (char === '.' && SENTENCE_ABBREVIATIONS.has(lastWordLower(buffer))) return false;
  if (!nextChar) return true;
  return /\s/.test(nextChar);
}

function splitIntoSentences(text: string): string[] {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return [];

  const sentences: string[] = [];
  let current = '';

  for (let i = 0; i < normalized.length; i += 1) {
    const char = normalized[i];
    const nextChar = normalized[i + 1];
    current += char;

    if (!isSentenceBoundary(current, char, nextChar)) continue;

    let lookahead = i + 1;
    while (lookahead < normalized.length && /\s/.test(normalized[lookahead])) {
      lookahead += 1;
    }

    if (
      lookahead >= normalized.length ||
      /["'“”‘’«»¿¡(]?[A-ZÁÉÍÓÚÜÑ0-9]/.test(normalized.slice(lookahead, lookahead + 2))
    ) {
      const sentence = current.trim();
      if (sentence) sentences.push(sentence);
      current = '';
      i = lookahead - 1;
    }
  }

  const tail = current.trim();
  if (tail) sentences.push(tail);
  return sentences;
}

function groupSentencesIntoParagraphs(
  sentences: string[],
  options: Required<NewsMarkdownOptions>,
): string[] {
  const paragraphs: string[] = [];
  let buffer: string[] = [];
  let bufferChars = 0;

  const flush = () => {
    const paragraph = buffer.join(' ').replace(/\s+/g, ' ').trim();
    if (paragraph) paragraphs.push(paragraph);
    buffer = [];
    bufferChars = 0;
  };

  for (const sentence of sentences) {
    buffer.push(sentence);
    bufferChars += sentence.length;

    const shouldFlush =
      buffer.length >= options.maxSentencesPerParagraph ||
      bufferChars >= options.maxParagraphChars ||
      (buffer.length >= 2 && bufferChars >= options.minParagraphChars && /[!?]$/.test(sentence));

    if (shouldFlush) flush();
  }

  if (buffer.length > 0) flush();
  return paragraphs;
}

function splitOversizedParagraph(paragraph: string, options: Required<NewsMarkdownOptions>): string[] {
  const clean = paragraph.replace(/\s+/g, ' ').trim();
  if (clean.length <= options.maxParagraphChars) return [clean];

  const sentences = splitIntoSentences(clean);
  if (sentences.length <= 1) {
    const chunks: string[] = [];
    for (let i = 0; i < clean.length; i += options.maxParagraphChars) {
      chunks.push(clean.slice(i, i + options.maxParagraphChars).trim());
    }
    return chunks.filter(Boolean);
  }

  return groupSentencesIntoParagraphs(sentences, options);
}

function splitInitialBlocks(cleaned: string): string[] {
  const blankSeparated = cleaned
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (blankSeparated.length > 1) return blankSeparated;

  return cleaned
    .split(/\n+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function normalizeNewsArticleMarkdown(
  text: string,
  options: NewsMarkdownOptions = {},
): string {
  if (!text) return '';

  const resolvedOptions: Required<NewsMarkdownOptions> = {
    minParagraphChars: options.minParagraphChars ?? 280,
    maxParagraphChars: options.maxParagraphChars ?? 760,
    maxSentencesPerParagraph: options.maxSentencesPerParagraph ?? 3,
  };

  const cleaned = normalizeTextForParagraphs(text);
  if (!cleaned) return '';

  const paragraphs: string[] = [];
  for (const block of splitInitialBlocks(cleaned)) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    if (/^#{1,6}\s+\S/.test(trimmed) || /^[-*]\s+\S/.test(trimmed) || /^\d+[.)]\s+\S/.test(trimmed)) {
      paragraphs.push(trimmed);
      continue;
    }

    paragraphs.push(...splitOversizedParagraph(trimmed, resolvedOptions));
  }

  return paragraphs
    .map((paragraph) => paragraph.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n\n');
}

export function assessNewsArticleFormatting(
  text: string,
  options: NewsMarkdownOptions = {},
): NewsContentFormattingReport {
  const resolvedOptions: Required<NewsMarkdownOptions> = {
    minParagraphChars: options.minParagraphChars ?? 280,
    maxParagraphChars: options.maxParagraphChars ?? 900,
    maxSentencesPerParagraph: options.maxSentencesPerParagraph ?? 3,
  };

  const cleaned = normalizeTextForParagraphs(text);
  const paragraphs = cleaned
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const maxParagraphChars = paragraphs.reduce((max, paragraph) => Math.max(max, paragraph.length), 0);
  const wordCount = cleaned ? cleaned.split(/\s+/).length : 0;
  const hasSourceBoilerplate = SOURCE_BOILERPLATE_PATTERNS.some((pattern) => pattern.test(text));
  const hasEnoughParagraphs = wordCount < 350 || paragraphs.length >= 3;
  const hasOversizedParagraph = maxParagraphChars > resolvedOptions.maxParagraphChars;

  const reasons: string[] = [];
  if (!hasEnoughParagraphs) reasons.push(`too_few_paragraphs:${paragraphs.length}`);
  if (hasOversizedParagraph) reasons.push(`oversized_paragraph:${maxParagraphChars}`);
  if (hasSourceBoilerplate) reasons.push('source_boilerplate');

  return {
    paragraphCount: paragraphs.length,
    maxParagraphChars,
    wordCount,
    hasEnoughParagraphs,
    hasOversizedParagraph,
    hasSourceBoilerplate,
    reasons,
  };
}

/**
 * Calculate reading time in minutes based on word count
 * Average reading speed: 200-250 words per minute
 */
export function calculateReadingTime(text: string): number {
  if (!text) return 1;
  
  const wordsPerMinute = 225;
  const wordCount = text.trim().split(/\s+/).length;
  const minutes = Math.ceil(wordCount / wordsPerMinute);
  
  return Math.max(1, minutes); // Minimum 1 minute
}

/**
 * Format article content with proper paragraphs and structure
 * Handles various text formats and adds HTML structure
 */
export function formatArticleContent(content: string): string {
  if (!content) return '';
  
  // First, sanitize the content to remove UI patterns
  const cleaned = sanitizeScrapedContent(content);
  
  // Remove excessive whitespace and normalize line breaks
  const formatted = cleaned.trim()
    .replace(/\r\n/g, '\n')  // Normalize line endings
    .replace(/\n{3,}/g, '\n\n')  // Max 2 consecutive line breaks
    .replace(/[ \t]+/g, ' ');  // Normalize spaces
  
  // Split into paragraphs (separated by double line breaks)
  const paragraphs = formatted.split(/\n\n+/);
  
  // Wrap each paragraph in <p> tags with proper styling
  const formattedParagraphs = paragraphs.map(para => {
    para = para.trim();
    if (!para) return '';
    
    // Check if it's a heading (starts with #, ##, etc.)
    if (/^#{1,6}\s/.test(para)) {
      const level = para.match(/^(#{1,6})/)?.[1].length || 2;
      const text = para.replace(/^#{1,6}\s*/, '');
      return `<h${level} class="text-${4 - level}xl font-bold mt-8 mb-4 text-foreground">${text}</h${level}>`;
    }
    
    // Check if it's a list item
    if (/^[-*]\s/.test(para)) {
      const items = para.split('\n').filter(line => line.trim());
      const listItems = items.map(item => {
        const text = item.replace(/^[-*]\s*/, '');
        return `<li class="ml-6 mb-2">${text}</li>`;
      }).join('\n');
      return `<ul class="list-disc mb-6">\n${listItems}\n</ul>`;
    }
    
    // Check if it's a numbered list
    if (/^\d+\.\s/.test(para)) {
      const items = para.split('\n').filter(line => line.trim());
      const listItems = items.map(item => {
        const text = item.replace(/^\d+\.\s*/, '');
        return `<li class="ml-6 mb-2">${text}</li>`;
      }).join('\n');
      return `<ol class="list-decimal mb-6">\n${listItems}\n</ol>`;
    }
    
    // Check if it's a quote (starts with >)
    if (/^>\s/.test(para)) {
      const text = para.replace(/^>\s*/, '');
      return `<blockquote class="border-l-4 border-primary pl-4 italic my-6 text-muted-foreground">${text}</blockquote>`;
    }
    
    // Regular paragraph with proper spacing and indentation
    return `<p class="mb-6 leading-relaxed text-base md:text-lg text-foreground/90 first-letter:text-2xl first-letter:font-bold first-letter:text-primary">${para}</p>`;
  }).filter(p => p); // Remove empty paragraphs
  
  return formattedParagraphs.join('\n');
}

/**
 * Extract plain text from HTML content
 */
export function extractPlainText(html: string): string {
  if (!html) return '';
  
  return html
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ') // Replace &nbsp;
    .replace(/&amp;/g, '&') // Replace &amp;
    .replace(/&lt;/g, '<') // Replace &lt;
    .replace(/&gt;/g, '>') // Replace &gt;
    .replace(/&quot;/g, '"') // Replace &quot;
    .replace(/&#39;/g, "'") // Replace &#39;
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Smart truncate text preserving word boundaries
 */
export function smartTruncate(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;
  
  const truncated = text.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace > 0) {
    return truncated.substring(0, lastSpace) + '...';
  }
  
  return truncated + '...';
}

/**
 * Format content with proper line breaks (simpler version for plain text)
 */
export function formatPlainText(text: string): string {
  if (!text) return '';
  
  return text
    .trim()
    .split(/\n+/)
    .map(para => para.trim())
    .filter(para => para)
    .join('\n\n');
}
