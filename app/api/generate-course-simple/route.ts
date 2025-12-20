/**
 * Backward-compatible alias for the canonical course generator.
 *
 * The app historically used `/api/generate-course-simple` from some UI paths.
 * We now route all generation through `/api/courses/generate-full` so every
 * course is created with the same textbook-quality pipeline.
 */

export { POST, dynamic, maxDuration } from '@/app/api/courses/generate-full/route';

