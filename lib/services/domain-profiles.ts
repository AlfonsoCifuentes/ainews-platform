/**
 * Domain-Specific Scraping Profiles
 * Phase 5.1 - Category B: Advanced Scraping
 * 
 * Custom strategies for known domains with specific HTML structures
 */

export interface DomainProfile {
  domain: string;
  selectors: {
    primary: string[];
    fallback: string[];
  };
  transformUrl?: (url: string) => string; // Transform to get high-res version
  minWidth?: number;
  minHeight?: number;
  blacklistPatterns?: RegExp[];
}

export const DOMAIN_PROFILES: Record<string, DomainProfile> = {
  // TechCrunch
  'techcrunch.com': {
    domain: 'techcrunch.com',
    selectors: {
      primary: [
        'meta[property="og:image"]',
        '.article__featured-image img',
        '.wp-post-image'
      ],
      fallback: ['article img[src*="wp-content"]']
    },
    transformUrl: (url) => url.replace(/\?.*$/, ''), // Remove query params
    minWidth: 1200,
    blacklistPatterns: [/logo/i, /avatar/i, /author/i]
  },

  // VentureBeat
  'venturebeat.com': {
    domain: 'venturebeat.com',
    selectors: {
      primary: [
        'meta[property="og:image"]',
        '.article-image img',
        '.ArticlePage-hero-image img'
      ],
      fallback: ['article img.wp-image']
    },
    minWidth: 1024
  },

  // Wired
  'wired.com': {
    domain: 'wired.com',
    selectors: {
      primary: [
        'meta[property="og:image"]',
        '[data-testid="ContentHeaderHed"] + figure img',
        '.lead-asset__image img'
      ],
      fallback: ['article figure img']
    },
    minWidth: 1200
  },

  // MIT Technology Review
  'technologyreview.com': {
    domain: 'technologyreview.com',
    selectors: {
      primary: [
        'meta[property="og:image"]',
        '.hero__image img',
        '.tease-card__image img'
      ],
      fallback: ['article img']
    },
    minWidth: 1200
  },

  // The Guardian
  'theguardian.com': {
    domain: 'theguardian.com',
    selectors: {
      primary: [
        'meta[property="og:image"]',
        '.article__img img',
        '[data-component="picture"] img'
      ],
      fallback: ['article figure img']
    },
    transformUrl: (url) => {
      // Get master image (largest)
      return url.replace(/\/\d+\.jpg/, '/master/0.jpg');
    },
    minWidth: 1200
  },

  // ArXiv
  'arxiv.org': {
    domain: 'arxiv.org',
    selectors: {
      primary: [
        'meta[property="og:image"]',
        '.abs-figure img'
      ],
      fallback: []
    },
    // ArXiv PDFs often don't have images, fallback to generated
    minWidth: 800
  },

  // Medium
  'medium.com': {
    domain: 'medium.com',
    selectors: {
      primary: [
        'meta[property="og:image"]',
        'article figure img[src*="cdn-images"]'
      ],
      fallback: ['article img']
    },
    transformUrl: (url) => {
      // Get high-res version
      return url.replace(/\/max\/\d+\//, '/max/2000/');
    },
    minWidth: 1200,
    blacklistPatterns: [/avatar/i, /clap/i, /profile/i]
  },

  // Substack
  'substack.com': {
    domain: 'substack.com',
    selectors: {
      primary: [
        'meta[property="og:image"]',
        '.image-container img',
        'article img[src*="substackcdn"]'
      ],
      fallback: ['article img']
    },
    minWidth: 1024
  },

  // Hugging Face
  'huggingface.co': {
    domain: 'huggingface.co',
    selectors: {
      primary: [
        'meta[property="og:image"]',
        '.SVELTE_HYDRATER img',
        'article img'
      ],
      fallback: []
    },
    minWidth: 800
  },

  // Google AI Blog
  'ai.googleblog.com': {
    domain: 'ai.googleblog.com',
    selectors: {
      primary: [
        'meta[property="og:image"]',
        '.post-body img:first-of-type'
      ],
      fallback: ['article img']
    },
    minWidth: 1024
  },

  // OpenAI Blog
  'openai.com': {
    domain: 'openai.com',
    selectors: {
      primary: [
        'meta[property="og:image"]',
        '.f-post-header__image img',
        'article img:first-of-type'
      ],
      fallback: []
    },
    minWidth: 1200
  },

  // Generic fallback profile
  'generic': {
    domain: '*',
    selectors: {
      primary: [
        'meta[property="og:image"]',
        'meta[name="twitter:image"]',
        'article img:first-of-type',
        'img[itemprop="image"]'
      ],
      fallback: ['img']
    },
    minWidth: 800,
    blacklistPatterns: [
      /logo/i,
      /avatar/i,
      /profile/i,
      /icon/i,
      /button/i,
      /badge/i,
      /banner/i,
      /ad[s]?[-_]/i
    ]
  }
};

/**
 * Get domain profile for a given URL
 */
export function getDomainProfile(url: string): DomainProfile {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace(/^www\./, '');

    // Check for exact match
    for (const [key, profile] of Object.entries(DOMAIN_PROFILES)) {
      if (hostname.includes(key) || key === hostname) {
        return profile;
      }
    }

    // Fallback to generic
    return DOMAIN_PROFILES.generic;
  } catch {
    return DOMAIN_PROFILES.generic;
  }
}

/**
 * Apply domain-specific transformations to image URL
 */
export function transformImageUrl(imageUrl: string, domainProfile: DomainProfile): string {
  if (domainProfile.transformUrl) {
    try {
      return domainProfile.transformUrl(imageUrl);
    } catch {
      return imageUrl;
    }
  }
  return imageUrl;
}

/**
 * Check if image URL matches blacklist patterns
 */
export function isBlacklistedImage(imageUrl: string, domainProfile: DomainProfile): boolean {
  if (!domainProfile.blacklistPatterns) return false;

  return domainProfile.blacklistPatterns.some(pattern => pattern.test(imageUrl));
}
