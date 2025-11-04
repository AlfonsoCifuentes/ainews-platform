/**
 * Image Orientation Detection
 * Phase 5.1 - Category B: Advanced Scraping
 * 
 * Detects and scores image orientation (portrait/landscape/square)
 * to prefer landscape images for news articles (better UX)
 */

export type ImageOrientation = 'landscape' | 'portrait' | 'square' | 'unknown';

export interface OrientationInfo {
  orientation: ImageOrientation;
  aspectRatio: number;
  score: number; // 0-100, higher is better for news articles
}

/**
 * Detect orientation from width and height
 */
export function detectOrientation(width: number, height: number): ImageOrientation {
  if (width === 0 || height === 0) {
    return 'unknown';
  }

  const aspectRatio = width / height;

  // Thresholds for orientation detection
  const SQUARE_THRESHOLD = 0.05; // Within 5% of 1:1 is considered square

  if (Math.abs(aspectRatio - 1) < SQUARE_THRESHOLD) {
    return 'square';
  } else if (aspectRatio > 1) {
    return 'landscape';
  } else {
    return 'portrait';
  }
}

/**
 * Calculate orientation score (0-100)
 * Higher scores for better news article images
 * 
 * Scoring Rules:
 * - Landscape 16:9 (1.78): 100 points (ideal for news)
 * - Landscape 3:2 (1.5): 95 points (good for news)
 * - Landscape 4:3 (1.33): 85 points (acceptable)
 * - Square 1:1 (1.0): 60 points (less ideal but usable)
 * - Portrait 2:3 (0.67): 40 points (poor for news headers)
 * - Portrait 9:16 (0.56): 20 points (very poor for news headers)
 */
export function calculateOrientationScore(width: number, height: number): number {
  if (width === 0 || height === 0) {
    return 0;
  }

  const aspectRatio = width / height;

  // Ideal aspect ratios for news articles
  const IDEAL_RATIOS = [
    { ratio: 16 / 9, score: 100 },  // 1.78 - Modern news standard
    { ratio: 3 / 2, score: 95 },    // 1.5 - Classic photography
    { ratio: 4 / 3, score: 85 },    // 1.33 - Traditional
    { ratio: 1 / 1, score: 60 },    // 1.0 - Square (social media)
    { ratio: 2 / 3, score: 40 },    // 0.67 - Portrait
    { ratio: 9 / 16, score: 20 }    // 0.56 - Vertical video
  ];

  // Find closest ideal ratio
  let closestScore = 0;
  let minDiff = Infinity;

  for (const ideal of IDEAL_RATIOS) {
    const diff = Math.abs(aspectRatio - ideal.ratio);
    if (diff < minDiff) {
      minDiff = diff;
      closestScore = ideal.score;
    }
  }

  // Penalize extreme aspect ratios
  if (aspectRatio > 3) {
    closestScore = Math.max(10, closestScore - 30); // Very wide (banners)
  } else if (aspectRatio < 0.4) {
    closestScore = Math.max(5, closestScore - 40); // Very tall (mobile screenshots)
  }

  return closestScore;
}

/**
 * Get complete orientation info
 */
export function getOrientationInfo(width: number, height: number): OrientationInfo {
  const orientation = detectOrientation(width, height);
  const aspectRatio = width > 0 && height > 0 ? width / height : 0;
  const score = calculateOrientationScore(width, height);

  return {
    orientation,
    aspectRatio,
    score
  };
}

/**
 * Parse dimensions from common image dimension patterns
 * Used when dimensions are in URL or filename
 */
export function parseDimensionsFromUrl(url: string): { width: number; height: number } | null {
  // Common patterns:
  // - /1200x630/ or _1200x630
  // - /w1200-h630/
  // - /1200w-630h/
  // - .1200x630.jpg
  
  const patterns = [
    /[\/_](\d{3,5})x(\d{3,5})[\/_\.]/i,       // /1200x630/ or _1200x630.
    /[\/_]w(\d{3,5})-?h(\d{3,5})[\/_]/i,      // /w1200-h630/
    /[\/_](\d{3,5})w-?(\d{3,5})h[\/_]/i,      // /1200w-630h/
    /\.(\d{3,5})x(\d{3,5})\.\w+$/i            // .1200x630.jpg
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      const width = parseInt(match[1], 10);
      const height = parseInt(match[2], 10);
      
      // Sanity check (reasonable dimensions)
      if (width >= 100 && width <= 10000 && height >= 100 && height <= 10000) {
        return { width, height };
      }
    }
  }

  return null;
}

/**
 * Estimate dimensions from URL if not available from headers
 */
export function estimateDimensionsFromUrl(url: string): OrientationInfo | null {
  const parsed = parseDimensionsFromUrl(url);
  if (!parsed) {
    return null;
  }

  return getOrientationInfo(parsed.width, parsed.height);
}

/**
 * Compare two images by orientation score
 * Returns -1 if a is better, 1 if b is better, 0 if equal
 */
export function compareByOrientation(
  a: { width?: number; height?: number },
  b: { width?: number; height?: number }
): number {
  const scoreA = calculateOrientationScore(a.width || 0, a.height || 0);
  const scoreB = calculateOrientationScore(b.width || 0, b.height || 0);

  if (scoreA > scoreB) return -1;
  if (scoreA < scoreB) return 1;
  return 0;
}

/**
 * Check if image has acceptable orientation for news
 */
export function hasAcceptableOrientation(width: number, height: number): boolean {
  const score = calculateOrientationScore(width, height);
  return score >= 50; // Minimum score for acceptable orientation
}

/**
 * Get orientation label for display
 */
export function getOrientationLabel(orientation: ImageOrientation): string {
  const labels: Record<ImageOrientation, string> = {
    landscape: '🖼️ Landscape',
    portrait: '📱 Portrait',
    square: '⬛ Square',
    unknown: '❓ Unknown'
  };

  return labels[orientation];
}
