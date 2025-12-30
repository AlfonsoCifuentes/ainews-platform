/**
 * Sistema de generación de imágenes de respaldo para noticias sin imagen
 * Crea gradientes dinámicos con iconos SVG basados en la categoría
 */

export interface FallbackImageConfig {
  title: string;
  category?: string;
  width?: number;
  height?: number;
}

export interface CourseFallbackImageConfig {
  category?: string;
  width?: number;
  height?: number;
}

const categoryGradients: Record<string, { from: string; to: string; icon: string }> = {
  'machine-learning': {
    from: '#2563eb', // Blue
    to: '#0ea5e9', // Cyan
    icon: '🤖',
  },
  'nlp': {
    from: '#3b82f6', // Blue
    to: '#06b6d4', // Cyan
    icon: '💬',
  },
  'computer-vision': {
    from: '#10b981', // Green
    to: '#14b8a6', // Teal
    icon: '👁️',
  },
  'robotics': {
    from: '#f59e0b', // Amber
    to: '#ef4444', // Red
    icon: '🦾',
  },
  'research': {
    from: '#2563eb', // Blue
    to: '#22d3ee', // Cyan
    icon: '🔬',
  },
  'ethics': {
    from: '#ef4444', // Red
    to: '#f97316', // Orange
    icon: '⚖️',
  },
  'industry': {
    from: '#06b6d4', // Cyan
    to: '#3b82f6', // Blue
    icon: '🏭',
  },
  'tools': {
    from: '#14b8a6', // Teal
    to: '#10b981', // Green
    icon: '🛠️',
  },
  'models': {
    from: '#ec4899', // Pink
    to: '#f43f5e', // Rose
    icon: '🧠',
  },
  'default': {
    from: '#2563eb', // Blue
    to: '#0ea5e9', // Cyan
    icon: '✨',
  },
};

/**
 * Genera un SVG de respaldo para artículos sin imagen
 */
export function generateFallbackImageSVG(config: FallbackImageConfig): string {
  const { title, category = 'default', width = 1200, height = 630 } = config;

  const gradient = categoryGradients[category] || categoryGradients.default;
  
  // Truncar título si es muy largo
  const truncatedTitle = title.length > 80 ? title.substring(0, 77) + '...' : title;
  
  // Escapar caracteres especiales XML
  const escapedTitle = truncatedTitle
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

  const svg = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <!-- Gradiente de fondo -->
      <defs>
        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${gradient.from};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${gradient.to};stop-opacity:1" />
        </linearGradient>
        
        <!-- Patrón de puntos -->
        <pattern id="dots" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.5" fill="rgba(255,255,255,0.1)" />
        </pattern>
      </defs>
      
      <!-- Fondo con gradiente -->
      <rect width="${width}" height="${height}" fill="url(#gradient)" />
      
      <!-- Patrón de puntos -->
      <rect width="${width}" height="${height}" fill="url(#dots)" />
      
      <!-- Círculo decorativo superior derecha -->
      <circle cx="${width - 150}" cy="150" r="200" fill="rgba(255,255,255,0.05)" />
      
      <!-- Círculo decorativo inferior izquierda -->
      <circle cx="150" cy="${height - 100}" r="150" fill="rgba(0,0,0,0.05)" />
      
      <!-- Contenedor del contenido -->
      <g transform="translate(80, ${height / 2 - 100})">
        <!-- Icono grande de categoría -->
        <text 
          x="0" 
          y="0" 
          font-size="120" 
          fill="rgba(255,255,255,0.15)"
        >
          ${gradient.icon}
        </text>
        
        <!-- Título del artículo -->
        <foreignObject x="0" y="40" width="${width - 160}" height="200">
          <div xmlns="http://www.w3.org/1999/xhtml" style="
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 48px;
            font-weight: 800;
            line-height: 1.2;
            color: white;
            text-shadow: 0 2px 10px rgba(0,0,0,0.2);
            padding: 20px 0;
          ">
            ${escapedTitle}
          </div>
        </foreignObject>
        
        <!-- Badge de categoría -->
        <rect 
          x="0" 
          y="260" 
          width="auto" 
          height="40" 
          rx="20" 
          fill="rgba(255,255,255,0.2)" 
        />
        <text 
          x="25" 
          y="287" 
          font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" 
          font-size="18" 
          font-weight="600" 
          fill="white"
        >
          ${gradient.icon} ${category.toUpperCase().replace(/-/g, ' ')}
        </text>
        
        <!-- Logo ThotNet Core -->
        <text 
          x="${width - 250}" 
          y="287" 
          font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" 
          font-size="24" 
          font-weight="700" 
          fill="rgba(255,255,255,0.9)"
          text-anchor="end"
        >
          AI NEWS
        </text>
      </g>
    </svg>
  `.trim();

  return svg;
}

/**
 * Genera un SVG de respaldo para portadas de cursos.
 * Norma crítica: NO debe contener texto (ni títulos, ni badges, ni marcas).
 */
export function generateCourseFallbackImageSVG(config: CourseFallbackImageConfig): string {
  const { category = 'default', width = 1280, height = 720 } = config;
  const gradient = categoryGradients[category] || categoryGradients.default;

  const svg = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${gradient.from};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${gradient.to};stop-opacity:1" />
        </linearGradient>
        <radialGradient id="vignette" cx="50%" cy="50%" r="65%">
          <stop offset="0%" stop-color="rgba(0,0,0,0)" />
          <stop offset="100%" stop-color="rgba(0,0,0,0.35)" />
        </radialGradient>
        <pattern id="noise" x="0" y="0" width="90" height="90" patternUnits="userSpaceOnUse">
          <circle cx="6" cy="9" r="1" fill="rgba(255,255,255,0.06)" />
          <circle cx="45" cy="18" r="1" fill="rgba(255,255,255,0.05)" />
          <circle cx="70" cy="60" r="1" fill="rgba(255,255,255,0.05)" />
          <circle cx="20" cy="72" r="1" fill="rgba(255,255,255,0.04)" />
        </pattern>
      </defs>

      <rect width="${width}" height="${height}" fill="url(#gradient)" />
      <rect width="${width}" height="${height}" fill="url(#noise)" />

      <circle cx="${Math.round(width * 0.82)}" cy="${Math.round(height * 0.22)}" r="${Math.round(Math.min(width, height) * 0.32)}" fill="rgba(255,255,255,0.06)" />
      <circle cx="${Math.round(width * 0.18)}" cy="${Math.round(height * 0.78)}" r="${Math.round(Math.min(width, height) * 0.26)}" fill="rgba(0,0,0,0.08)" />

      <rect width="${width}" height="${height}" fill="url(#vignette)" />
    </svg>
  `.trim();

  return svg;
}

/**
 * Convierte SVG a Data URL para usar en src de imagen
 */
export function svgToDataURL(svg: string): string {
  const base64 = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}

/**
 * Genera una imagen de respaldo completa lista para usar
 */
export function generateFallbackImage(config: FallbackImageConfig): string {
  const svg = generateFallbackImageSVG(config);
  return svgToDataURL(svg);
}

export function generateCourseFallbackImage(config: CourseFallbackImageConfig): string {
  const svg = generateCourseFallbackImageSVG(config);
  return svgToDataURL(svg);
}

// Import fallback images list - statically imported for best performance
import fallbackImagesList from '@/lib/fallback-images-list.json';

/**
 * Seeded random number generator for consistent results
 * Uses article ID as seed to ensure same article always gets same image
 */
function seededRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash % 1000000) / 1000000;
}

/**
 * Get a fallback image URL for an article
 * Uses seeded randomization based on article ID or title for consistency
 */
export function getFallbackImageUrl(identifier: string): string {
  const images = fallbackImagesList as string[];
  if (!images || images.length === 0) {
    return '';
  }
  
  const index = Math.floor(seededRandom(identifier) * images.length);
  return images[index];
}

/**
 * Hook para obtener la URL de imagen con fallback automático
 * Ahora usa imágenes de Supabase como fallback primario
 */
export function getImageWithFallback(
  imageUrl: string | null | undefined,
  title: string,
  category?: string,
  articleId?: string
): string {
  // Si tiene imagen propia, usarla
  if (imageUrl && imageUrl.trim() !== '') {
    return imageUrl;
  }
  
  // Intentar usar imagen de fallback de Supabase
  const identifier = articleId || title;
  const supabaseFallback = getFallbackImageUrl(identifier);
  
  if (supabaseFallback) {
    return supabaseFallback;
  }
  
  // Fallback final: SVG generado
  return generateFallbackImage({ title, category });
}

/**
 * Process a list of articles and assign fallback images avoiding repetition
 * Returns articles with computed fallback_image_url property
 */
export function assignFallbackImagesToArticles<T extends { 
  id: string; 
  image_url?: string | null;
  title_en?: string;
  title_es?: string;
}>(
  articles: T[],
  windowSize = 5
): (T & { computed_image_url: string; preferred_fallback_image_url: string })[] {
  const images = fallbackImagesList as string[];
  const result: (T & { computed_image_url: string; preferred_fallback_image_url: string })[] = [];

  // Track the last position where a given fallback image was assigned.
  // This enables a greedy "maximize distance" strategy to keep repetitions as far apart as possible.
  const lastUsedAt = new Map<string, number>();
  const minDistance = Math.max(0, Math.floor(windowSize));

  function selectSpacedFallbackImage(articleId: string, position: number): string {
    if (!Array.isArray(images) || images.length === 0) return '';

    const baseIndex = Math.floor(seededRandom(articleId) * images.length);

    // Iterate candidates in a seeded order, and pick the one that maximizes distance since last use.
    // If there are candidates beyond the minDistance threshold, prefer those.
    let bestCandidate = images[baseIndex];
    let bestDistance = -1;
    let bestIsBeyondThreshold = false;

    for (let offset = 0; offset < images.length; offset++) {
      const candidate = images[(baseIndex + offset) % images.length];
      const last = lastUsedAt.get(candidate);
      const distance = last === undefined ? Number.POSITIVE_INFINITY : position - last;
      const isBeyond = distance > minDistance;

      // Prefer candidates that are beyond the threshold. Among them, maximize distance.
      // Tie-break by seeded iteration order (first encountered wins).
      if (isBeyond && !bestIsBeyondThreshold) {
        bestCandidate = candidate;
        bestDistance = distance;
        bestIsBeyondThreshold = true;
        continue;
      }

      if (isBeyond === bestIsBeyondThreshold) {
        if (distance > bestDistance) {
          bestCandidate = candidate;
          bestDistance = distance;
        }
      }
    }

    return bestCandidate;
  }

  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];

    // Always compute a preferred fallback URL for this article.
    // This is used both when the article has no image_url and when an existing image fails to load.
    let preferredFallback = '';
    if (Array.isArray(images) && images.length > 0) {
      preferredFallback = selectSpacedFallbackImage(article.id, i);
      lastUsedAt.set(preferredFallback, i);
    } else {
      const title = article.title_en || article.title_es || 'Article';
      preferredFallback = generateFallbackImage({ title, category: (article as { category?: string }).category });
    }

    const hasOwnImage = !!(article.image_url && article.image_url.trim() !== '');
    result.push({
      ...article,
      preferred_fallback_image_url: preferredFallback,
      computed_image_url: hasOwnImage ? (article.image_url as string) : preferredFallback,
    });
  }

  return result;
}

