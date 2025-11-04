/**
 * SEO Utilities
 * Phase 5.1 - Category F: i18n & SEO
 * 
 * Features:
 * - Alternate language metadata generation
 * - JSON-LD structured data for news articles
 * - Canonical URL normalization
 */

import { Metadata } from 'next';

// ============================================================================
// TYPES
// ============================================================================

export interface NewsArticleSEO {
  id: string;
  title_en: string;
  title_es: string;
  summary_en?: string;
  summary_es?: string;
  image_url?: string;
  published_at?: string;
  author?: string;
  category?: string;
  url?: string;
}

// ============================================================================
// ALTERNATE LANGUAGES
// ============================================================================

/**
 * Generate alternate language links for metadata
 */
export function generateAlternateLanguages(
  pathname: string
): Metadata['alternates'] {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ainews.com';

  // Remove locale from pathname if present
  const cleanPath = pathname.replace(/^\/(en|es)/, '');

  return {
    canonical: `${baseUrl}${pathname}`,
    languages: {
      'en': `${baseUrl}/en${cleanPath}`,
      'es': `${baseUrl}/es${cleanPath}`,
      'x-default': `${baseUrl}/en${cleanPath}`, // Default to English
    },
  };
}

/**
 * Generate complete metadata with i18n support
 */
export function generateLocalizedMetadata(
  title: string,
  description: string,
  pathname: string,
  locale: 'en' | 'es',
  options?: {
    image?: string;
    keywords?: string[];
    type?: 'website' | 'article';
  }
): Metadata {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ainews.com';
  const url = `${baseUrl}${pathname}`;

  return {
    title,
    description,
    keywords: options?.keywords || [],
    alternates: generateAlternateLanguages(pathname),
    openGraph: {
      title,
      description,
      url,
      siteName: 'AINews',
      locale: locale === 'en' ? 'en_US' : 'es_ES',
      type: options?.type || 'website',
      images: options?.image ? [
        {
          url: options.image,
          width: 1200,
          height: 630,
          alt: title,
        },
      ] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: options?.image ? [options.image] : [],
    },
  };
}

// ============================================================================
// JSON-LD STRUCTURED DATA
// ============================================================================

/**
 * Generate JSON-LD NewsArticle schema
 * https://schema.org/NewsArticle
 */
export function generateNewsArticleJsonLd(
  article: NewsArticleSEO,
  locale: 'en' | 'es'
): object {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ainews.com';
  const title = locale === 'en' ? article.title_en : article.title_es;
  const summary = locale === 'en' ? article.summary_en : article.summary_es;

  return {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: title,
    description: summary || '',
    image: article.image_url || `${baseUrl}/og-image.png`,
    datePublished: article.published_at || new Date().toISOString(),
    dateModified: article.published_at || new Date().toISOString(),
    author: {
      '@type': 'Organization',
      name: article.author || 'AINews',
      url: baseUrl,
    },
    publisher: {
      '@type': 'Organization',
      name: 'AINews',
      url: baseUrl,
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/logo.svg`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': article.url || `${baseUrl}/${locale}/news/${article.id}`,
    },
    articleSection: article.category || 'AI News',
    inLanguage: locale === 'en' ? 'en-US' : 'es-ES',
  };
}

/**
 * Generate JSON-LD BreadcrumbList schema
 */
export function generateBreadcrumbJsonLd(
  items: Array<{ name: string; url: string }>
): object {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ainews.com';

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${baseUrl}${item.url}`,
    })),
  };
}

/**
 * Generate JSON-LD WebSite schema with search box
 */
export function generateWebSiteJsonLd(locale: 'en' | 'es'): object {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ainews.com';

  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'AINews',
    url: baseUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${baseUrl}/${locale}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
    inLanguage: locale === 'en' ? 'en-US' : 'es-ES',
  };
}

// ============================================================================
// CANONICAL URL NORMALIZATION
// ============================================================================

/**
 * Normalize pathname for canonical URLs
 * - Removes trailing slashes
 * - Lowercases path
 * - Handles locale prefixes
 */
export function normalizeCanonicalPath(pathname: string): string {
  let normalized = pathname.trim();

  // Remove trailing slash (except for root)
  if (normalized.length > 1 && normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }

  // Lowercase
  normalized = normalized.toLowerCase();

  // Ensure starts with /
  if (!normalized.startsWith('/')) {
    normalized = `/${normalized}`;
  }

  return normalized;
}

/**
 * Generate full canonical URL
 */
export function getCanonicalUrl(pathname: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ainews.com';
  const normalized = normalizeCanonicalPath(pathname);
  return `${baseUrl}${normalized}`;
}

/**
 * Extract locale from pathname
 */
export function getLocaleFromPath(pathname: string): 'en' | 'es' {
  if (pathname.startsWith('/es')) return 'es';
  return 'en';
}

/**
 * Remove locale prefix from pathname
 */
export function removeLocalePrefix(pathname: string): string {
  return pathname.replace(/^\/(en|es)/, '') || '/';
}

// ============================================================================
// SITEMAP HELPERS
// ============================================================================

/**
 * Generate sitemap entry with alternate languages
 */
export interface SitemapEntry {
  url: string;
  lastModified?: string | Date;
  changeFrequency?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
  alternates?: {
    languages: Record<string, string>;
  };
}

export function generateSitemapEntry(
  path: string,
  options?: {
    lastModified?: string | Date;
    changeFrequency?: SitemapEntry['changeFrequency'];
    priority?: number;
  }
): SitemapEntry {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ainews.com';
  const cleanPath = removeLocalePrefix(normalizeCanonicalPath(path));

  return {
    url: `${baseUrl}/en${cleanPath}`,
    lastModified: options?.lastModified || new Date(),
    changeFrequency: options?.changeFrequency || 'daily',
    priority: options?.priority || 0.7,
    alternates: {
      languages: {
        'en': `${baseUrl}/en${cleanPath}`,
        'es': `${baseUrl}/es${cleanPath}`,
      },
    },
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate JSON-LD script tag HTML string
 * Use in Next.js: <div dangerouslySetInnerHTML={{ __html: generateJsonLdScript(data) }} />
 */
export function generateJsonLdScript(data: object): string {
  return `<script type="application/ld+json">${JSON.stringify(data)}</script>`;
}

/**
 * Generate robots meta tag based on environment
 */
export function getRobotsMetadata(): Metadata['robots'] {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    return {
      index: false,
      follow: false,
      nocache: true,
    };
  }

  return {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  };
}
