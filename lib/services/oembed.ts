/**
 * oEmbed API Integration
 * Phase 5.1 - Category B: Advanced Scraping
 * 
 * Extracts high-quality images from social media embeds
 * using official oEmbed APIs (Twitter, Instagram, YouTube, Vimeo, etc.)
 */

export interface OEmbedResponse {
  type: 'photo' | 'video' | 'link' | 'rich';
  version: string;
  title?: string;
  author_name?: string;
  author_url?: string;
  provider_name?: string;
  provider_url?: string;
  cache_age?: number;
  thumbnail_url?: string;
  thumbnail_width?: number;
  thumbnail_height?: number;
  url?: string;
  width?: number;
  height?: number;
  html?: string;
}

interface OEmbedProvider {
  name: string;
  domain: string;
  endpoint: string;
  urlPattern: RegExp;
}

/**
 * Supported oEmbed providers
 * All use free public APIs (no authentication required)
 */
const OEMBED_PROVIDERS: OEmbedProvider[] = [
  {
    name: 'Twitter/X',
    domain: 'twitter.com',
    endpoint: 'https://publish.twitter.com/oembed',
    urlPattern: /https?:\/\/(www\.)?(twitter\.com|x\.com)\/\w+\/status\/\d+/gi
  },
  {
    name: 'YouTube',
    domain: 'youtube.com',
    endpoint: 'https://www.youtube.com/oembed',
    urlPattern: /https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+/gi
  },
  {
    name: 'Vimeo',
    domain: 'vimeo.com',
    endpoint: 'https://vimeo.com/api/oembed.json',
    urlPattern: /https?:\/\/(www\.|player\.)?vimeo\.com\/(video\/)?(\d+)/gi
  },
  {
    name: 'Flickr',
    domain: 'flickr.com',
    endpoint: 'https://www.flickr.com/services/oembed/',
    urlPattern: /https?:\/\/(www\.)?flickr\.com\/photos\/[\w@]+\/\d+/gi
  },
  {
    name: 'Reddit',
    domain: 'reddit.com',
    endpoint: 'https://www.reddit.com/oembed',
    urlPattern: /https?:\/\/(www\.)?reddit\.com\/r\/\w+\/comments\/[\w]+/gi
  }
];

/**
 * Detect if URL is an oEmbed-supported embed
 */
export function isOEmbedUrl(url: string): boolean {
  return OEMBED_PROVIDERS.some(provider => {
    provider.urlPattern.lastIndex = 0; // Reset regex state
    return provider.urlPattern.test(url);
  });
}

/**
 * Get oEmbed provider for a given URL
 */
function getOEmbedProvider(url: string): OEmbedProvider | null {
  for (const provider of OEMBED_PROVIDERS) {
    provider.urlPattern.lastIndex = 0; // Reset regex state
    if (provider.urlPattern.test(url)) {
      return provider;
    }
  }
  return null;
}

/**
 * Fetch oEmbed data for a URL
 */
export async function fetchOEmbed(url: string): Promise<OEmbedResponse | null> {
  const provider = getOEmbedProvider(url);
  if (!provider) {
    return null;
  }

  try {
    console.log(`[oEmbed] Fetching from ${provider.name}: ${url.slice(0, 60)}...`);

    const oembedUrl = new URL(provider.endpoint);
    oembedUrl.searchParams.set('url', url);
    oembedUrl.searchParams.set('format', 'json');
    
    // Add provider-specific parameters
    if (provider.name === 'Twitter/X') {
      oembedUrl.searchParams.set('omit_script', 'true');
    }

    const response = await fetch(oembedUrl.toString(), {
      headers: {
        'User-Agent': 'ThotNetCore/1.0 (https://thotnet-core.vercel.app)',
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });

    if (!response.ok) {
      console.warn(`[oEmbed] HTTP ${response.status} for ${provider.name}`);
      return null;
    }

    const data = await response.json() as OEmbedResponse;
    console.log(`[oEmbed] ✓ Got ${data.type} from ${provider.name}`);

    return data;

  } catch (error) {
    console.error(`[oEmbed] Error fetching ${url}:`, error);
    return null;
  }
}

/**
 * Extract best image URL from oEmbed response
 */
export function extractOEmbedImage(oembed: OEmbedResponse): string | null {
  // Priority 1: Direct photo URL (for photo type)
  if (oembed.type === 'photo' && oembed.url) {
    return oembed.url;
  }

  // Priority 2: Thumbnail URL (for video/rich types)
  if (oembed.thumbnail_url) {
    return oembed.thumbnail_url;
  }

  // Priority 3: Extract from HTML embed (last resort)
  if (oembed.html) {
    const imgMatch = oembed.html.match(/src=["']([^"']+\.(?:jpg|jpeg|png|webp|gif))["']/i);
    if (imgMatch && imgMatch[1]) {
      return imgMatch[1];
    }
  }

  return null;
}

/**
 * Get image from oEmbed URL (main API)
 */
export async function getOEmbedImage(url: string): Promise<{
  imageUrl: string | null;
  width?: number;
  height?: number;
  provider?: string;
  title?: string;
}> {
  if (!isOEmbedUrl(url)) {
    return { imageUrl: null };
  }

  const oembed = await fetchOEmbed(url);
  if (!oembed) {
    return { imageUrl: null };
  }

  const imageUrl = extractOEmbedImage(oembed);

  return {
    imageUrl,
    width: oembed.thumbnail_width || oembed.width,
    height: oembed.thumbnail_height || oembed.height,
    provider: oembed.provider_name,
    title: oembed.title
  };
}

/**
 * Extract oEmbed URLs from article content
 */
export function extractOEmbedUrls(content: string): string[] {
  const urls: string[] = [];

  for (const provider of OEMBED_PROVIDERS) {
    // Reset lastIndex to ensure consistent matching
    provider.urlPattern.lastIndex = 0;
    
    let match;
    while ((match = provider.urlPattern.exec(content)) !== null) {
      urls.push(match[0]);
    }
  }

  return [...new Set(urls)]; // Deduplicate
}

/**
 * Get images from all oEmbed URLs in content
 */
export async function getOEmbedImagesFromContent(content: string): Promise<string[]> {
  const urls = extractOEmbedUrls(content);
  const images: string[] = [];

  for (const url of urls) {
    const result = await getOEmbedImage(url);
    if (result.imageUrl) {
      images.push(result.imageUrl);
      console.log(`[oEmbed] ✓ Extracted image from ${result.provider}: ${result.imageUrl.slice(0, 60)}...`);
    }
  }

  return images;
}
