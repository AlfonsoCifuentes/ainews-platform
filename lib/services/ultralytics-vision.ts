/**
 * Ultralytics Computer Vision Service
 *
 * Uses YOLO models for object detection in news images to verify:
 * - Image contains relevant visual content (not just text/logos)
 * - Detects objects, people, technology, scenes
 * - Validates image quality and relevance for news articles
 */

interface DetectionResult {
  class: string;
  confidence: number;
  bbox: [number, number, number, number]; // x1, y1, x2, y2
}

interface UltralyticsResponse {
  detections: DetectionResult[];
  image_size: [number, number];
  inference_time: number;
}

interface ImageValidationResult {
  isValid: boolean;
  confidence: number;
  detectedObjects: string[];
  hasRelevantContent: boolean;
  reasoning: string;
  metadata: {
    totalDetections: number;
    imageSize: [number, number];
    inferenceTime: number;
  };
}

class UltralyticsVisionService {
  private readonly apiKey: string;
  private readonly apiUrl: string = 'https://api.ultralytics.com/v1/predict';
  private readonly model: string = 'yolov8n'; // Fast and accurate model

  constructor() {
    this.apiKey = process.env.ULTRALYTICS_API_KEY || '';
    if (!this.apiKey) {
      console.warn('[Ultralytics] No API key configured - computer vision validation disabled');
    }
  }

  /**
   * Check if the service is available
   */
  isAvailable(): boolean {
    return !!this.apiKey;
  }

  /**
   * Analyze image for relevant content using object detection
   */
  async analyzeImage(imageUrl: string): Promise<ImageValidationResult> {
    if (!this.isAvailable()) {
      return {
        isValid: true, // Fallback to valid if service unavailable
        confidence: 0.5,
        detectedObjects: [],
        hasRelevantContent: true,
        reasoning: 'Computer vision service unavailable - accepting image',
        metadata: {
          totalDetections: 0,
          imageSize: [0, 0],
          inferenceTime: 0
        }
      };
    }

    try {
      console.log(`[Ultralytics] Analyzing image: ${imageUrl}`);

      // Make API request to Ultralytics
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
          image: imageUrl,
          conf: 0.25, // Confidence threshold
          iou: 0.45,  // IoU threshold
          max_det: 50 // Maximum detections
        })
      });

      if (!response.ok) {
        throw new Error(`Ultralytics API error: ${response.status} ${response.statusText}`);
      }

      const data: UltralyticsResponse = await response.json();

      // Analyze detections
      const result = this.analyzeDetections(data);

      console.log(`[Ultralytics] Analysis complete: ${result.detectedObjects.length} objects detected, valid: ${result.isValid}`);

      return result;

    } catch (error) {
      console.error('[Ultralytics] Analysis failed:', error);

      // Return valid result on error to not block content
      return {
        isValid: true,
        confidence: 0.3,
        detectedObjects: [],
        hasRelevantContent: true,
        reasoning: `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        metadata: {
          totalDetections: 0,
          imageSize: [0, 0],
          inferenceTime: 0
        }
      };
    }
  }

  /**
   * Analyze detection results to determine image validity
   */
  private analyzeDetections(data: UltralyticsResponse): ImageValidationResult {
    const detections = data.detections || [];
    const detectedObjects = detections.map(d => d.class);

    // Define relevant object categories for news images
    const relevantCategories = new Set([
      'person', 'people', 'human',
      'car', 'vehicle', 'truck', 'bus', 'motorcycle',
      'computer', 'laptop', 'phone', 'tablet', 'device',
      'building', 'house', 'office', 'city', 'street',
      'animal', 'dog', 'cat', 'bird',
      'food', 'drink', 'product',
      'sports', 'ball', 'equipment',
      'nature', 'mountain', 'water', 'sky', 'tree',
      'technology', 'robot', 'machine', 'equipment',
      'chart', 'graph', 'diagram', 'visualization'
    ]);

    // Check for high-confidence detections
    const highConfidenceDetections = detections.filter(d => d.confidence > 0.5);
    const relevantDetections = highConfidenceDetections.filter(d =>
      relevantCategories.has(d.class.toLowerCase())
    );

    // Calculate overall confidence
    const avgConfidence = highConfidenceDetections.length > 0
      ? highConfidenceDetections.reduce((sum, d) => sum + d.confidence, 0) / highConfidenceDetections.length
      : 0;

    // Determine if image has relevant content
    const hasRelevantContent = relevantDetections.length > 0 || highConfidenceDetections.length >= 3;
    const hasSufficientConfidence = avgConfidence > 0.4;

    // Special case: if we detect many objects, it's likely a rich image
    const hasRichContent = detections.length >= 5;

    const isValid = hasRelevantContent || hasSufficientConfidence || hasRichContent;
    const confidence = Math.min(avgConfidence + (relevantDetections.length * 0.1) + (hasRichContent ? 0.2 : 0), 1.0);

    let reasoning = '';
    if (isValid) {
      if (hasRichContent) {
        reasoning = `Rich image with ${detections.length} detected objects`;
      } else if (relevantDetections.length > 0) {
        reasoning = `Contains relevant content: ${relevantDetections.slice(0, 3).map(d => d.class).join(', ')}`;
      } else {
        reasoning = `Sufficient visual content detected (confidence: ${(avgConfidence * 100).toFixed(1)}%)`;
      }
    } else {
      reasoning = `Insufficient visual content - only ${detections.length} objects detected with low confidence`;
    }

    return {
      isValid,
      confidence,
      detectedObjects: [...new Set(detectedObjects)], // Remove duplicates
      hasRelevantContent,
      reasoning,
      metadata: {
        totalDetections: detections.length,
        imageSize: data.image_size,
        inferenceTime: data.inference_time
      }
    };
  }

  /**
   * Batch analyze multiple images
   */
  async analyzeImages(imageUrls: string[]): Promise<ImageValidationResult[]> {
    const results: ImageValidationResult[] = [];

    // Process in batches to avoid rate limits
    const batchSize = 3;
    for (let i = 0; i < imageUrls.length; i += batchSize) {
      const batch = imageUrls.slice(i, i + batchSize);
      const batchPromises = batch.map(url => this.analyzeImage(url));
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Small delay between batches
      if (i + batchSize < imageUrls.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  /**
   * Get image content description for accessibility
   */
  async getImageDescription(imageUrl: string): Promise<string> {
    try {
      const analysis = await this.analyzeImage(imageUrl);

      if (analysis.detectedObjects.length === 0) {
        return 'Image with visual content';
      }

      const topObjects = analysis.detectedObjects.slice(0, 5);
      return `Image showing: ${topObjects.join(', ')}`;
    } catch {
      return 'Image content could not be analyzed';
    }
  }
}

// Export singleton instance
export const ultralyticsVision = new UltralyticsVisionService();
export default ultralyticsVision;