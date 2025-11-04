/**
 * Security Utilities
 * Phase 5.1 - Category H: Security
 * 
 * Features:
 * - HTTP request timeouts (strict limits)
 * - User-Agent identification
 * - robots.txt respect
 * - Request validation
 */

// ============================================================================
// TIMEOUT CONSTANTS
// ============================================================================

export const TIMEOUTS = {
  HEAD: 5000,      // 5 seconds for HEAD requests
  GET_FAST: 10000, // 10 seconds for image/metadata fetches
  GET_SLOW: 15000, // 15 seconds for content scraping
  POST: 30000,     // 30 seconds for API calls
} as const;

// ============================================================================
// USER-AGENT
// ============================================================================

const PACKAGE_VERSION = '1.0.0';
const CONTACT_EMAIL = 'bot@ainews.com';
const REPO_URL = 'https://github.com/AlfonsoCifuentes/ainews-platform';

/**
 * Generate proper User-Agent string following RFC 7231
 * Format: ProductName/Version (Contact) Purpose
 */
export function getUserAgent(): string {
  return `AINewsBot/${PACKAGE_VERSION} (+${REPO_URL}; ${CONTACT_EMAIL}) - AI News Aggregator`;
}

/**
 * Get headers for HTTP requests with User-Agent
 */
export function getSecureHeaders(options?: {
  accept?: string;
  referer?: string;
}): HeadersInit {
  return {
    'User-Agent': getUserAgent(),
    'Accept': options?.accept || 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9,es;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'DNT': '1', // Do Not Track
    'Connection': 'keep-alive',
    ...(options?.referer ? { 'Referer': options.referer } : {}),
  };
}

// ============================================================================
// ROBOTS.TXT HANDLING
// ============================================================================

interface RobotsTxt {
  userAgent: string;
  disallow: string[];
  allow: string[];
  crawlDelay?: number;
  sitemap?: string[];
}

const robotsCache = new Map<string, { data: RobotsTxt; timestamp: number }>();
const ROBOTS_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Fetch and parse robots.txt
 */
export async function fetchRobotsTxt(domain: string): Promise<RobotsTxt | null> {
  // Check cache
  const cached = robotsCache.get(domain);
  if (cached && Date.now() - cached.timestamp < ROBOTS_CACHE_TTL) {
    return cached.data;
  }

  try {
    const robotsUrl = `https://${domain}/robots.txt`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUTS.GET_FAST);

    const response = await fetch(robotsUrl, {
      signal: controller.signal,
      headers: getSecureHeaders(),
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      // No robots.txt = allow all
      return null;
    }

    const text = await response.text();
    const parsed = parseRobotsTxt(text);

    // Cache result
    robotsCache.set(domain, { data: parsed, timestamp: Date.now() });

    return parsed;
  } catch {
    // On error, assume no restrictions
    return null;
  }
}

/**
 * Parse robots.txt content
 */
function parseRobotsTxt(content: string): RobotsTxt {
  const lines = content.split('\n').map(l => l.trim());
  const result: RobotsTxt = {
    userAgent: '*',
    disallow: [],
    allow: [],
    sitemap: [],
  };

  let currentUserAgent = '*';
  let isOurBot = false;

  for (const line of lines) {
    // Skip comments and empty lines
    if (!line || line.startsWith('#')) continue;

    const [key, ...valueParts] = line.split(':');
    const value = valueParts.join(':').trim();

    const lowerKey = key.toLowerCase().trim();

    if (lowerKey === 'user-agent') {
      currentUserAgent = value;
      isOurBot = value === '*' || value.toLowerCase().includes('ainewsbot');
    } else if (isOurBot || currentUserAgent === '*') {
      if (lowerKey === 'disallow' && value) {
        result.disallow.push(value);
      } else if (lowerKey === 'allow' && value) {
        result.allow.push(value);
      } else if (lowerKey === 'crawl-delay' && value) {
        result.crawlDelay = parseInt(value, 10);
      } else if (lowerKey === 'sitemap' && value) {
        result.sitemap?.push(value);
      }
    }
  }

  return result;
}

/**
 * Check if URL is allowed by robots.txt
 */
export async function isAllowedByRobots(url: string): Promise<boolean> {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    const path = urlObj.pathname + urlObj.search;

    const robots = await fetchRobotsTxt(domain);
    if (!robots) return true; // No robots.txt = allow all

    // Check disallow rules
    for (const rule of robots.disallow) {
      if (rule === '/') return false; // Disallow all
      if (path.startsWith(rule)) {
        // Check if explicitly allowed
        for (const allowRule of robots.allow) {
          if (path.startsWith(allowRule)) return true;
        }
        return false;
      }
    }

    return true;
  } catch {
    // On error, allow (don't block legitimate content)
    return true;
  }
}

/**
 * Get crawl delay for domain
 */
export async function getCrawlDelay(domain: string): Promise<number> {
  const robots = await fetchRobotsTxt(domain);
  return robots?.crawlDelay || 1; // Default 1 second between requests
}

// ============================================================================
// SECURE FETCH WITH TIMEOUT
// ============================================================================

export interface SecureFetchOptions extends RequestInit {
  timeout?: number;
  respectRobots?: boolean;
  retries?: number;
}

/**
 * Fetch with timeout, User-Agent, and robots.txt respect
 */
export async function secureFetch(
  url: string,
  options: SecureFetchOptions = {}
): Promise<Response> {
  const {
    timeout = TIMEOUTS.GET_FAST,
    respectRobots = true,
    retries = 0,
    ...fetchOptions
  } = options;

  // Check robots.txt
  if (respectRobots) {
    const allowed = await isAllowedByRobots(url);
    if (!allowed) {
      throw new Error(`Blocked by robots.txt: ${url}`);
    }
  }

  // Setup timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
      headers: {
        ...getSecureHeaders(),
        ...fetchOptions.headers,
      },
    });

    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);

    // Retry on network errors
    if (retries > 0 && error instanceof Error) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return secureFetch(url, { ...options, retries: retries - 1 });
    }

    throw error;
  }
}

/**
 * Secure HEAD request (5s timeout)
 */
export async function secureHead(url: string): Promise<Response> {
  return secureFetch(url, {
    method: 'HEAD',
    timeout: TIMEOUTS.HEAD,
  });
}

/**
 * Secure GET request with configurable timeout
 */
export async function secureGet(
  url: string,
  options: { fast?: boolean; respectRobots?: boolean } = {}
): Promise<Response> {
  const timeout = options.fast ? TIMEOUTS.GET_FAST : TIMEOUTS.GET_SLOW;
  return secureFetch(url, {
    method: 'GET',
    timeout,
    respectRobots: options.respectRobots,
  });
}

// ============================================================================
// REQUEST VALIDATION
// ============================================================================

const BLOCKED_PATTERNS = [
  /localhost/i,
  /127\.0\.0\.1/,
  /192\.168\./,
  /10\./,
  /172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /\.local$/i,
  /\.internal$/i,
];

/**
 * Validate URL is safe to fetch (no SSRF)
 */
export function validateUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);

    // Only allow HTTP/HTTPS
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return false;
    }

    // Block internal/private IPs
    for (const pattern of BLOCKED_PATTERNS) {
      if (pattern.test(urlObj.hostname)) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Sanitize URL for logging/display
 */
export function sanitizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    // Remove query params that might contain sensitive data
    const sensitiveParams = ['token', 'key', 'password', 'secret', 'api_key'];
    
    for (const param of sensitiveParams) {
      if (urlObj.searchParams.has(param)) {
        urlObj.searchParams.set(param, '[REDACTED]');
      }
    }

    return urlObj.toString();
  } catch {
    return '[INVALID URL]';
  }
}

// ============================================================================
// RATE LIMITING
// ============================================================================

const requestCounts = new Map<string, { count: number; resetAt: number }>();

/**
 * Check if rate limit exceeded for domain
 */
export function checkRateLimit(
  domain: string,
  maxRequests: number = 10,
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const entry = requestCounts.get(domain);

  if (!entry || now > entry.resetAt) {
    // Reset window
    requestCounts.set(domain, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= maxRequests) {
    return false; // Rate limit exceeded
  }

  entry.count++;
  return true;
}

/**
 * Clean up expired rate limit entries (call periodically)
 */
export function cleanupRateLimits(): void {
  const now = Date.now();
  for (const [domain, entry] of requestCounts.entries()) {
    if (now > entry.resetAt) {
      requestCounts.delete(domain);
    }
  }
}
