/**
 * Alternative course generation endpoint
 * Uses a different URL path to avoid Vercel rate limiting on /api/courses/generate
 * 
 * POST /api/ai/generate-course
 * Body: { topic, difficulty, duration, locale }
 * 
 * This endpoint is identical to /api/courses/generate but on a different path.
 * By distributing requests across multiple endpoints, we can avoid hitting
 * Vercel's per-endpoint rate limits.
 */

// Re-export the POST handler from the courses endpoint
export { POST } from '@/app/api/courses/generate/route';
