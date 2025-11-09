/**
 * Enhanced Image Description Service
 *
 * Combines multiple AI models to generate comprehensive image descriptions:
 * - Hugging Face BLIP for natural language captions
 * - Ultralytics YOLO for object detection
 * - Combined analysis for rich, accessible descriptions
 */

import { ultralyticsVision } from './ultralytics-vision';

// Hugging Face BLIP configuration
const BLIP_API_URL = 'https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-base';
const BLIP_ENABLED = !!process.env.HUGGINGFACE_API_KEY;

interface EnhancedDescription {
  fullDescription: string;
  accessibilityAlt: string;
  objects: string[];
  caption: string;
  confidence: number;
}

class EnhancedImageDescriptionService {
  /**
   * Generate comprehensive image description using multiple AI models
   */
  async generateDescription(imageUrl: string): Promise<EnhancedDescription> {
    const results: Partial<EnhancedDescription> = {
      objects: [],
      confidence: 0
    };

    // Get computer vision analysis
    const cvAnalysis = await ultralyticsVision.analyzeImage(imageUrl);
    results.objects = cvAnalysis.detectedObjects;
    results.confidence = cvAnalysis.confidence;

    // Get BLIP caption if available
    if (BLIP_ENABLED) {
      try {
        const blipCaption = await this.getBLIPCaption(imageUrl);
        results.caption = blipCaption;
      } catch (error) {
        console.warn('[EnhancedDescription] BLIP caption failed:', error);
        results.caption = 'Image content';
      }
    } else {
      results.caption = 'Image content';
    }

    // Generate combined descriptions
    results.fullDescription = this.combineDescriptions(results.caption!, results.objects!);
    results.accessibilityAlt = this.generateAccessibilityAlt(results.caption!, results.objects!);

    return results as EnhancedDescription;
  }

  /**
   * Get caption from Hugging Face BLIP
   */
  private async getBLIPCaption(imageUrl: string): Promise<string> {
    const response = await fetch(BLIP_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ inputs: imageUrl })
    });

    if (!response.ok) {
      throw new Error(`BLIP API error: ${response.status}`);
    }

    const data = await response.json();

    if (Array.isArray(data) && data.length > 0 && data[0].generated_text) {
      return data[0].generated_text;
    }

    throw new Error('Invalid BLIP response format');
  }

  /**
   * Combine BLIP caption with detected objects for rich description
   */
  private combineDescriptions(caption: string, objects: string[]): string {
    if (objects.length === 0) {
      return caption;
    }

    // Clean and format objects
    const relevantObjects = objects
      .filter(obj => !['text', 'logo', 'icon', 'button', 'menu'].includes(obj.toLowerCase()))
      .slice(0, 8); // Limit to most relevant objects

    if (relevantObjects.length === 0) {
      return caption;
    }

    const objectsText = relevantObjects.join(', ');
    return `${caption}. Visible elements include: ${objectsText}.`;
  }

  /**
   * Generate accessibility-focused alt text
   */
  private generateAccessibilityAlt(caption: string, objects: string[]): string {
    // For accessibility, focus on the most important elements
    const importantObjects = objects
      .filter(obj => {
        const lower = obj.toLowerCase();
        return !['text', 'logo', 'icon', 'button', 'menu', 'background', 'border'].includes(lower);
      })
      .slice(0, 5);

    if (importantObjects.length === 0) {
      // Fallback to simplified caption
      return caption.replace(/^a picture of /i, '').replace(/^an image of /i, '');
    }

    // Create concise alt text
    const mainObject = importantObjects[0];
    const additionalObjects = importantObjects.slice(1, 3);

    let altText = `${mainObject}`;
    if (additionalObjects.length > 0) {
      altText += ` with ${additionalObjects.join(' and ')}`;
    }

    return altText;
  }

  /**
   * Batch generate descriptions for multiple images
   */
  async generateBatchDescriptions(imageUrls: string[]): Promise<EnhancedDescription[]> {
    const results: EnhancedDescription[] = [];

    // Process in smaller batches to avoid rate limits
    const batchSize = 2;
    for (let i = 0; i < imageUrls.length; i += batchSize) {
      const batch = imageUrls.slice(i, i + batchSize);
      const batchPromises = batch.map(url => this.generateDescription(url));
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Delay between batches
      if (i + batchSize < imageUrls.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    return results;
  }

  /**
   * Check if the service is available
   */
  isAvailable(): boolean {
    return ultralyticsVision.isAvailable() || BLIP_ENABLED;
  }
}

// Export singleton instance
export const enhancedImageDescription = new EnhancedImageDescriptionService();
export default enhancedImageDescription;