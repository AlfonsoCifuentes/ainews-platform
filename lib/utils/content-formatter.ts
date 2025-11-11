/**
 * Content formatting utilities for article display
 */

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
  
  // Remove excessive whitespace and normalize line breaks
  const formatted = content.trim()
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
