/**
 * Unit Tests for Validation Functions
 * Phase 5.1 - Category G: Testing & Quality
 * 
 * Tests Zod schemas and validation utilities
 */

import { describe, it, expect } from 'vitest';
import {
  normalizeCanonicalPath,
  getCanonicalUrl,
  getLocaleFromPath,
  removeLocalePrefix,
  generateAlternateLanguages,
} from '@/lib/utils/seo';

describe('SEO Utils - Canonical URL Normalization', () => {
  it('should remove trailing slashes', () => {
    expect(normalizeCanonicalPath('/en/news/')).toBe('/en/news');
    expect(normalizeCanonicalPath('/es/courses/')).toBe('/es/courses');
    expect(normalizeCanonicalPath('/about/')).toBe('/about');
  });

  it('should preserve root path', () => {
    expect(normalizeCanonicalPath('/')).toBe('/');
    expect(normalizeCanonicalPath('')).toBe('/');
  });

  it('should lowercase paths', () => {
    expect(normalizeCanonicalPath('/EN/NEWS')).toBe('/en/news');
    expect(normalizeCanonicalPath('/ES/Courses')).toBe('/es/courses');
    expect(normalizeCanonicalPath('/ABOUT')).toBe('/about');
  });

  it('should add leading slash', () => {
    expect(normalizeCanonicalPath('news')).toBe('/news');
    expect(normalizeCanonicalPath('en/about')).toBe('/en/about');
  });

  it('should handle complex paths', () => {
    expect(normalizeCanonicalPath('/EN/News/123/')).toBe('/en/news/123');
    expect(normalizeCanonicalPath('ES/Courses/ABC')).toBe('/es/courses/abc');
  });

  it('should generate full canonical URLs', () => {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://thotnet-core.vercel.app';
    
    expect(getCanonicalUrl('/en/news')).toBe(`${baseUrl}/en/news`);
    expect(getCanonicalUrl('/ES/Courses/')).toBe(`${baseUrl}/es/courses`);
  });
});

describe('SEO Utils - Locale Handling', () => {
  it('should extract locale from path', () => {
    expect(getLocaleFromPath('/en/news')).toBe('en');
    expect(getLocaleFromPath('/es/courses')).toBe('es');
    expect(getLocaleFromPath('/en')).toBe('en');
    expect(getLocaleFromPath('/es')).toBe('es');
  });

  it('should default to en for unknown paths', () => {
    expect(getLocaleFromPath('/news')).toBe('en');
    expect(getLocaleFromPath('/about')).toBe('en');
    expect(getLocaleFromPath('/')).toBe('en');
  });

  it('should remove locale prefix', () => {
    expect(removeLocalePrefix('/en/news')).toBe('/news');
    expect(removeLocalePrefix('/es/courses')).toBe('/courses');
    expect(removeLocalePrefix('/en')).toBe('/');
    expect(removeLocalePrefix('/es')).toBe('/');
  });

  it('should handle paths without locale', () => {
    expect(removeLocalePrefix('/news')).toBe('/news');
    expect(removeLocalePrefix('/about')).toBe('/about');
    expect(removeLocalePrefix('/')).toBe('/');
  });
});

describe('SEO Utils - Alternate Languages', () => {
  it('should generate alternate language links', () => {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://thotnet-core.vercel.app';
    const alternates = generateAlternateLanguages('/en/news');

    expect(alternates).toBeTruthy();
    expect(alternates?.canonical).toBe(`${baseUrl}/en/news`);
    expect(alternates?.languages?.en).toBe(`${baseUrl}/en/news`);
    expect(alternates?.languages?.es).toBe(`${baseUrl}/es/news`);
    expect(alternates?.languages?.['x-default']).toBe(`${baseUrl}/en/news`);
  });

  it('should handle spanish paths', () => {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://thotnet-core.vercel.app';
    const alternates = generateAlternateLanguages('/es/courses');

    expect(alternates).toBeTruthy();
    expect(alternates?.canonical).toBe(`${baseUrl}/es/courses`);
    expect(alternates?.languages?.en).toBe(`${baseUrl}/en/courses`);
    expect(alternates?.languages?.es).toBe(`${baseUrl}/es/courses`);
  });

  it('should handle root paths', () => {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://thotnet-core.vercel.app';
    const alternates = generateAlternateLanguages('/en');

    expect(alternates).toBeTruthy();
    expect(alternates?.canonical).toBe(`${baseUrl}/en`);
    expect(alternates?.languages?.en).toBe(`${baseUrl}/en`);
    expect(alternates?.languages?.es).toBe(`${baseUrl}/es`);
  });
});
