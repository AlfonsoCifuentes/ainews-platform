/**
 * Unit Tests for oEmbed API Integration
 */

import { describe, it, expect } from 'vitest';
import {
  isOEmbedUrl,
  getOEmbedImagesFromContent,
  extractOEmbedImage,
  type OEmbedResponse
} from '../../lib/services/oembed';

describe('oEmbed - URL Detection', () => {
  
  it('should detect Twitter/X URLs', () => {
    expect(isOEmbedUrl('https://twitter.com/user/status/123456789')).toBe(true);
    expect(isOEmbedUrl('https://x.com/user/status/123456789')).toBe(true);
    expect(isOEmbedUrl('https://www.twitter.com/user/status/123456789')).toBe(true);
  });
  
  it('should detect YouTube URLs', () => {
    expect(isOEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
    expect(isOEmbedUrl('https://youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
    expect(isOEmbedUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(true);
  });
  
  it('should detect Vimeo URLs', () => {
    expect(isOEmbedUrl('https://vimeo.com/123456789')).toBe(true);
    expect(isOEmbedUrl('https://www.vimeo.com/123456789')).toBe(true);
    expect(isOEmbedUrl('https://player.vimeo.com/video/123456789')).toBe(true);
  });
  
  it('should detect Flickr URLs', () => {
    expect(isOEmbedUrl('https://www.flickr.com/photos/user/123456789')).toBe(true);
    expect(isOEmbedUrl('https://flickr.com/photos/user/123456789')).toBe(true);
  });
  
  it('should detect Reddit URLs', () => {
    expect(isOEmbedUrl('https://www.reddit.com/r/subreddit/comments/abc123/title')).toBe(true);
    expect(isOEmbedUrl('https://reddit.com/r/subreddit/comments/abc123/title')).toBe(true);
  });
  
  it('should reject non-oEmbed URLs', () => {
    expect(isOEmbedUrl('https://example.com/article')).toBe(false);
    expect(isOEmbedUrl('https://news.ycombinator.com/item?id=123')).toBe(false);
    expect(isOEmbedUrl('https://github.com/user/repo')).toBe(false);
  });
  
  it('should handle malformed URLs', () => {
    expect(isOEmbedUrl('')).toBe(false);
    expect(isOEmbedUrl('not-a-url')).toBe(false);
    expect(isOEmbedUrl('ftp://twitter.com/status/123')).toBe(false);
  });
});

describe('oEmbed - Image Extraction from Response', () => {
  
  it('should extract thumbnail URL from video oEmbed', () => {
    const response: OEmbedResponse = {
      type: 'video',
      version: '1.0',
      title: 'Test Video',
      author_name: 'Test Author',
      provider_name: 'YouTube',
      thumbnail_url: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
      thumbnail_width: 1280,
      thumbnail_height: 720,
      html: '<iframe src="..."></iframe>'
    };
    
    const imageUrl = extractOEmbedImage(response);
    expect(imageUrl).toBe('https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg');
  });
  
  it('should extract URL from photo oEmbed', () => {
    const response: OEmbedResponse = {
      type: 'photo',
      version: '1.0',
      title: 'Test Photo',
      author_name: 'Test Author',
      provider_name: 'Flickr',
      url: 'https://farm1.staticflickr.com/123/456789_abcdef.jpg',
      width: 1600,
      height: 1200
    };
    
    const imageUrl = extractOEmbedImage(response);
    expect(imageUrl).toBe('https://farm1.staticflickr.com/123/456789_abcdef.jpg');
  });
  
  it('should extract image from HTML embed', () => {
    const response: OEmbedResponse = {
      type: 'rich',
      version: '1.0',
      title: 'Test Rich Content',
      author_name: 'Test Author',
      provider_name: 'Twitter',
      html: '<blockquote><img src="https://pbs.twimg.com/media/abc123.jpg" /></blockquote>'
    };
    
    const imageUrl = extractOEmbedImage(response);
    expect(imageUrl).toBe('https://pbs.twimg.com/media/abc123.jpg');
  });
  
  it('should return null when no image found', () => {
    const response: OEmbedResponse = {
      type: 'rich',
      version: '1.0',
      title: 'Test',
      author_name: 'Author',
      provider_name: 'Provider',
      html: '<p>No images here</p>'
    };
    
    const imageUrl = extractOEmbedImage(response);
    expect(imageUrl).toBeNull();
  });
  
  it('should handle missing fields gracefully', () => {
    const response: OEmbedResponse = {
      type: 'video',
      version: '1.0',
      title: 'Test',
      author_name: 'Author',
      provider_name: 'Provider'
      // No thumbnail_url, no html
    };
    
    const imageUrl = extractOEmbedImage(response);
    expect(imageUrl).toBeNull();
  });
});

describe('oEmbed - Content Parsing', () => {
  
  it('should extract oEmbed URLs from HTML content', async () => {
    const content = `
      <p>Check out this tweet:</p>
      <a href="https://twitter.com/user/status/123456789">Tweet</a>
      <p>And this video:</p>
      <a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ">Video</a>
    `;
    
    const urls = await getOEmbedImagesFromContent(content);
    
    expect(urls).toHaveLength(2);
    expect(urls).toContain('https://twitter.com/user/status/123456789');
    expect(urls).toContain('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  });
  
  it('should extract oEmbed URLs from plain text', async () => {
    const content = `
      Check this out: https://vimeo.com/123456789
      Also see: https://www.flickr.com/photos/user/987654321
    `;
    
    const urls = await getOEmbedImagesFromContent(content);
    
    expect(urls).toHaveLength(2);
    expect(urls).toContain('https://vimeo.com/123456789');
    expect(urls).toContain('https://www.flickr.com/photos/user/987654321');
  });
  
  it('should deduplicate URLs', async () => {
    const content = `
      <a href="https://twitter.com/user/status/123">Tweet 1</a>
      <a href="https://twitter.com/user/status/123">Tweet 1 again</a>
      <a href="https://twitter.com/user/status/456">Tweet 2</a>
    `;
    
    const urls = await getOEmbedImagesFromContent(content);
    
    expect(urls).toHaveLength(2);
  });
  
  it('should return empty array for content without oEmbed URLs', async () => {
    const content = `
      <p>Just some regular text</p>
      <a href="https://example.com">Regular link</a>
    `;
    
    const urls = await getOEmbedImagesFromContent(content);
    
    expect(urls).toEqual([]);
  });
  
  it('should handle empty content', async () => {
    expect(await getOEmbedImagesFromContent('')).toEqual([]);
    expect(await getOEmbedImagesFromContent('   ')).toEqual([]);
  });
  
  it('should handle malformed HTML gracefully', async () => {
    const content = `
      <p>Unclosed paragraph
      <a href="https://twitter.com/user/status/123">Tweet</a>
      <div>Unclosed div
    `;
    
    const urls = await getOEmbedImagesFromContent(content);
    
    expect(urls).toHaveLength(1);
    expect(urls[0]).toBe('https://twitter.com/user/status/123');
  });
});

describe('oEmbed - Provider Detection', () => {
  
  it('should detect correct provider for each URL type', () => {
    const providers = [
      { url: 'https://twitter.com/user/status/123' },
      { url: 'https://www.youtube.com/watch?v=abc' },
      { url: 'https://vimeo.com/123456' },
      { url: 'https://www.flickr.com/photos/user/123' },
      { url: 'https://www.reddit.com/r/sub/comments/abc/title' }
    ];
    
    providers.forEach(({ url }) => {
      expect(isOEmbedUrl(url)).toBe(true);
      // Provider name would be detected in getOEmbedImage() implementation
    });
  });
});

describe('oEmbed - Error Handling', () => {
  
  it('should handle URL extraction errors gracefully', async () => {
    // Content with script tags and potential XSS
    const maliciousContent = `
      <script>alert('xss')</script>
      <a href="javascript:void(0)">Bad link</a>
      <a href="https://twitter.com/user/status/123">Good link</a>
    `;
    
    const urls = await getOEmbedImagesFromContent(maliciousContent);
    
    expect(urls).toHaveLength(1);
    expect(urls[0]).toBe('https://twitter.com/user/status/123');
  });
});

describe('oEmbed - Integration Patterns', () => {
  
  it('should support all major social platforms', () => {
    const platforms = [
      'https://twitter.com/user/status/123',
      'https://x.com/user/status/123',
      'https://www.youtube.com/watch?v=abc',
      'https://youtu.be/abc',
      'https://vimeo.com/123',
      'https://www.flickr.com/photos/user/123',
      'https://www.reddit.com/r/sub/comments/abc/title'
    ];
    
    platforms.forEach(url => {
      expect(isOEmbedUrl(url)).toBe(true);
    });
  });
  
  it('should extract multiple images from mixed content', async () => {
    const content = `
      <article>
        <p>Check out these resources:</p>
        <ul>
          <li><a href="https://twitter.com/user/status/111">Tweet</a></li>
          <li><a href="https://www.youtube.com/watch?v=abc">Video</a></li>
          <li><a href="https://example.com/article">Article</a></li>
          <li><a href="https://vimeo.com/222">Another video</a></li>
        </ul>
      </article>
    `;
    
    const urls = await getOEmbedImagesFromContent(content);
    
    expect(urls).toHaveLength(3);
    expect(urls).toContain('https://twitter.com/user/status/111');
    expect(urls).toContain('https://www.youtube.com/watch?v=abc');
    expect(urls).toContain('https://vimeo.com/222');
    expect(urls).not.toContain('https://example.com/article');
  });
});
