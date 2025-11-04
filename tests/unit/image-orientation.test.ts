/**
 * Unit Tests for Image Orientation Detection
 */

import { describe, it, expect } from 'vitest';
import {
  detectOrientation,
  calculateOrientationScore,
  getOrientationInfo,
  parseDimensionsFromUrl,
  estimateDimensionsFromUrl,
  compareByOrientation,
  hasAcceptableOrientation,
  getOrientationLabel
} from '../../lib/services/image-orientation';

describe('Image Orientation - Detection', () => {
  
  it('should detect landscape orientation', () => {
    expect(detectOrientation(1920, 1080)).toBe('landscape'); // 16:9
    expect(detectOrientation(1600, 900)).toBe('landscape');
    expect(detectOrientation(1200, 800)).toBe('landscape'); // 3:2
  });
  
  it('should detect portrait orientation', () => {
    expect(detectOrientation(1080, 1920)).toBe('portrait'); // 9:16
    expect(detectOrientation(800, 1200)).toBe('portrait'); // 2:3
  });
  
  it('should detect square orientation', () => {
    expect(detectOrientation(1000, 1000)).toBe('square'); // 1:1
    expect(detectOrientation(1200, 1200)).toBe('square');
    expect(detectOrientation(1200, 1250)).toBe('square'); // Within 5% threshold
  });
  
  it('should return unknown for zero dimensions', () => {
    expect(detectOrientation(0, 0)).toBe('unknown');
    expect(detectOrientation(1200, 0)).toBe('unknown');
    expect(detectOrientation(0, 1200)).toBe('unknown');
  });
});

describe('Image Orientation - Scoring', () => {
  
  it('should give high scores to landscape images', () => {
    const score16x9 = calculateOrientationScore(1920, 1080); // 16:9
    const score3x2 = calculateOrientationScore(1500, 1000); // 3:2
    const score4x3 = calculateOrientationScore(1600, 1200); // 4:3
    
    expect(score16x9).toBeGreaterThanOrEqual(95);
    expect(score3x2).toBeGreaterThanOrEqual(90);
    expect(score4x3).toBeGreaterThanOrEqual(80);
  });
  
  it('should give medium scores to square images', () => {
    const score = calculateOrientationScore(1000, 1000); // 1:1
    expect(score).toBeGreaterThanOrEqual(50);
    expect(score).toBeLessThanOrEqual(70);
  });
  
  it('should give low scores to portrait images', () => {
    const score2x3 = calculateOrientationScore(800, 1200); // 2:3
    const score9x16 = calculateOrientationScore(1080, 1920); // 9:16
    
    expect(score2x3).toBeLessThanOrEqual(50);
    expect(score9x16).toBeLessThanOrEqual(30);
  });
  
  it('should penalize extreme aspect ratios', () => {
    const veryWide = calculateOrientationScore(3000, 800); // Banner-like
    const veryTall = calculateOrientationScore(400, 1200); // Mobile screenshot
    
    expect(veryWide).toBeLessThanOrEqual(70);
    expect(veryTall).toBeLessThanOrEqual(50);
  });
  
  it('should return 0 for zero dimensions', () => {
    expect(calculateOrientationScore(0, 0)).toBe(0);
    expect(calculateOrientationScore(1200, 0)).toBe(0);
    expect(calculateOrientationScore(0, 1200)).toBe(0);
  });
});

describe('Image Orientation - URL Parsing', () => {
  
  it('should parse dimensions from URL patterns', () => {
    const urls = [
      { url: 'https://example.com/images/1200x630/photo.jpg', expected: { width: 1200, height: 630 } },
      { url: 'https://example.com/photo_1920x1080.jpg', expected: { width: 1920, height: 1080 } },
      { url: 'https://example.com/w1600-h900/image.png', expected: { width: 1600, height: 900 } },
      { url: 'https://example.com/1500w-1000h/photo.webp', expected: { width: 1500, height: 1000 } },
      { url: 'https://example.com/photo.1280x720.jpg', expected: { width: 1280, height: 720 } }
    ];
    
    urls.forEach(({ url, expected }) => {
      const result = parseDimensionsFromUrl(url);
      expect(result).toEqual(expected);
    });
  });
  
  it('should return null for URLs without dimension patterns', () => {
    expect(parseDimensionsFromUrl('https://example.com/photo.jpg')).toBeNull();
    expect(parseDimensionsFromUrl('https://example.com/images/banner.png')).toBeNull();
  });
  
  it('should reject unrealistic dimensions', () => {
    expect(parseDimensionsFromUrl('https://example.com/50x30/tiny.jpg')).toBeNull(); // Too small
    expect(parseDimensionsFromUrl('https://example.com/20000x15000/huge.jpg')).toBeNull(); // Too large
  });
  
  it('should estimate orientation from URL', () => {
    const result = estimateDimensionsFromUrl('https://example.com/1920x1080/photo.jpg');
    
    expect(result).not.toBeNull();
    expect(result?.orientation).toBe('landscape');
    expect(result?.aspectRatio).toBeCloseTo(1.78, 1);
    expect(result?.score).toBeGreaterThanOrEqual(95);
  });
});

describe('Image Orientation - Comparison', () => {
  
  it('should prefer landscape over portrait', () => {
    const landscape = { width: 1920, height: 1080 };
    const portrait = { width: 1080, height: 1920 };
    
    expect(compareByOrientation(landscape, portrait)).toBe(-1); // landscape is better
    expect(compareByOrientation(portrait, landscape)).toBe(1); // portrait is worse
  });
  
  it('should prefer landscape over square', () => {
    const landscape = { width: 1600, height: 900 };
    const square = { width: 1000, height: 1000 };
    
    expect(compareByOrientation(landscape, square)).toBe(-1);
  });
  
  it('should return 0 for equal scores', () => {
    const img1 = { width: 1920, height: 1080 }; // 16:9
    const img2 = { width: 1600, height: 900 }; // Also 16:9
    
    expect(compareByOrientation(img1, img2)).toBe(0);
  });
});

describe('Image Orientation - Acceptability', () => {
  
  it('should accept landscape images', () => {
    expect(hasAcceptableOrientation(1920, 1080)).toBe(true); // 16:9
    expect(hasAcceptableOrientation(1600, 900)).toBe(true);
  });
  
  it('should accept square images', () => {
    expect(hasAcceptableOrientation(1000, 1000)).toBe(true); // 1:1
  });
  
  it('should reject very portrait images', () => {
    expect(hasAcceptableOrientation(1080, 1920)).toBe(false); // 9:16
    expect(hasAcceptableOrientation(400, 1200)).toBe(false);
  });
  
  it('should have boundary at score 50', () => {
    // Find dimensions that give exactly score 50
    const borderline = { width: 1000, height: 1000 }; // Square typically around 60
    const lowScore = { width: 800, height: 1200 }; // Portrait around 40
    
    expect(hasAcceptableOrientation(borderline.width, borderline.height)).toBe(true);
    expect(hasAcceptableOrientation(lowScore.width, lowScore.height)).toBe(false);
  });
});

describe('Image Orientation - Labels', () => {
  
  it('should provide correct labels', () => {
    expect(getOrientationLabel('landscape')).toContain('Landscape');
    expect(getOrientationLabel('portrait')).toContain('Portrait');
    expect(getOrientationLabel('square')).toContain('Square');
    expect(getOrientationLabel('unknown')).toContain('Unknown');
  });
  
  it('should include emoji in labels', () => {
    expect(getOrientationLabel('landscape')).toMatch(/🖼️/);
    expect(getOrientationLabel('portrait')).toMatch(/📱/);
    expect(getOrientationLabel('square')).toMatch(/⬛/);
    expect(getOrientationLabel('unknown')).toMatch(/❓/);
  });
});

describe('Image Orientation - Complete Info', () => {
  
  it('should provide complete orientation info', () => {
    const info = getOrientationInfo(1920, 1080);
    
    expect(info.orientation).toBe('landscape');
    expect(info.aspectRatio).toBeCloseTo(1.78, 2);
    expect(info.score).toBeGreaterThanOrEqual(95);
  });
  
  it('should handle zero dimensions gracefully', () => {
    const info = getOrientationInfo(0, 0);
    
    expect(info.orientation).toBe('unknown');
    expect(info.aspectRatio).toBe(0);
    expect(info.score).toBe(0);
  });
});
