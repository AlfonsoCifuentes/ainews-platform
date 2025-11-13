/**
 * Text Formatter Utility - Enhanced for Maximum Readability
 * Automatically formats article content with:
 * - Intelligent paragraph detection and splitting
 * - Automatic list detection (numbered and bulleted)
 * - Quote block detection
 * - Proper spacing and typography
 * - Drop cap for first paragraph
 * - Preserves markdown formatting
 */

/**
 * Cleans content by removing navigation elements, metadata, and redundant info
 */
function cleanArticleContent(content: string): string {
  // Remove common navigation/metadata patterns
  let cleaned = content;
  
  // Remove "Inicio", "Tecnología", navigation breadcrumbs
  cleaned = cleaned.replace(/^(Inicio|Home|Technology|Tecnología|News|Noticias|Category|Categoría)[^\n.]*/gmi, '');
  
  // Remove "ChatGPT DD de mes de YYYY" timestamps
  cleaned = cleaned.replace(/ChatGPT\s+\d{1,2}\s+de\s+\w+\s+de\s+\d{4}/gi, '');
  
  // Remove social media sharing links
  cleaned = cleaned.replace(/(Share|Compartir|Cuota)\s*(Twitter|Facebook|Pinterest|WhatsApp|LinkedIn|Telegram|Copy URL)*/gi, '');
  
  // Remove "Copy URL" and similar
  cleaned = cleaned.replace(/Copy\s*(URL|Link)/gi, '');
  
  // Remove device/category tags at start
  cleaned = cleaned.replace(/^Dispositivos con (IA|AI)[^\n.]*/gmi, '');
  
  // Remove URLs at start of paragraphs
  cleaned = cleaned.replace(/^https?:\/\/[^\s]+/gmi, '');
  
  // Clean up orphaned punctuation at start
  cleaned = cleaned.replace(/^\s*[.,;:!?]+\s*/gm, '');
  
  // Remove repeated words (common in scraping errors)
  cleaned = cleaned.replace(/\b(\w+)\s+\1\b/gi, '$1');
  
  // Clean up multiple spaces and normalize
  cleaned = cleaned
    .replace(/\s{3,}/g, ' ')
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();
  
  return cleaned;
}

/**
 * Formats raw article content into readable HTML
 * @param content - Raw content string (may include HTML or plain text)
 * @returns Formatted HTML string with proper paragraphs and styling
 */
export function formatArticleContent(content: string): string {
  if (!content) return '';

  // Clean content first
  let formatted = cleanArticleContent(content);

  // Remove excessive whitespace and normalize line breaks
  formatted = formatted
    .trim()
    .replace(/\r\n/g, '\n') // Normalize Windows line breaks
    .replace(/\n{3,}/g, '\n\n'); // Max 2 consecutive line breaks

  // If content already has HTML tags, clean and improve
  if (/<[^>]+>/.test(formatted)) {
    // Extract text from HTML, clean it, then re-format
    const textOnly = formatted.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (textOnly.length < 100) return formatted; // Too short, keep as is
    
    // Clean the text and re-format
    const cleanedText = cleanArticleContent(textOnly);
    formatted = cleanedText;
  }

  // Detect and convert lists before paragraph splitting
  formatted = detectAndFormatLists(formatted);

  // Detect and convert blockquotes
  formatted = detectAndFormatQuotes(formatted);

  // Split plain text into paragraphs intelligently
  const paragraphs = smartSplitIntoParagraphs(formatted);
  
  // Format each paragraph, with special treatment for the first one
  return paragraphs
    .map((p, index) => {
      // Skip if already formatted as list or quote
      if (p.startsWith('<ul>') || p.startsWith('<ol>') || p.startsWith('<blockquote>')) {
        return p;
      }
      
      // First paragraph gets drop-cap style
      if (index === 0) {
        return `<p class="first-paragraph mb-6 text-lg leading-relaxed">${formatParagraph(p)}</p>`;
      }
      
      return `<p class="mb-5 leading-[1.8] text-base text-gray-200">${formatParagraph(p)}</p>`;
    })
    .join('\n');
}

/**
 * Improves existing HTML formatting (not currently used but kept for potential future use)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function improveHtmlFormatting(html: string): string {
  return html
    // Ensure paragraphs have proper spacing
    .replace(/<p>/g, '<p class="mb-5 leading-[1.8] text-gray-200">')
    // Style headings with better hierarchy
    .replace(/<h1>/g, '<h1 class="text-4xl font-bold mt-10 mb-5 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">')
    .replace(/<h2>/g, '<h2 class="text-3xl font-bold mt-8 mb-4 text-white">')
    .replace(/<h3>/g, '<h3 class="text-2xl font-semibold mt-6 mb-3 text-gray-100">')
    .replace(/<h4>/g, '<h4 class="text-xl font-semibold mt-4 mb-2 text-gray-200">')
    // Style lists with better spacing
    .replace(/<ul>/g, '<ul class="list-disc list-outside space-y-3 mb-6 ml-6 text-gray-200">')
    .replace(/<ol>/g, '<ol class="list-decimal list-outside space-y-3 mb-6 ml-6 text-gray-200">')
    .replace(/<li>/g, '<li class="leading-[1.8] pl-2">')
    // Style blockquotes with border and background
    .replace(/<blockquote>/g, '<blockquote class="border-l-4 border-blue-500 bg-blue-500/10 pl-6 pr-4 py-4 italic my-6 text-gray-300 rounded-r-lg">')
    // Style code blocks
    .replace(/<pre>/g, '<pre class="bg-black/60 border border-white/10 rounded-xl p-6 overflow-x-auto mb-6 text-sm">')
    .replace(/<code>/g, '<code class="font-mono text-blue-300">')
    // Style links
    .replace(/<a /g, '<a class="text-blue-400 hover:text-blue-300 underline underline-offset-4 transition-colors" ');
}

/**
 * Detects and formats lists from plain text patterns
 */
function detectAndFormatLists(text: string): string {
  const lines = text.split('\n');
  const result: string[] = [];
  let inList = false;
  let listType: 'ul' | 'ol' | null = null;
  let listItems: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Detect bullet points: - item, • item, * item
    const bulletMatch = line.match(/^[-•*]\s+(.+)$/);
    
    // Detect numbered items: 1. item, 1) item
    const numberedMatch = line.match(/^\d+[.)]\s+(.+)$/);
    
    if (bulletMatch) {
      if (!inList || listType !== 'ul') {
        // Close previous list if needed
        if (inList && listItems.length > 0) {
          result.push(formatListBlock(listItems, listType!));
          listItems = [];
        }
        inList = true;
        listType = 'ul';
      }
      listItems.push(bulletMatch[1]);
    } else if (numberedMatch) {
      if (!inList || listType !== 'ol') {
        // Close previous list if needed
        if (inList && listItems.length > 0) {
          result.push(formatListBlock(listItems, listType!));
          listItems = [];
        }
        inList = true;
        listType = 'ol';
      }
      listItems.push(numberedMatch[1]);
    } else {
      // Not a list item
      if (inList && listItems.length > 0) {
        result.push(formatListBlock(listItems, listType!));
        listItems = [];
        inList = false;
        listType = null;
      }
      if (line) {
        result.push(line);
      }
    }
  }

  // Close any remaining list
  if (inList && listItems.length > 0) {
    result.push(formatListBlock(listItems, listType!));
  }

  return result.join('\n\n');
}

/**
 * Formats a list block
 */
function formatListBlock(items: string[], type: 'ul' | 'ol'): string {
  const tag = type;
  const itemsHtml = items
    .map(item => `<li class="leading-[1.8] pl-2">${formatParagraph(item)}</li>`)
    .join('\n');
  
  const className = type === 'ul' 
    ? 'list-disc list-outside space-y-3 mb-6 ml-6 text-gray-200'
    : 'list-decimal list-outside space-y-3 mb-6 ml-6 text-gray-200';
  
  return `<${tag} class="${className}">\n${itemsHtml}\n</${tag}>`;
}

/**
 * Detects and formats blockquotes from plain text patterns
 */
function detectAndFormatQuotes(text: string): string {
  const lines = text.split('\n');
  const result: string[] = [];
  let inQuote = false;
  let quoteLines: string[] = [];

  for (const line of lines) {
    // Detect quote: > text or "text" at start
    const quoteMatch = line.trim().match(/^>\s+(.+)$/);
    
    if (quoteMatch) {
      inQuote = true;
      quoteLines.push(quoteMatch[1]);
    } else {
      // Check for quote end
      if (inQuote && quoteLines.length > 0) {
        result.push(formatQuoteBlock(quoteLines.join(' ')));
        quoteLines = [];
        inQuote = false;
      }
      if (line.trim()) {
        result.push(line);
      }
    }
  }

  // Close any remaining quote
  if (inQuote && quoteLines.length > 0) {
    result.push(formatQuoteBlock(quoteLines.join(' ')));
  }

  return result.join('\n\n');
}

/**
 * Formats a quote block
 */
function formatQuoteBlock(text: string): string {
  return `<blockquote class="border-l-4 border-blue-500 bg-blue-500/10 pl-6 pr-4 py-4 italic my-6 text-gray-300 rounded-r-lg">${formatParagraph(text)}</blockquote>`;
}

/**
 * Intelligently splits plain text into paragraphs
 * Uses sentence boundary detection + intelligent grouping
 */
function smartSplitIntoParagraphs(text: string): string[] {
  // First, check if text already has line breaks (preserve them as paragraph boundaries)
  if (text.includes('\n')) {
    const parts = text.split(/\n\n+/);
    const result: string[] = [];

    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;

      // Check if this is already a formatted block (list, quote, etc)
      if (trimmed.startsWith('<')) {
        result.push(trimmed);
        continue;
      }

      // If this part has single line breaks, treat them as paragraph separators
      if (trimmed.includes('\n')) {
        const subParts = trimmed.split('\n').filter(p => p.trim());
        
        // If we have very short parts, group them
        const grouped = groupShortParagraphs(subParts);
        result.push(...grouped);
      } else {
        // Single paragraph, but might be too long
        const split = splitLongParagraph(trimmed);
        result.push(...split);
      }
    }
    return result.filter(p => p.trim().length > 0);
  }

  // Pure plain text - split by sentences and group intelligently
  const sentences = splitIntoSentences(text);
  return groupSentences(sentences);
}

/**
 * Groups short paragraphs together for better readability
 */
function groupShortParagraphs(paragraphs: string[]): string[] {
  const result: string[] = [];
  let buffer: string[] = [];
  let bufferLength = 0;

  for (const p of paragraphs) {
    const trimmed = p.trim();
    if (!trimmed) continue;

    buffer.push(trimmed);
    bufferLength += trimmed.length;

    // Flush buffer if:
    // 1. We've accumulated enough text (> 400 chars)
    // 2. Current paragraph is long enough to stand alone (> 300 chars)
    // 3. Paragraph ends with sentence-ending punctuation
    const shouldFlush = 
      bufferLength > 400 ||
      (trimmed.length > 300 && buffer.length === 1) ||
      (trimmed.match(/[.!?]$/) && bufferLength > 200);

    if (shouldFlush) {
      result.push(buffer.join(' '));
      buffer = [];
      bufferLength = 0;
    }
  }

  // Add remaining
  if (buffer.length > 0) {
    result.push(buffer.join(' '));
  }

  return result;
}

/**
 * Splits a very long paragraph into smaller, readable chunks
 */
function splitLongParagraph(text: string): string[] {
  // If paragraph is reasonable length, keep it
  if (text.length <= 800) return [text];

  // Split into sentences and regroup
  const sentences = splitIntoSentences(text);
  return groupSentences(sentences);
}

/**
 * Splits text into sentences using intelligent boundary detection
 */
function splitIntoSentences(text: string): string[] {
  const sentences: string[] = [];
  let currentSentence = '';
  let inQuote = false;
  let quoteChar = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    currentSentence += char;

    // Track if we're inside quotes
    if ((char === '"' || char === "'") && (i === 0 || text[i - 1] !== '\\')) {
      if (!inQuote) {
        inQuote = true;
        quoteChar = char;
      } else if (char === quoteChar) {
        inQuote = false;
        quoteChar = '';
      }
    }

    // Don't split inside quotes
    if (inQuote) continue;

    // Check if we've reached a sentence boundary
    if (char === '.' || char === '!' || char === '?') {
      // Avoid splitting on common abbreviations
      if (char === '.' && isCommonAbbreviation(currentSentence)) {
        continue;
      }

      // Look ahead for capital letter after spaces
      if (i === text.length - 1) {
        // End of text
        const trimmed = currentSentence.trim();
        if (trimmed) sentences.push(trimmed);
        currentSentence = '';
      } else if (nextChar === ' ' || nextChar === '\n') {
        // Check if next non-space character is capital
        let j = i + 1;
        while (j < text.length && (text[j] === ' ' || text[j] === '\n')) j++;
        
        if (j < text.length && /[A-Z0-9"]/.test(text[j])) {
          // Sentence boundary found
          const trimmed = currentSentence.trim();
          if (trimmed) sentences.push(trimmed);
          currentSentence = '';
          i = j - 1; // Skip whitespace
        }
      }
    }
  }

  // Add remaining text
  if (currentSentence.trim()) {
    sentences.push(currentSentence.trim());
  }

  return sentences.filter(s => s.length > 0);
}

/**
 * Checks if text ends with a common abbreviation
 */
function isCommonAbbreviation(text: string): boolean {
  const common = ['Mr.', 'Mrs.', 'Dr.', 'Ms.', 'Prof.', 'Sr.', 'Jr.', 'etc.', 'e.g.', 'i.e.', 'vs.', 'Inc.', 'Ltd.', 'Corp.'];
  const lastWord = text.trim().split(/\s+/).pop() || '';
  return common.includes(lastWord);
}

/**
 * Groups sentences into readable paragraphs (3-5 sentences each)
 */
function groupSentences(sentences: string[]): string[] {
  if (sentences.length === 0) return [];
  if (sentences.length <= 2) return [sentences.join(' ')];

  const paragraphs: string[] = [];
  let currentParagraph: string[] = [];
  let currentLength = 0;

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    currentParagraph.push(trimmed);
    currentLength += trimmed.length;

    // Break paragraph when:
    // 1. We have 4-5 sentences AND reasonable length
    // 2. Current paragraph > 500 chars
    // 3. Sentence ends with ! or ? (natural break point) AND we have at least 2 sentences
    const shouldBreak =
      (currentParagraph.length >= 4 && currentLength > 300) ||
      currentLength > 500 ||
      (currentParagraph.length >= 2 && trimmed.match(/[!?]$/) && currentLength > 200);

    if (shouldBreak && currentParagraph.length > 0) {
      paragraphs.push(currentParagraph.join(' '));
      currentParagraph = [];
      currentLength = 0;
    }
  }

  // Add remaining sentences
  if (currentParagraph.length > 0) {
    paragraphs.push(currentParagraph.join(' '));
  }

  return paragraphs;
}

/**
 * Formats a regular paragraph with inline formatting
 */
function formatParagraph(text: string): string {
  let formatted = escapeHtml(text);

  // Bold: **text** or __text__
  formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-white">$1</strong>');
  formatted = formatted.replace(/__(.+?)__/g, '<strong class="font-bold text-white">$1</strong>');

  // Italic: *text* or _text_ (but not in URLs or markdown that's already bold)
  formatted = formatted.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, '<em class="italic text-gray-100">$1</em>');
  formatted = formatted.replace(/(?<!_)_([^_]+?)_(?!_)/g, '<em class="italic text-gray-100">$1</em>');

  // Inline code: `code`
  formatted = formatted.replace(/`(.+?)`/g, '<code class="bg-black/60 border border-white/10 px-2 py-0.5 rounded font-mono text-sm text-blue-300">$1</code>');

  // Links: [text](url)
  formatted = formatted.replace(
    /\[(.+?)\]\((.+?)\)/g, 
    '<a href="$2" class="text-blue-400 hover:text-blue-300 underline underline-offset-4 transition-colors" target="_blank" rel="noopener noreferrer">$1</a>'
  );

  // Auto-link URLs (but not if already in href)
  formatted = formatted.replace(
    /(?<!href="|src="|">)https?:\/\/[^\s<]+(?=[<\s]|$)/g,
    '<a href="$&" class="text-blue-400 hover:text-blue-300 underline underline-offset-4 break-all transition-colors" target="_blank" rel="noopener noreferrer">$&</a>'
  );

  return formatted;
}

/**
 * Escapes HTML special characters
 */
function escapeHtml(text: string): string {
  const div = typeof document !== 'undefined' ? document.createElement('div') : null;
  if (div) {
    div.textContent = text;
    return div.innerHTML;
  }
  
  // Fallback for server-side
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Calculates estimated reading time based on word count
 * @param content - Article content (HTML or plain text)
 * @returns Reading time in minutes
 */
export function calculateReadingTime(content: string): number {
  if (!content) return 0;

  // Remove HTML tags for word count
  const plainText = content.replace(/<[^>]+>/g, ' ');
  
  // Count words (split by whitespace)
  const wordCount = plainText.trim().split(/\s+/).length;
  
  // Average reading speed: 200-250 words per minute
  const wordsPerMinute = 225;
  const minutes = Math.ceil(wordCount / wordsPerMinute);
  
  return Math.max(1, minutes); // Minimum 1 minute
}

/**
 * Extracts the first N sentences from content for preview
 */
export function extractPreview(content: string, maxSentences: number = 2): string {
  if (!content) return '';

  // Remove HTML tags
  const plainText = content.replace(/<[^>]+>/g, ' ').trim();
  
  // Split into sentences (basic approach)
  const sentences = plainText
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(Boolean);
  
  return sentences.slice(0, maxSentences).join('. ') + (sentences.length > maxSentences ? '...' : '.');
}
