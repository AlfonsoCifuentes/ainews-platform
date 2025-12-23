/**
 * Fallback Images System for News Articles
 * 
 * Provides random fallback images for articles without images,
 * ensuring no visual repetition in nearby positions.
 */

// This will be populated after running upload-fallback-images.ts
// For now, we'll fetch from Supabase storage dynamically
const BUCKET_NAME = 'news-fallback-images';

// Cache for fallback image URLs
let cachedFallbackImages: string[] | null = null;

/**
 * Get the list of available fallback images from Supabase Storage
 */
export async function getFallbackImageList(): Promise<string[]> {
	if (cachedFallbackImages) {
		return cachedFallbackImages;
	}

	try {
		// Try to load from static JSON first (faster)
		const staticList = await import('./fallback-images-list.json')
			.then((m) => m.default as string[])
			.catch(() => null);

		if (staticList && staticList.length > 0) {
			cachedFallbackImages = staticList;
			return staticList;
		}
	} catch {
		// Fall through to dynamic fetch
	}

	// Fallback: fetch from Supabase storage
	const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
	if (!baseUrl) {
		console.warn('NEXT_PUBLIC_SUPABASE_URL not set');
		return [];
	}

	try {
		const response = await fetch(
			`${baseUrl}/storage/v1/object/list/${BUCKET_NAME}`,
			{
				headers: {
					Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
				},
			}
		);

		if (!response.ok) {
			return [];
		}

		const files = await response.json();
		cachedFallbackImages = files
			.filter((f: { name: string }) => f.name.endsWith('.webp'))
			.map((f: { name: string }) => 
				`${baseUrl}/storage/v1/object/public/${BUCKET_NAME}/${f.name}`
			);

		return cachedFallbackImages || [];
	} catch {
		return [];
	}
}

/**
 * Seeded random number generator for consistent results
 * Uses article ID as seed to ensure same article always gets same image
 */
function seededRandom(seed: string): number {
	let hash = 0;
	for (let i = 0; i < seed.length; i++) {
		const char = seed.charCodeAt(i);
		hash = ((hash << 5) - hash) + char;
		hash = hash & hash; // Convert to 32bit integer
	}
	// Convert to positive number between 0 and 1
	return Math.abs(hash % 1000000) / 1000000;
}

/**
 * Get a fallback image for an article, ensuring no nearby duplicates
 * 
 * @param articleId - The article's unique ID (used as seed for consistent selection)
 * @param position - Position in the news grid (0-indexed)
 * @param usedImages - Set of image URLs already used in nearby positions
 * @param fallbackImages - List of available fallback image URLs
 * @returns The selected fallback image URL
 */
export function selectFallbackImage(
	articleId: string,
	position: number,
	usedImages: Set<string>,
	fallbackImages: string[]
): string {
	if (fallbackImages.length === 0) {
		// Ultimate fallback - return a placeholder
		return '/images/news-placeholder.webp';
	}

	// Use article ID as seed for consistent selection
	const baseIndex = Math.floor(seededRandom(articleId) * fallbackImages.length);
	
	// Try to find an image not recently used (within 5 positions)
	const recentlyUsed = new Set(usedImages);
	
	for (let offset = 0; offset < fallbackImages.length; offset++) {
		const index = (baseIndex + offset) % fallbackImages.length;
		const candidate = fallbackImages[index];
		
		if (!recentlyUsed.has(candidate)) {
			return candidate;
		}
	}
	
	// If all images are used (very unlikely with many images), just return the base selection
	return fallbackImages[baseIndex];
}

/**
 * Process a list of articles and assign fallback images where needed
 * Ensures no duplicate images appear within a sliding window
 * 
 * @param articles - Array of articles with optional image_url
 * @param fallbackImages - List of available fallback image URLs
 * @param windowSize - Number of positions to check for duplicates (default 5)
 * @returns Articles with fallback_image_url added where needed
 */
export function assignFallbackImages<T extends { id: string; image_url?: string | null }>(
	articles: T[],
	fallbackImages: string[],
	windowSize = 5
): (T & { fallback_image_url?: string })[] {
	const result: (T & { fallback_image_url?: string })[] = [];
	const recentImages: string[] = [];

	for (let i = 0; i < articles.length; i++) {
		const article = articles[i];
		
		if (article.image_url) {
			// Article has its own image
			result.push({ ...article });
			recentImages.push(article.image_url);
		} else {
			// Need fallback image
			const usedInWindow = new Set(recentImages.slice(-windowSize));
			const fallbackUrl = selectFallbackImage(
				article.id,
				i,
				usedInWindow,
				fallbackImages
			);
			
			result.push({ 
				...article, 
				fallback_image_url: fallbackUrl 
			});
			recentImages.push(fallbackUrl);
		}

		// Keep only recent images in memory
		if (recentImages.length > windowSize * 2) {
			recentImages.shift();
		}
	}

	return result;
}

/**
 * Get the display image URL for an article
 * Returns the article's own image if available, otherwise the fallback
 */
export function getArticleImageUrl(article: {
	image_url?: string | null;
	fallback_image_url?: string;
}): string {
	return article.image_url || article.fallback_image_url || '/images/news-placeholder.webp';
}
