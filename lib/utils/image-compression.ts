/**
 * Client-side Image Compression Utilities
 * 
 * Optimizes user avatars to JPG format with maximum 100KB size
 * Uses canvas API for client-side compression before upload
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  maxSizeKB?: number;
  quality?: number; // 0.0 - 1.0
  format?: 'image/jpeg' | 'image/png';
}

const DEFAULT_OPTIONS: Required<CompressionOptions> = {
  maxWidth: 200,
  maxHeight: 200,
  maxSizeKB: 100,
  quality: 0.8,
  format: 'image/jpeg'
};

/**
 * Compress an image file to meet size requirements
 * Uses iterative quality reduction if needed
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // Validate input
  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image');
  }
  
  // Load image
  const img = await loadImage(file);
  
  // Calculate dimensions (maintain aspect ratio)
  const { width, height } = calculateDimensions(
    img.width,
    img.height,
    opts.maxWidth,
    opts.maxHeight
  );
  
  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }
  
  // Draw image with high quality
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, width, height);
  
  // Compress with iterative quality reduction
  let quality = opts.quality;
  let blob: Blob | null = null;
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, opts.format, quality);
    });
    
    if (!blob) {
      throw new Error('Failed to compress image');
    }
    
    // Check size
    const sizeKB = blob.size / 1024;
    
    if (sizeKB <= opts.maxSizeKB) {
      // Success - size is acceptable
      break;
    }
    
    // Too large - reduce quality and try again
    quality -= 0.1;
    attempts++;
    
    if (quality < 0.1) {
      // Quality too low - resize image smaller
      const scaleFactor = Math.sqrt(opts.maxSizeKB / sizeKB);
      canvas.width = Math.floor(width * scaleFactor);
      canvas.height = Math.floor(height * scaleFactor);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      quality = opts.quality; // Reset quality
    }
  }
  
  if (!blob) {
    throw new Error('Failed to compress image to target size');
  }
  
  // Convert blob to File
  const extension = opts.format === 'image/jpeg' ? 'jpg' : 'png';
  const fileName = file.name.replace(/\.[^.]+$/, `.${extension}`);
  
  return new File([blob], fileName, {
    type: opts.format,
    lastModified: Date.now()
  });
}

/**
 * Load an image file and return HTMLImageElement
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Calculate new dimensions maintaining aspect ratio
 */
function calculateDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  let width = originalWidth;
  let height = originalHeight;
  
  // Scale down if needed
  if (width > maxWidth) {
    height = (height * maxWidth) / width;
    width = maxWidth;
  }
  
  if (height > maxHeight) {
    width = (width * maxHeight) / height;
    height = maxHeight;
  }
  
  return {
    width: Math.round(width),
    height: Math.round(height)
  };
}

/**
 * Validate image file before upload
 */
export function validateImageFile(file: File): {
  valid: boolean;
  error?: string;
} {
  // Check file type
  if (!file.type.startsWith('image/')) {
    return {
      valid: false,
      error: 'File must be an image'
    };
  }
  
  // Check file size (max 5MB before compression)
  const maxSizeMB = 5;
  if (file.size > maxSizeMB * 1024 * 1024) {
    return {
      valid: false,
      error: `Image must be smaller than ${maxSizeMB}MB`
    };
  }
  
  return { valid: true };
}

/**
 * Get preview URL for image file
 */
export function getImagePreviewUrl(file: File): string {
  return URL.createObjectURL(file);
}

/**
 * Revoke preview URL to free memory
 */
export function revokeImagePreviewUrl(url: string): void {
  URL.revokeObjectURL(url);
}
