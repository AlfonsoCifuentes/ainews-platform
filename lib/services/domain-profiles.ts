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
    // ArXiv pages usually expose branding images in OG tags; do not trust those as article imagery.
    minWidth: 800,
    blacklistPatterns: [/arxiv-logo/i, /logo/i, /icon/i, /favicon/i]
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

  // Anthropic Blog
  'anthropic.com': {
    domain: 'anthropic.com',
    selectors: {
      primary: [
        'meta[property="og:image"]',
        '.blog-featured-image img',
        'article figure img:first-of-type',
        '[class*="hero"] img',
        '[class*="Hero"] img'
      ],
      fallback: ['article img']
    },
    minWidth: 1200
  },

  // Google DeepMind
  'deepmind.google': {
    domain: 'deepmind.google',
    selectors: {
      primary: [
        'meta[property="og:image"]',
        '[class*="hero"] img',
        '[class*="Hero"] img',
        'article img:first-of-type'
      ],
      fallback: []
    },
    minWidth: 1200
  },

  // Google AI (ai.google, research.google)
  'ai.google': {
    domain: 'ai.google',
    selectors: {
      primary: [
        'meta[property="og:image"]',
        '.glue-header__logo + * img',
        'article img:first-of-type'
      ],
      fallback: []
    },
    minWidth: 1024
  },

  // Meta AI
  'ai.meta.com': {
    domain: 'ai.meta.com',
    selectors: {
      primary: [
        'meta[property="og:image"]',
        '[class*="hero"] img',
        'article img:first-of-type'
      ],
      fallback: []
    },
    minWidth: 1200
  },

  // Microsoft AI Blog
  'blogs.microsoft.com': {
    domain: 'blogs.microsoft.com',
    selectors: {
      primary: [
        'meta[property="og:image"]',
        '.entry-content img:first-of-type',
        '.post-featured-image img',
        '.wp-post-image'
      ],
      fallback: ['article img']
    },
    minWidth: 1200
  },

  // NVIDIA Blog
  'blogs.nvidia.com': {
    domain: 'blogs.nvidia.com',
    selectors: {
      primary: [
        'meta[property="og:image"]',
        '.featured-image img',
        '.post-thumbnail img',
        '.wp-post-image'
      ],
      fallback: ['article img']
    },
    minWidth: 1200
  },

  // The Verge
  'theverge.com': {
    domain: 'theverge.com',
    selectors: {
      primary: [
        'meta[property="og:image"]',
        '[data-component-name="HeroImage"] img',
        '.duet--article--article-body-component figure:first-of-type img',
        'figure.e-image img'
      ],
      fallback: ['article figure img']
    },
    transformUrl: (url) => {
      // Chorus/Vox media: strip width constraints
      return url.replace(/\/t\/\d+x\d+\//, '/t/full/').replace(/[?&]width=\d+/, '');
    },
    minWidth: 1200,
    blacklistPatterns: [/logo/i, /avatar/i, /profile/i]
  },

  // Ars Technica
  'arstechnica.com': {
    domain: 'arstechnica.com',
    selectors: {
      primary: [
        'meta[property="og:image"]',
        '.gallery figure img:first-of-type',
        '.article-content > figure:first-of-type img',
        'article header figure img'
      ],
      fallback: ['article img']
    },
    minWidth: 1200,
    blacklistPatterns: [/logo/i, /avatar/i, /subscribe/i]
  },

  // Reuters
  'reuters.com': {
    domain: 'reuters.com',
    selectors: {
      primary: [
        'meta[property="og:image"]',
        '[class*="ArticleHeader"] img',
        '[class*="article-header"] img',
        'article figure:first-of-type img',
        '[class*="hero"] img'
      ],
      fallback: ['[class*="ArticleBody"] img:first-of-type']
    },
    minWidth: 1200
  },

  // BBC
  'bbc.com': {
    domain: 'bbc.com',
    selectors: {
      primary: [
        'meta[property="og:image"]',
        '[data-component="image-block"] img',
        '.article-body figure:first-of-type img',
        '[class*="ImageBlock"] img'
      ],
      fallback: ['article img']
    },
    transformUrl: (url) => {
      // BBC CDN: get full-resolution image by removing size suffix
      return url.replace(/\/\d+$/, '').replace(/_\d+x\d+\.jpg/, '.jpg');
    },
    minWidth: 1024
  },

  // Bloomberg
  'bloomberg.com': {
    domain: 'bloomberg.com',
    selectors: {
      primary: [
        'meta[property="og:image"]',
        '[data-component="hero-image"] img',
        '[class*="lede"] img',
        'article figure:first-of-type img'
      ],
      fallback: []
    },
    minWidth: 1200
  },

  // Forbes
  'forbes.com': {
    domain: 'forbes.com',
    selectors: {
      primary: [
        'meta[property="og:image"]',
        '.article-header__image img',
        'figure.article__image img',
        '.content-img img'
      ],
      fallback: ['article img']
    },
    minWidth: 1200,
    blacklistPatterns: [/logo/i, /avatar/i, /contributor/i, /headshot/i]
  },

  // ZDNet
  'zdnet.com': {
    domain: 'zdnet.com',
    selectors: {
      primary: [
        'meta[property="og:image"]',
        '.hero-image img',
        '.article-hero img',
        'article figure:first-of-type img'
      ],
      fallback: ['article img']
    },
    minWidth: 1024
  },

  // InfoQ
  'infoq.com': {
    domain: 'infoq.com',
    selectors: {
      primary: [
        'meta[property="og:image"]',
        '.article_page_image img',
        '#article_show_content img:first-of-type'
      ],
      fallback: ['article img']
    },
    minWidth: 800
  },

  // Towards Data Science
  'towardsdatascience.com': {
    domain: 'towardsdatascience.com',
    selectors: {
      primary: [
        'meta[property="og:image"]',
        'article figure img[src*="cdn-images"]',
        'article figure img:first-of-type'
      ],
      fallback: ['article img']
    },
    transformUrl: (url) => url.replace(/\/max\/\d+\//, '/max/2000/'),
    minWidth: 1200,
    blacklistPatterns: [/avatar/i, /profile/i]
  },

  // KDnuggets
  'kdnuggets.com': {
    domain: 'kdnuggets.com',
    selectors: {
      primary: [
        'meta[property="og:image"]',
        '.entry-content img:first-of-type',
        'article img:first-of-type'
      ],
      fallback: []
    },
    minWidth: 800,
    blacklistPatterns: [/logo/i, /banner/i]
  },

  // Analytics Vidhya
  'analyticsvidhya.com': {
    domain: 'analyticsvidhya.com',
    selectors: {
      primary: [
        'meta[property="og:image"]',
        '.entry-content img:first-of-type',
        '.featured-image img',
        'article img:first-of-type'
      ],
      fallback: []
    },
    minWidth: 800
  },

  // AI Business
  'aibusiness.com': {
    domain: 'aibusiness.com',
    selectors: {
      primary: [
        'meta[property="og:image"]',
        '.article-hero img',
        'article figure:first-of-type img'
      ],
      fallback: ['article img']
    },
    minWidth: 1024
  },

  // The New Stack
  'thenewstack.io': {
    domain: 'thenewstack.io',
    selectors: {
      primary: [
        'meta[property="og:image"]',
        '.featured-image-main img',
        '.article-featured-image img',
        '.wp-post-image'
      ],
      fallback: ['article img']
    },
    minWidth: 1024
  },

  // Synced Review
  'syncedreview.com': {
    domain: 'syncedreview.com',
    selectors: {
      primary: [
        'meta[property="og:image"]',
        '.entry-content img:first-of-type',
        '.post-featured-image img'
      ],
      fallback: ['article img']
    },
    minWidth: 800
  },

  // Business Insider
  'businessinsider.com': {
    domain: 'businessinsider.com',
    selectors: {
      primary: [
        'meta[property="og:image"]',
        '.article-image img',
        '[class*="hero"] img:first-of-type'
      ],
      fallback: ['article img']
    },
    minWidth: 1200,
    blacklistPatterns: [/logo/i, /avatar/i, /headshot/i]
  },

  // New Scientist
  'newscientist.com': {
    domain: 'newscientist.com',
    selectors: {
      primary: [
        'meta[property="og:image"]',
        '.article-header__image img',
        'figure.article-image img'
      ],
      fallback: ['article img']
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
