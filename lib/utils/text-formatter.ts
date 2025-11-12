/**
 * Text Formatter Utility
 * Automatically formats article content for better readability
 * - Splits text into proper paragraphs
 * - Adds proper spacing and typography
 * - Handles lists, quotes, and code blocks
 * - Preserves markdown formatting if present
 */

/**
 * Formats raw article content into readable HTML
 * @param content - Raw content string (may include HTML or plain text)
 * @returns Formatted HTML string with proper paragraphs and styling
 */
export function formatArticleContent(content: string): string {
  if (!content) return '';

  // Remove excessive whitespace and normalize line breaks
  const formatted = content
    .trim()
    .replace(/\r\n/g, '\n') // Normalize Windows line breaks
    .replace(/\n{3,}/g, '\n\n'); // Max 2 consecutive line breaks

  // If content already has HTML tags, use it as-is but improve spacing
  if (/<[^>]+>/.test(formatted)) {
    return improveHtmlFormatting(formatted);
  }

  // Otherwise, convert plain text to formatted HTML
  return convertPlainTextToHtml(formatted);
}

/**
 * Improves existing HTML formatting
 */
function improveHtmlFormatting(html: string): string {
  return html
    // Ensure paragraphs have proper spacing
    .replace(/<p>/g, '<p class="mb-4 leading-relaxed">')
    // Style headings
    .replace(/<h1>/g, '<h1 class="text-3xl font-bold mt-8 mb-4">')
    .replace(/<h2>/g, '<h2 class="text-2xl font-bold mt-6 mb-3">')
    .replace(/<h3>/g, '<h3 class="text-xl font-semibold mt-4 mb-2">')
    // Style lists
    .replace(/<ul>/g, '<ul class="list-disc list-inside space-y-2 mb-4 ml-4">')
    .replace(/<ol>/g, '<ol class="list-decimal list-inside space-y-2 mb-4 ml-4">')
    .replace(/<li>/g, '<li class="leading-relaxed">')
    // Style blockquotes
    .replace(/<blockquote>/g, '<blockquote class="border-l-4 border-primary pl-4 italic my-4 text-muted-foreground">')
    // Style code blocks
    .replace(/<pre>/g, '<pre class="bg-black/40 rounded-lg p-4 overflow-x-auto mb-4">')
    .replace(/<code>/g, '<code class="font-mono text-sm">')
    // Style links
    .replace(/<a /g, '<a class="text-primary hover:underline" ');
}

/**
 * Converts plain text to formatted HTML
 */
function convertPlainTextToHtml(text: string): string {
  // Split into paragraphs (separated by double line breaks)
  const paragraphs = text.split(/\n\n+/);

  return paragraphs
    .map(para => {
      const trimmed = para.trim();
      if (!trimmed) return '';

      // Detect and format headings (lines that start with # or are ALL CAPS and short)
      if (trimmed.startsWith('#')) {
        const level = trimmed.match(/^#+/)?.[0].length || 1;
        const headingText = trimmed.replace(/^#+\s*/, '');
        return formatHeading(headingText, Math.min(level, 3));
      }

      // Detect headings by pattern (ALL CAPS, short lines)
      if (isLikelyHeading(trimmed)) {
        return formatHeading(trimmed, 2);
      }

      // Detect lists (lines starting with -, *, •, or numbers)
      if (/^[-*•]\s/.test(trimmed) || /^\d+\.\s/.test(trimmed)) {
        return formatList(trimmed);
      }

      // Detect blockquotes (lines starting with >)
      if (trimmed.startsWith('>')) {
        const quoteText = trimmed.replace(/^>\s*/, '');
        return `<blockquote class="border-l-4 border-primary pl-4 italic my-4 text-muted-foreground">${escapeHtml(quoteText)}</blockquote>`;
      }

      // Detect code blocks (indented lines or lines with backticks)
      if (trimmed.startsWith('    ') || /^```/.test(trimmed)) {
        const codeText = trimmed.replace(/^```\w*\n?/, '').replace(/```$/, '').trim();
        return `<pre class="bg-black/40 rounded-lg p-4 overflow-x-auto mb-4"><code class="font-mono text-sm">${escapeHtml(codeText)}</code></pre>`;
      }

      // Regular paragraph with inline formatting
      return formatParagraph(trimmed);
    })
    .filter(Boolean)
    .join('\n');
}

/**
 * Checks if a line is likely a heading
 */
function isLikelyHeading(text: string): boolean {
  // ALL CAPS and shorter than 60 chars (likely a heading)
  if (text === text.toUpperCase() && text.length < 60 && !/^\d/.test(text)) {
    return true;
  }
  
  // Short line ending with colon (likely a heading)
  if (text.length < 50 && text.endsWith(':')) {
    return true;
  }

  return false;
}

/**
 * Formats a heading
 */
function formatHeading(text: string, level: number): string {
  const cleanText = escapeHtml(text.replace(/[:#]+$/, '').trim());
  
  switch (level) {
    case 1:
      return `<h1 class="text-3xl font-bold mt-8 mb-4 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">${cleanText}</h1>`;
    case 2:
      return `<h2 class="text-2xl font-bold mt-6 mb-3">${cleanText}</h2>`;
    case 3:
      return `<h3 class="text-xl font-semibold mt-4 mb-2">${cleanText}</h3>`;
    default:
      return `<h2 class="text-2xl font-bold mt-6 mb-3">${cleanText}</h2>`;
  }
}

/**
 * Formats a list (bullet or numbered)
 */
function formatList(text: string): string {
  const lines = text.split('\n');
  const isBullet = /^[-*•]\s/.test(lines[0]);
  
  const listItems = lines
    .map(line => {
      const content = line.replace(/^[-*•]\s*/, '').replace(/^\d+\.\s*/, '').trim();
      return content ? `<li class="leading-relaxed">${escapeHtml(content)}</li>` : '';
    })
    .filter(Boolean)
    .join('\n');

  if (isBullet) {
    return `<ul class="list-disc list-inside space-y-2 mb-4 ml-4">\n${listItems}\n</ul>`;
  } else {
    return `<ol class="list-decimal list-inside space-y-2 mb-4 ml-4">\n${listItems}\n</ol>`;
  }
}

/**
 * Formats a regular paragraph with inline formatting
 */
function formatParagraph(text: string): string {
  let formatted = escapeHtml(text);

  // Bold: **text** or __text__
  formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold">$1</strong>');
  formatted = formatted.replace(/__(.+?)__/g, '<strong class="font-bold">$1</strong>');

  // Italic: *text* or _text_
  formatted = formatted.replace(/\*(.+?)\*/g, '<em class="italic">$1</em>');
  formatted = formatted.replace(/_(.+?)_/g, '<em class="italic">$1</em>');

  // Inline code: `code`
  formatted = formatted.replace(/`(.+?)`/g, '<code class="bg-black/40 px-1.5 py-0.5 rounded font-mono text-sm">$1</code>');

  // Links: [text](url)
  formatted = formatted.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-primary hover:underline" target="_blank" rel="noopener noreferrer">$1</a>');

  // Auto-link URLs
  formatted = formatted.replace(
    /(?<!href="|src=")https?:\/\/[^\s<]+/g,
    '<a href="$&" class="text-primary hover:underline break-all" target="_blank" rel="noopener noreferrer">$&</a>'
  );

  return `<p class="mb-4 leading-relaxed text-base">${formatted}</p>`;
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
