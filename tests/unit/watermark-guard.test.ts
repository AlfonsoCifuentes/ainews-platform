import { describe, it, expect } from 'vitest';
import {
  textHasBrandCredit,
  stripImageOverlays,
  looksLikeBrandedImageUrl,
} from '@/lib/services/watermark-guard';

describe('textHasBrandCredit', () => {
  it('flags outlet names printed on the image', () => {
    expect(textHasBrandCredit('Elon Musk speaking. The Guardian').flagged).toBe(true);
    expect(textHasBrandCredit('Photo by John Doe / Reuters').flagged).toBe(true);
    expect(textHasBrandCredit('SOPA Images via Getty Images').flagged).toBe(true);
  });
  it('flags credit / copyright lines', () => {
    expect(textHasBrandCredit('Photograph: Bloomberg').flagged).toBe(true);
    expect(textHasBrandCredit('© 2026 Some Agency').flagged).toBe(true);
    expect(textHasBrandCredit('Foto: EFE').flagged).toBe(true);
  });
  it('does not flag ordinary in-photo text', () => {
    expect(textHasBrandCredit('OpenAI DevDay 2026').flagged).toBe(false);
    expect(textHasBrandCredit('apple announced a new chip').flagged).toBe(false); // "ap" must not match
    expect(textHasBrandCredit('').flagged).toBe(false);
  });
});

describe('stripImageOverlays', () => {
  it('removes the Guardian masthead overlay params', () => {
    const branded =
      'https://i.guim.co.uk/img/media/abc/0_0_5000_3000/master/5000.jpg?width=1200&overlay=https%3A%2F%2Fuploads.guim.co.uk%2Flogo.png&enable=upscale';
    const clean = stripImageOverlays(branded);
    expect(clean).not.toContain('overlay=');
    expect(clean).not.toContain('enable=');
    expect(clean).toContain('width=1200');
  });
  it('removes generic watermark/mark params', () => {
    expect(stripImageOverlays('https://cdn.example.com/p.jpg?w=800&mark=logo')).not.toContain('mark=');
  });
  it('is a no-op for clean URLs', () => {
    const u = 'https://cdn.example.com/photo.jpg?width=1200';
    expect(stripImageOverlays(u)).toBe(u);
  });
});

describe('looksLikeBrandedImageUrl', () => {
  it('detects share-card / watermark url variants', () => {
    expect(looksLikeBrandedImageUrl('https://x.com/img/social-card.jpg')).toBe(true);
    expect(looksLikeBrandedImageUrl('https://x.com/img/p.jpg?overlay=1')).toBe(true);
    expect(looksLikeBrandedImageUrl('https://media.gettyimages.com/id/123/photo.jpg')).toBe(true);
  });
  it('passes clean editorial photo urls', () => {
    expect(looksLikeBrandedImageUrl('https://i.guim.co.uk/img/media/abc/master/5000.jpg?width=1200')).toBe(false);
    expect(looksLikeBrandedImageUrl('https://cdn.arstechnica.net/wp-content/uploads/photo.jpg')).toBe(false);
  });
});
