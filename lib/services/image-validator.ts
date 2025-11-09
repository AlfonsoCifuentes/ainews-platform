/**
 * Image Validation and Deduplication Service
 * 
 * Validates images for:
 * - Uniqueness (no duplicates)
 * - Validity (accessible, correct format)
 * - Size (minimum dimensions)
 * - Content (not placeholder, logo, or avatar)
 * - AI Computer Vision verification (Hugging Face BLIP)
 */

import crypto from 'crypto';
import { getSupabaseServerClient } from '../db/supabase';
import { validateUrlForSSRFSync } from '../utils/ssrf-protection';
import { imageUrlCache, domainCache } from '../utils/url-cache';
import { estimateDimensionsFromUrl, getOrientationInfo, type OrientationInfo } from './image-orientation';
import { ultralyticsVision } from './ultralytics-vision';
import { visualSimilarity } from './visual-similarity';

// Computer Vision API configuration
const VISION_API_URL = 'https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-base';
const VISION_ENABLED = !!process.env.HUGGINGFACE_API_KEY;

const IMAGE_EXTENSION_TO_MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
  '.bmp': 'image/bmp',
};

function guessMimeFromUrl(url: string): string | null {
  try {
    const { pathname } = new URL(url);
    const match = pathname.match(/\.\w+$/);
    if (!match) return null;
    const ext = match[0].toLowerCase();
    return IMAGE_EXTENSION_TO_MIME[ext] || null;
  } catch {
    return null;
  }
}

function buildImageRequestHeaders(url: string): Record<string, string> {
  let referer: string | undefined;
  try {
    const origin = new URL(url).origin;
    referer = `${origin}/`;
  } catch {
    referer = undefined;
  }

  return {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    ...(referer ? { Referer: referer } : {}),
  };
}

interface ImageValidationResult {
  isValid: boolean;
  isDuplicate: boolean;
  hash?: string;
  width?: number;
  height?: number;
  mime?: string;
  bytes?: number;
  blurDataUrl?: string;
  orientation?: OrientationInfo;
  error?: string;
}

// In-memory cache for current session
const imageHashCache = new Set<string>();
let cacheInitialized = false;

/**
 * Generates perceptual hash of image URL for duplicate detection
 * IMPROVED: Only hash the base URL without query parameters to catch true duplicates
 * BUT keep signature/timestamp params to allow same-domain different images
 */
function generateImageHash(url: string): string {
  try {
    const urlObj = new URL(url);
    
    // For Unsplash Source API, include the 'sig' parameter (makes each unique)
    if (urlObj.hostname.includes('source.unsplash.com')) {
      return crypto.createHash('md5').update(url).digest('hex'); // Include full URL with sig
    }
    
    // For regular URLs, remove cache-busting params but keep meaningful ones
    const meaningfulParams = ['id', 'image_id', 'photo_id', 'media_id'];
    const searchParams = new URLSearchParams(urlObj.search);
    const filtered = new URLSearchParams();
    
    meaningfulParams.forEach(param => {
      const value = searchParams.get(param);
      if (value) filtered.set(param, value);
    });
    
    const cleanUrl = `${urlObj.origin}${urlObj.pathname}${filtered.toString() ? '?' + filtered.toString() : ''}`;
    return crypto.createHash('md5').update(cleanUrl).digest('hex');
  } catch {
    // Fallback if URL parsing fails
    const cleanUrl = url.split('?')[0];
    return crypto.createHash('md5').update(cleanUrl).digest('hex');
  }
}

/**
 * Initializes the image hash cache from existing articles
 */
/**
 * Initialize the image hash cache by loading all existing article images from the database.
 * MUST be called before using any validation functions.
 */
export async function initializeImageHashCache(): Promise<void> {
  if (cacheInitialized) return;

  try {
    const db = getSupabaseServerClient();
    
    // Get all existing image URLs
    const { data: articles } = await db
      .from('news_articles')
      .select('image_url')
      .not('image_url', 'is', null);

    if (articles) {
      articles.forEach((article) => {
        if (article.image_url) {
          const hash = generateImageHash(article.image_url);
          imageHashCache.add(hash);
        }
      });
    }

    cacheInitialized = true;
    console.log(`[ImageValidator] Cache initialized with ${imageHashCache.size} existing images`);
  } catch (error) {
    console.error('[ImageValidator] Failed to initialize cache:', error);
  }
}

/**
 * Checks if image URL is already used in another article
 */
function isDuplicateImage(url: string): boolean {
  const hash = generateImageHash(url);
  return imageHashCache.has(hash);
}

/**
 * Validates image URL and captures metadata
 */
async function validateImageUrl(url: string): Promise<ImageValidationResult> {
  // Check cache first (avoid duplicate HEAD requests)
  const cached = imageUrlCache.get(url) as ImageValidationResult | null;
  if (cached) {
    console.log(`[ImageValidator] Cache hit for: ${url}`);
    return cached;
  }

  // SSRF Protection: Validate image URL before fetching
  const urlValidation = validateUrlForSSRFSync(url);
  if (!urlValidation.valid) {
    console.warn(`[ImageValidator] SSRF blocked: ${urlValidation.reason}`);
    const result = {
      isValid: false,
      isDuplicate: false,
      error: `SSRF protection: ${urlValidation.reason}`
    };
    imageUrlCache.set(url, result);
    return result;
  }

  // Check for duplicate first (fast)
  if (isDuplicateImage(url)) {
    const result = {
      isValid: false,
      isDuplicate: true,
      hash: generateImageHash(url),
      error: 'Image already used in another article'
    };
    imageUrlCache.set(url, result);
    return result;
  }

  try {
    // Track domain usage
    domainCache.visit(url);

    const requestHeaders = buildImageRequestHeaders(url);

    // Fetch image headers to check validity
    let response = await fetch(url, {
      method: 'HEAD',
      headers: requestHeaders,
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });

    // Some servers reject HEAD requests; fallback to lightweight GET
    if (!response.ok && (response.status === 403 || response.status === 405)) {
      response = await fetch(url, {
        method: 'GET',
        headers: {
          ...requestHeaders,
          Range: 'bytes=0-65535'
        },
        signal: AbortSignal.timeout(5000)
      });
    }

    if (!response.ok) {
      return {
        isValid: false,
        isDuplicate: false,
        error: `HTTP ${response.status}`
      };
    }

    const contentTypeHeader = response.headers.get('content-type');
    const normalizedContentType = contentTypeHeader
      ? contentTypeHeader.split(';')[0].trim().toLowerCase()
      : null;
    const guessedMime = guessMimeFromUrl(url);
    const resolvedMime = normalizedContentType || guessedMime;
    const contentLength = parseInt(response.headers.get('content-length') || '0');

    // Validate content type
    if (!resolvedMime || !resolvedMime.startsWith('image/')) {
      const invalidType = normalizedContentType || guessedMime || 'unknown';
      return {
        isValid: false,
        isDuplicate: false,
        error: `Invalid content type: ${invalidType}`
      };
    }

    // Check minimum size (at least 5KB to avoid tiny placeholders)
    if (contentLength > 0 && contentLength < 5000) {
      return {
        isValid: false,
        isDuplicate: false,
        error: 'Image too small (likely placeholder)'
      };
    }

    // Check maximum size (avoid huge files)
    if (contentLength > 10000000) { // 10MB
      return {
        isValid: false,
        isDuplicate: false,
        error: 'Image too large'
      };
    }

    // Try to get image dimensions (optional, may require GET for some images)
    let width: number | undefined;
    let height: number | undefined;
    let blurDataUrl: string | undefined;
    let orientation: OrientationInfo | undefined;

    // Try to estimate dimensions from URL patterns (e.g., /1200x630/)
    const estimatedDimensions = estimateDimensionsFromUrl(url);
    if (estimatedDimensions) {
      width = estimatedDimensions.aspectRatio > 1 
        ? Math.round(1200) 
        : Math.round(1200 / estimatedDimensions.aspectRatio);
      height = Math.round(width / estimatedDimensions.aspectRatio);
      orientation = estimatedDimensions;
      console.log(`[ImageValidator] Estimated dimensions from URL: ${width}x${height} (${orientation.orientation})`);
    }

    // Calculate orientation info if we don't have it yet but have dimensions
    if (!orientation && width && height) {
      orientation = getOrientationInfo(width, height);
    }

    // For supported formats, try to generate LQIP
    // Note: Full implementation would need sharp/jimp in server environment
    // For now, we'll capture what we can from headers
    // LQIP generation will be done in a separate enhancement with proper image processing

    const result = {
      isValid: true,
      isDuplicate: false,
      hash: generateImageHash(url),
      width,
      height,
      mime: resolvedMime,
      bytes: contentLength > 0 ? contentLength : undefined,
      blurDataUrl, // Will be undefined until we implement image processing
      orientation
    };

    // Cache successful result
    imageUrlCache.set(url, result);

    return result;

  } catch (error) {
    const result = {
      isValid: false,
      isDuplicate: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };

    // Cache error result to avoid retrying failed URLs
    imageUrlCache.set(url, result);

    return result;
  }
}

/**
 * Blacklist patterns for images we want to avoid
 */
const IMAGE_BLACKLIST_PATTERNS = [
  /avatar/i,
  /icon/i,
  /logo/i,
  /1x1/i,
  /pixel/i,
  /transparent/i,
  /placeholder/i,
  /gravatar/i,
  /profile/i,
  /default[-_]?image/i,
  /no[-_]?image/i,
  /coming[-_]?soon/i,
  /\.svg$/i, // Avoid SVGs as they're often logos
];

/**
 * Checks if URL matches blacklist patterns
 */
function isBlacklistedImage(url: string): boolean {
  return IMAGE_BLACKLIST_PATTERNS.some(pattern => pattern.test(url));
}

/**
 * Registers a new image hash in cache
 */
function registerImageHash(url: string): void {
  const hash = generateImageHash(url);
  imageHashCache.add(hash);
}

/**
 * Main validation function
 */
export async function validateAndRegisterImage(
  url: string | null,
  skipDuplicateCheck = false
): Promise<ImageValidationResult> {
  // Initialize cache on first use
  await initializeImageHashCache();

  if (!url) {
    return {
      isValid: false,
      isDuplicate: false,
      error: 'No image URL provided'
    };
  }

  // Check blacklist
  if (isBlacklistedImage(url)) {
    return {
      isValid: false,
      isDuplicate: false,
      error: 'Image matches blacklist pattern'
    };
  }

  // Validate URL format
  try {
    new URL(url);
  } catch {
    return {
      isValid: false,
      isDuplicate: false,
      error: 'Invalid URL format'
    };
  }

  // Skip duplicate check if requested (for testing)
  if (skipDuplicateCheck) {
    const result = await validateImageUrl(url);
    if (result.isValid && result.hash) {
      registerImageHash(url);
    }
    return result;
  }

  // Full validation
  const result = await validateImageUrl(url);
  
  // Register if valid
  if (result.isValid && result.hash) {
    registerImageHash(url);
  }

  return result;
}

/**
 * Clears the image cache (for testing)
 */
export function clearImageCache(): void {
  imageHashCache.clear();
  cacheInitialized = false;
}

/**
 * Gets cache stats
 */
export function getImageCacheStats() {
  return {
    size: imageHashCache.size,
    initialized: cacheInitialized
  };
}

/**
 * 🤖 AI Computer Vision Validation
 * Verifies image with Hugging Face BLIP model
 */
export async function verifyImageWithAI(imageUrl: string): Promise<{
  isValid: boolean;
  confidence: number;
  caption?: string;
  error?: string;
}> {
  if (!VISION_ENABLED) {
    return {
      isValid: true,
      confidence: 50,
      error: 'Vision API not configured (missing HUGGINGFACE_API_KEY)'
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    const response = await fetch(VISION_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: imageUrl
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        isValid: false,
        confidence: 0,
        error: `Vision API error: ${response.status} ${response.statusText}`
      };
    }

    const result = await response.json();
    
    // BLIP returns: [{ generated_text: "a photo of..." }]
    if (result && result[0]?.generated_text) {
      const caption = result[0].generated_text;
      
      // Check if caption indicates a real image (not placeholder/error)
      const invalidPatterns = [
        /404/i,
        /not found/i,
        /error/i,
        /placeholder/i,
        /broken/i
      ];
      
      const isValidImage = !invalidPatterns.some(pattern => pattern.test(caption));
      
      return {
        isValid: isValidImage,
        confidence: isValidImage ? 95 : 20,
        caption
      };
    }

    return {
      isValid: false,
      confidence: 0,
      error: 'No caption generated by AI'
    };

  } catch (error) {
    return {
      isValid: true, // Don't block on AI failure
      confidence: 50,
      error: error instanceof Error ? error.message : 'AI verification failed'
    };
  }
}

/**
 * 🔍 Enhanced image validation with AI and Visual Similarity
 * Combines existing validation + Computer Vision + Visual Similarity Detection
 */
export async function validateImageEnhanced(imageUrl: string, options?: {
  skipAI?: boolean;
  skipComputerVision?: boolean;
  skipVisualSimilarity?: boolean;
  skipCache?: boolean;
}): Promise<{
  isValid: boolean;
  reason?: string;
  aiVerified?: boolean;
  aiCaption?: string;
  cvVerified?: boolean;
  cvAnalysis?: string;
  detectedObjects?: string[];
  visualSimilarity?: {
    isDuplicate: boolean;
    isSimilar: boolean;
    mostSimilar?: {
      imageUrl: string;
      hammingDistance: number;
      similarity: number;
    };
    hash: string;
  };
  hash?: string;
  width?: number;
  height?: number;
  mime?: string;
  bytes?: number;
}> {
  // Step 1: Standard validation
  const basicValidation = await validateAndRegisterImage(imageUrl, options?.skipCache);

  if (!basicValidation.isValid) {
    return {
      isValid: false,
      reason: basicValidation.error || 'Failed basic validation',
      aiVerified: false,
      cvVerified: false
    };
  }

  let aiVerified = false;
  let aiCaption: string | undefined;
  let cvVerified = false;
  let cvAnalysis: string | undefined;
  let detectedObjects: string[] | undefined;
  let visualSimilarityResult: {
    isDuplicate: boolean;
    isSimilar: boolean;
    mostSimilar?: {
      imageUrl: string;
      hammingDistance: number;
      similarity: number;
    };
    hash: string;
  } | undefined;

  // Step 2: Visual Similarity Check (optional)
  if (!options?.skipVisualSimilarity) {
    try {
      const similarityCheck = await visualSimilarity.checkSimilarity(imageUrl, {
        duplicateThreshold: 0,  // Exact duplicates only
        similarThreshold: 5,    // Very similar images
        maxResults: 3
      });
      visualSimilarityResult = similarityCheck;

      // If image is a duplicate, mark as invalid
      if (similarityCheck.isDuplicate) {
        return {
          isValid: false,
          reason: `Duplicate image detected (similar to: ${similarityCheck.mostSimilar?.imageUrl})`,
          aiVerified: false,
          cvVerified: false,
          visualSimilarity: similarityCheck,
          hash: basicValidation.hash,
          width: basicValidation.width,
          height: basicValidation.height,
          mime: basicValidation.mime,
          bytes: basicValidation.bytes
        };
      }

      // Log similar images for manual review
      if (similarityCheck.isSimilar && similarityCheck.mostSimilar) {
        console.warn(`[ImageValidator] Similar image detected: ${imageUrl} similar to ${similarityCheck.mostSimilar.imageUrl} (distance: ${similarityCheck.mostSimilar.hammingDistance})`);
      }

    } catch (error) {
      console.error('[ImageValidator] Visual similarity check failed:', error);
      // Don't block validation on similarity check failure
    }
  }

  // Step 3: AI verification with Hugging Face BLIP (optional)
  if (!options?.skipAI && VISION_ENABLED) {
    const aiValidation = await verifyImageWithAI(imageUrl);
    aiVerified = aiValidation.isValid;
    aiCaption = aiValidation.caption;
  }

  // Step 3: Computer Vision verification with Ultralytics (optional)
  if (!options?.skipComputerVision && ultralyticsVision.isAvailable()) {
    const cvValidation = await ultralyticsVision.analyzeImage(imageUrl);
    cvVerified = cvValidation.isValid;
    cvAnalysis = cvValidation.reasoning;
    detectedObjects = cvValidation.detectedObjects;

    // If computer vision rejects the image, mark as invalid
    if (!cvValidation.isValid) {
      return {
        isValid: false,
        reason: `Computer vision rejected: ${cvValidation.reasoning}`,
        aiVerified,
        aiCaption,
        cvVerified: false,
        cvAnalysis,
        detectedObjects,
        hash: basicValidation.hash,
        width: basicValidation.width,
        height: basicValidation.height,
        mime: basicValidation.mime,
        bytes: basicValidation.bytes
      };
    }
  }

  // Overall validation: basic validation must pass, and if AI/CV are enabled, they should also pass
  const overallValid = basicValidation.isValid &&
    (!VISION_ENABLED || options?.skipAI || aiVerified) &&
    (!ultralyticsVision.isAvailable() || options?.skipComputerVision || cvVerified);

  return {
    isValid: overallValid,
    reason: !overallValid ? 'Failed enhanced validation' : undefined,
    aiVerified,
    aiCaption,
    cvVerified,
    cvAnalysis,
    detectedObjects,
    visualSimilarity: visualSimilarityResult,
    hash: basicValidation.hash,
    width: basicValidation.width,
    height: basicValidation.height,
    mime: basicValidation.mime,
    bytes: basicValidation.bytes
  };
}

