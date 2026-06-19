import { describe, expect, it } from 'vitest';
import {
  assignFallbackImagesToArticles,
  getImageWithFallback,
  isUsableNewsImageUrl,
} from '@/lib/utils/generate-fallback-image';

describe('news fallback images', () => {
  it('rejects legacy Unsplash Source URLs as usable news images', () => {
    expect(isUsableNewsImageUrl('https://source.unsplash.com/1600x900/?ai')).toBe(false);
    expect(isUsableNewsImageUrl('/images/fallback_images/local-cover.jpg')).toBe(true);
  });

  it('replaces legacy Unsplash Source URLs with local fallbacks in article lists', () => {
    const [article] = assignFallbackImagesToArticles([
      {
        id: 'legacy-unsplash',
        image_url: 'https://source.unsplash.com/1600x900/?machine-learning&sig=123',
        title_en: 'Legacy generated image',
      },
    ]);

    expect(article.computed_image_url).toBe(article.preferred_fallback_image_url);
    expect(article.computed_image_url).not.toContain('source.unsplash.com');
  });

  it('returns a fallback image for a single article with a legacy Unsplash Source URL', () => {
    const imageUrl = getImageWithFallback(
      'https://source.unsplash.com/1600x900/?machine-learning&sig=456',
      'Legacy generated image',
      'research',
      'legacy-unsplash',
    );

    expect(imageUrl).not.toContain('source.unsplash.com');
    expect(imageUrl).toMatch(/^(\/images\/fallback_images\/|data:image\/svg\+xml;base64,|\/images\/news-placeholder\.webp)/);
  });
});
