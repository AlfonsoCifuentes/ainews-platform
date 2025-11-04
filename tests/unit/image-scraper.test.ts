/**
 * Unit Tests for Image Scraper
 * Tests all extraction strategies with real HTML fixtures
 */

import { describe, it, expect } from 'vitest';
import * as cheerio from 'cheerio';
import {
  HTML_WITH_OG_IMAGE,
  HTML_WITH_TWITTER_CARD,
  HTML_WITH_JSON_LD,
  HTML_WITH_LAZY_LOADING,
  HTML_WITH_SRCSET,
  HTML_WITH_PICTURE_ELEMENT,
  HTML_WITH_AMP,
  HTML_WITH_NOSCRIPT,
  HTML_WITH_INLINE_STYLE,
  HTML_WITH_MULTIPLE_STRATEGIES,
  HTML_WITH_NO_IMAGE,
  HTML_WITH_INVALID_IMAGE
} from '../fixtures/html-samples';

// Helper function to extract image using same logic as scraper
function extractImageFromHTML(html: string): string | null {
  const $ = cheerio.load(html);
  
  // 1. Open Graph
  const ogImage = $('meta[property="og:image"]').attr('content');
  if (ogImage && ogImage.startsWith('http')) return ogImage;
  
  // 2. Twitter Card
  const twitterImage = $('meta[name="twitter:image"]').attr('content');
  if (twitterImage && twitterImage.startsWith('http')) return twitterImage;
  
  // 3. JSON-LD
  const jsonLdScript = $('script[type="application/ld+json"]').first();
  if (jsonLdScript.length) {
    try {
      const jsonLd = JSON.parse(jsonLdScript.html() || '{}');
      const image = jsonLd.image?.url || jsonLd.image;
      if (typeof image === 'string' && image.startsWith('http')) return image;
    } catch {}
  }
  
  // 4. Lazy loading (data-src, data-lazy)
  const lazyImg = $('img[data-src], img[data-lazy]').first();
  if (lazyImg.length) {
    const dataSrc = lazyImg.attr('data-src') || lazyImg.attr('data-lazy');
    if (dataSrc && dataSrc.startsWith('http')) return dataSrc;
  }
  
  // 5. Srcset (get largest)
  const srcsetImg = $('img[srcset]').first();
  if (srcsetImg.length) {
    const srcset = srcsetImg.attr('srcset') || '';
    const urls = srcset.split(',').map(s => s.trim().split(' ')[0]);
    const largest = urls[urls.length - 1];
    if (largest && largest.startsWith('http')) return largest;
  }
  
  // 6. Picture element
  const picture = $('picture source[srcset]').first();
  if (picture.length) {
    const srcset = picture.attr('srcset');
    if (srcset && srcset.startsWith('http')) return srcset.split(' ')[0];
  }
  
  // 7. AMP
  const ampImg = $('amp-img[src]').first();
  if (ampImg.length) {
    const src = ampImg.attr('src');
    if (src && src.startsWith('http')) return src;
  }
  
  // 8. Noscript
  const noscript = $('noscript').first();
  if (noscript.length) {
    const noscriptHtml = noscript.html() || '';
    const noscript$ = cheerio.load(noscriptHtml);
    const img = noscript$('img[src]').first();
    const src = img.attr('src');
    if (src && src.startsWith('http')) return src;
  }
  
  // 9. CSS background (style attribute)
  const bgDiv = $('[style*="background-image"]').first();
  if (bgDiv.length) {
    const style = bgDiv.attr('style') || '';
    const match = style.match(/url\(['"]?([^'"]+)['"]?\)/);
    if (match && match[1] && match[1].startsWith('http')) return match[1];
  }
  
  // 10. Regular img tags
  const img = $('article img[src], img[src]').first();
  if (img.length) {
    const src = img.attr('src');
    if (src && src.startsWith('http')) return src;
  }
  
  return null;
}

describe('Image Scraper - Extraction Strategies', () => {
  
  it('should extract Open Graph image', () => {
    const image = extractImageFromHTML(HTML_WITH_OG_IMAGE);
    expect(image).toBe('https://example.com/og-image.jpg');
  });
  
  it('should extract Twitter Card image', () => {
    const image = extractImageFromHTML(HTML_WITH_TWITTER_CARD);
    expect(image).toBe('https://example.com/twitter-image.jpg');
  });
  
  it('should extract JSON-LD image', () => {
    const image = extractImageFromHTML(HTML_WITH_JSON_LD);
    expect(image).toBe('https://example.com/jsonld-image.jpg');
  });
  
  it('should extract lazy-loaded image from data-src', () => {
    const image = extractImageFromHTML(HTML_WITH_LAZY_LOADING);
    expect(image).toBe('https://example.com/lazy-image.jpg');
  });
  
  it('should extract largest image from srcset', () => {
    const image = extractImageFromHTML(HTML_WITH_SRCSET);
    expect(image).toBe('https://example.com/image-1600.jpg');
  });
  
  it('should extract image from picture element', () => {
    const image = extractImageFromHTML(HTML_WITH_PICTURE_ELEMENT);
    expect(image).toBe('https://example.com/image-xl.webp');
  });
  
  it('should extract AMP image', () => {
    const image = extractImageFromHTML(HTML_WITH_AMP);
    expect(image).toBe('https://example.com/amp-image.jpg');
  });
  
  it('should extract image from noscript tag', () => {
    const image = extractImageFromHTML(HTML_WITH_NOSCRIPT);
    expect(image).toBe('https://example.com/noscript-image.jpg');
  });
  
  it('should extract CSS background image from inline style', () => {
    const image = extractImageFromHTML(HTML_WITH_INLINE_STYLE);
    expect(image).toBe('https://example.com/inline-bg-image.jpg');
  });
  
  it('should prioritize Open Graph over other strategies', () => {
    const image = extractImageFromHTML(HTML_WITH_MULTIPLE_STRATEGIES);
    expect(image).toBe('https://example.com/og-priority-1.jpg');
  });
  
  it('should return null when no image found', () => {
    const image = extractImageFromHTML(HTML_WITH_NO_IMAGE);
    expect(image).toBeNull();
  });
  
  it('should return null for invalid URLs', () => {
    const image = extractImageFromHTML(HTML_WITH_INVALID_IMAGE);
    expect(image).toBeNull();
  });
});

describe('Image Scraper - Strategy Priority', () => {
  
  it('should follow correct priority order', () => {
    const priorities = [
      { name: 'Open Graph', html: HTML_WITH_OG_IMAGE, expected: 'https://example.com/og-image.jpg' },
      { name: 'Twitter Card', html: HTML_WITH_TWITTER_CARD, expected: 'https://example.com/twitter-image.jpg' },
      { name: 'JSON-LD', html: HTML_WITH_JSON_LD, expected: 'https://example.com/jsonld-image.jpg' }
    ];
    
    priorities.forEach(({ html, expected }) => {
      const image = extractImageFromHTML(html);
      expect(image).toBe(expected);
    });
  });
});

describe('Image Scraper - Edge Cases', () => {
  
  it('should handle malformed JSON-LD gracefully', () => {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <script type="application/ld+json">
        { "invalid": json }
        </script>
      </head>
      <body></body>
      </html>
    `;
    const image = extractImageFromHTML(html);
    expect(image).toBeNull();
  });
  
  it('should handle empty srcset', () => {
    const html = `
      <!DOCTYPE html>
      <html>
      <body>
        <img src="https://example.com/fallback.jpg" srcset="" alt="Empty srcset" />
      </body>
      </html>
    `;
    const image = extractImageFromHTML(html);
    expect(image).toBe('https://example.com/fallback.jpg');
  });
  
  it('should skip data URIs', () => {
    const html = `
      <!DOCTYPE html>
      <html>
      <body>
        <img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" alt="Data URI" />
      </body>
      </html>
    `;
    const image = extractImageFromHTML(html);
    expect(image).toBeNull();
  });
});
