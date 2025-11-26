/**
 * Content formatting utilities for article display
 */

/**
 * Remove common UI patterns and noise from scraped content
 * Cleans up button text, navigation elements, and other non-content text
 */
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
  ];
  
  let cleaned = text;
  
  // Apply all patterns
  for (const pattern of uiPatterns) {
    cleaned = cleaned.replace(pattern, '');
  }
  
  // Remove excessive whitespace left by removals
  cleaned = cleaned
    .replace(/\n{3,}/g, '\n\n')             // Max 2 consecutive newlines
    .replace(/[ \t]{2,}/g, ' ')             // Max 1 space
    .replace(/^\s+/gm, '')                  // Trim line starts
    .trim();
  
  return cleaned;
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
