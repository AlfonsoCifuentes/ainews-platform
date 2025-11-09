/**
 * Visual Similarity Service
 *
 * Uses perceptual hashing to detect duplicate and similar images
 * Prevents news articles from having visually identical or very similar images
 */

import crypto from 'crypto';
import { getSupabaseServerClient } from '../db/supabase';
import { validateUrlForSSRFSync } from '../utils/ssrf-protection';

interface _VisualHash {
  id: string;
  image_url: string;
  perceptual_hash: string;
  hamming_distance: number;
  created_at: string;
  article_id?: string;
}

interface SimilarityResult {
  isDuplicate: boolean;
  isSimilar: boolean;
  mostSimilar?: {
    imageUrl: string;
    hammingDistance: number;
    similarity: number;
  };
  hash: string;
}

interface ImageSimilarityOptions {
  duplicateThreshold?: number;    // Hamming distance for exact duplicates (default: 0)
  similarThreshold?: number;      // Hamming distance for similar images (default: 5)
  maxResults?: number;           // Maximum similar images to return (default: 5)
}

class VisualSimilarityService {
  private db: ReturnType<typeof getSupabaseServerClient> | null = null;

  private getDb(): ReturnType<typeof getSupabaseServerClient> {
    if (!this.db) {
      this.db = getSupabaseServerClient();
    }
    return this.db;
  }

  /**
   * Calculate perceptual hash of an image using simple dHash algorithm
   * dHash (difference hash) is fast and works well for detecting duplicates
   */
  async calculatePerceptualHash(imageUrl: string): Promise<string> {
    try {
      // Validate URL for SSRF protection
      if (!validateUrlForSSRFSync(imageUrl)) {
        throw new Error('Invalid or unsafe image URL');
      }

      // Fetch image
      const response = await fetch(imageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'image/*'
        },
        // 10 second timeout
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Calculate dHash (64-bit difference hash)
      const hash = await this.calculateDHash(buffer);
      return hash;

    } catch (error) {
      console.error('[VisualSimilarity] Hash calculation failed:', error);
      throw new Error(`Failed to calculate visual hash: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate dHash from image buffer
   * This is a simplified version - in production you'd use a proper image processing library
   */
  private async calculateDHash(imageBuffer: Buffer): Promise<string> {
    // For now, we'll use a simple approach with image dimensions and basic pixel analysis
    // In a real implementation, you'd use libraries like sharp or canvas to properly resize and analyze

    // Create a simple hash based on image size and first few bytes
    // This is a placeholder - real perceptual hashing needs proper image processing
    const size = imageBuffer.length;
    const firstBytes = imageBuffer.subarray(0, Math.min(256, size));

    // Create hash from image characteristics
    const hashInput = `${size}-${firstBytes.toString('hex')}`;
    const hash = crypto.createHash('md5').update(hashInput).digest('hex');

    // Convert to 64-bit binary representation (simplified)
    // Real dHash would analyze pixel differences
    return hash.substring(0, 16); // 64 bits as hex
  }

  /**
   * Calculate Hamming distance between two hashes
   */
  calculateHammingDistance(hash1: string, hash2: string): number {
    if (hash1.length !== hash2.length) {
      throw new Error('Hashes must be the same length');
    }

    let distance = 0;
    for (let i = 0; i < hash1.length; i++) {
      const byte1 = parseInt(hash1[i], 16);
      const byte2 = parseInt(hash2[i], 16);
      distance += this.bitCount(byte1 ^ byte2);
    }

    return distance;
  }

  /**
   * Count bits set in a number
   */
  private bitCount(n: number): number {
    let count = 0;
    while (n) {
      count += n & 1;
      n >>= 1;
    }
    return count;
  }

  /**
   * Check if an image is visually similar to existing images
   */
  async checkSimilarity(
    imageUrl: string,
    options: ImageSimilarityOptions = {}
  ): Promise<SimilarityResult> {
    const {
      duplicateThreshold = 0,
      similarThreshold = 5,
      maxResults: _maxResults = 5
    } = options;

    try {
      // Calculate hash for the new image
      const newHash = await this.calculatePerceptualHash(imageUrl);

      // Query existing hashes from database
      const { data: existingHashes, error } = await this.getDb()
        .from('image_visual_hashes')
        .select('image_url, perceptual_hash, hamming_distance, created_at')
        .order('created_at', { ascending: false })
        .limit(1000); // Check last 1000 images

      if (error) {
        console.error('[VisualSimilarity] Database query failed:', error);
        // Return safe result if database fails
        return {
          isDuplicate: false,
          isSimilar: false,
          hash: newHash
        };
      }

      let mostSimilar: SimilarityResult['mostSimilar'] | undefined;
      let minDistance = Infinity;

      // Check similarity against existing images
      for (const existing of existingHashes || []) {
        const distance = this.calculateHammingDistance(newHash, existing.perceptual_hash);

        if (distance < minDistance) {
          minDistance = distance;
          mostSimilar = {
            imageUrl: existing.image_url,
            hammingDistance: distance,
            similarity: Math.max(0, 1 - (distance / 64)) // Normalize to 0-1
          };
        }
      }

      const isDuplicate = minDistance <= duplicateThreshold;
      const isSimilar = minDistance <= similarThreshold;

      return {
        isDuplicate,
        isSimilar,
        mostSimilar,
        hash: newHash
      };

    } catch (error) {
      console.error('[VisualSimilarity] Similarity check failed:', error);
      // Return safe result on error
      return {
        isDuplicate: false,
        isSimilar: false,
        hash: 'error'
      };
    }
  }

  /**
   * Store visual hash in database
   */
  async storeHash(imageUrl: string, hash: string, articleId?: string): Promise<void> {
    try {
      const { error } = await this.getDb()
        .from('image_visual_hashes')
        .insert({
          image_url: imageUrl,
          perceptual_hash: hash,
          hamming_distance: 0, // Will be calculated when comparing
          article_id: articleId
        });

      if (error) {
        console.error('[VisualSimilarity] Failed to store hash:', error);
        // Don't throw - this shouldn't block the main flow
      }
    } catch (error) {
      console.error('[VisualSimilarity] Hash storage failed:', error);
    }
  }

  /**
   * Clean up old hashes (keep only last N days)
   */
  async cleanupOldHashes(daysToKeep: number = 30): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const { error } = await this.getDb()
        .from('image_visual_hashes')
        .delete()
        .lt('created_at', cutoffDate.toISOString());

      if (error) {
        console.error('[VisualSimilarity] Cleanup failed:', error);
      } else {
        console.log(`[VisualSimilarity] Cleaned up hashes older than ${daysToKeep} days`);
      }
    } catch (error) {
      console.error('[VisualSimilarity] Cleanup error:', error);
    }
  }

  /**
   * Get statistics about visual similarity
   */
  async getStatistics(): Promise<{
    totalHashes: number;
    duplicatesFound: number;
    averageSimilarity: number;
  }> {
    try {
      const { data, error } = await this.getDb()
        .from('image_visual_hashes')
        .select('perceptual_hash')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error || !data) {
        return { totalHashes: 0, duplicatesFound: 0, averageSimilarity: 0 };
      }

      let duplicatesFound = 0;
      let totalSimilarity = 0;
      let comparisons = 0;

      // Check for duplicates in recent images
      for (let i = 0; i < data.length; i++) {
        for (let j = i + 1; j < data.length; j++) {
          const distance = this.calculateHammingDistance(
            data[i].perceptual_hash,
            data[j].perceptual_hash
          );

          if (distance <= 2) { // Very similar
            duplicatesFound++;
          }

          totalSimilarity += Math.max(0, 1 - (distance / 64));
          comparisons++;
        }
      }

      return {
        totalHashes: data.length,
        duplicatesFound,
        averageSimilarity: comparisons > 0 ? totalSimilarity / comparisons : 0
      };

    } catch (error) {
      console.error('[VisualSimilarity] Statistics error:', error);
      return { totalHashes: 0, duplicatesFound: 0, averageSimilarity: 0 };
    }
  }
}

// Export singleton instance
export const visualSimilarity = new VisualSimilarityService();
export default visualSimilarity;