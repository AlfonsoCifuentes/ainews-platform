/**
 * In-memory rate limiter for API routes.
 * Uses a sliding window counter pattern.
 * 
 * For distributed deployments (multiple Vercel instances),
 * this provides per-instance limiting which is still effective
 * at preventing abuse from a single user.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Periodic cleanup to prevent memory leaks (every 5 minutes)
let cleanupInterval: ReturnType<typeof setInterval> | null = null;

function ensureCleanup() {
  if (cleanupInterval) return;
  cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore) {
      if (now > entry.resetAt) {
        rateLimitStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
  // Don't block process exit
  if (cleanupInterval && typeof cleanupInterval === 'object' && 'unref' in cleanupInterval) {
    cleanupInterval.unref();
  }
}

/**
 * Check if a request is within rate limits.
 * 
 * @param key - Unique identifier for the rate limit bucket (e.g., `llm:${userId}`)
 * @param limit - Maximum number of requests allowed in the window
 * @param windowMs - Time window in milliseconds
 * @returns Object with `allowed` boolean and `remaining` count
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  ensureCleanup();
  
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt };
}

/**
 * Pre-configured rate limit tiers for different route types.
 */
export const RATE_LIMITS = {
  /** LLM text generation: 10 requests per minute */
  LLM_GENERATION: { limit: 10, windowMs: 60_000 },
  /** Image generation: 5 requests per minute */
  IMAGE_GENERATION: { limit: 5, windowMs: 60_000 },
  /** Course generation: 3 requests per 5 minutes */
  COURSE_GENERATION: { limit: 3, windowMs: 5 * 60_000 },
  /** TTS generation: 5 requests per minute */
  TTS_GENERATION: { limit: 5, windowMs: 60_000 },
  /** Search/embeddings: 30 requests per minute */
  SEARCH: { limit: 30, windowMs: 60_000 },
  /** General API: 60 requests per minute */
  GENERAL: { limit: 60, windowMs: 60_000 },
} as const;

/**
 * Extracts a rate limit key from a request.
 * Uses user ID if authenticated, falls back to IP or 'anon'.
 */
export function getRateLimitKey(
  prefix: string,
  userId?: string | null,
  req?: Request
): string {
  if (userId) return `${prefix}:${userId}`;
  
  if (req) {
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'anon';
    return `${prefix}:ip:${ip}`;
  }
  
  return `${prefix}:anon`;
}
