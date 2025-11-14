/**
 * Alternative course generation endpoint
 * Uses a different URL path to avoid Vercel rate limiting on /api/courses/generate
 * 
 * POST /api/ai/generate-course
 * Body: { topic, difficulty, duration, locale }
 * 
 * This is identical to /api/courses/generate but on a different path
 */

// Re-export everything from the original endpoint
export { POST } from '@/app/api/courses/generate/route';
