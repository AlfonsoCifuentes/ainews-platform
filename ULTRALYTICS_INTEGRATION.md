# Ultralytics Computer Vision Integration

## 🎯 Overview

AINews now includes advanced computer vision capabilities using **Ultralytics YOLO** models to ensure all news articles have high-quality, relevant images. This system goes beyond basic image validation to analyze visual content and verify that images contain meaningful elements.

## 🔧 Features

### 1. **Object Detection & Content Analysis**
- **YOLOv8 Model**: Uses Ultralytics' latest YOLOv8 nano model for fast, accurate object detection
- **Content Validation**: Ensures images contain relevant visual elements (people, technology, objects, scenes)
- **Relevance Scoring**: Assigns confidence scores based on detected objects and their relevance to news content

### 2. **Enhanced Image Validation**
- **Multi-Layer Validation**: Combines basic checks + AI captioning (BLIP) + computer vision analysis
- **Fallback System**: If computer vision fails, images still pass basic validation to avoid blocking content
- **Batch Processing**: Efficiently processes multiple images with rate limiting

### 3. **Accessibility Improvements**
- **Automatic Alt Text**: Generates accessibility-focused alt text using detected objects
- **Enhanced Descriptions**: Combines BLIP captions with object detection for rich descriptions
- **WCAG Compliance**: Ensures images have meaningful alternative text

### 4. **API Endpoints**
- **`/api/vision/analyze`**: Manual image analysis endpoint
- **POST**: Analyze a single image URL
- **GET**: Check service availability

## 🚀 Usage

### Automatic Integration
The computer vision system is automatically integrated into the news curation pipeline:

```bash
# Run news curation with computer vision validation
npm run ai:curate
```

### Manual Testing
```bash
# Test Ultralytics integration
npm run ai:test-ultralytics
```

### API Usage
```bash
# Check if service is available
curl https://ainews-platform.vercel.app/api/vision/analyze

# Analyze an image
curl -X POST https://ainews-platform.vercel.app/api/vision/analyze \
  -H "Content-Type: application/json" \
  -d '{"imageUrl": "https://example.com/image.jpg"}'
```

## 🎨 Technical Details

### Object Categories
The system recognizes and prioritizes these object categories for news relevance:

**High Priority:**
- `person`, `people`, `human`
- `computer`, `laptop`, `phone`, `device`
- `technology`, `robot`, `machine`

**Medium Priority:**
- `car`, `vehicle`, `building`, `city`
- `chart`, `graph`, `diagram`

**Contextual:**
- `animal`, `food`, `sports`, `nature`

### Validation Logic
Images pass computer vision validation if they meet ANY of these criteria:

1. **Relevant Objects**: Contains objects from high/medium priority categories
2. **Rich Content**: Detects 5+ objects total (indicates detailed scene)
3. **High Confidence**: Average detection confidence > 40%

### Performance
- **Model**: YOLOv8n (fast inference, ~50ms per image)
- **Batch Processing**: 3 images simultaneously with 1s delays
- **Fallback**: Continues working even if Ultralytics API is unavailable

## 🔐 Configuration

### Environment Variables
```bash
# Required for computer vision
ULTRALYTICS_API_KEY=your_ultralytics_api_key

# Optional for enhanced captions
HUGGINGFACE_API_KEY=your_huggingface_api_key
```

### API Key Setup
1. **Ultralytics**: Sign up at [Ultralytics Hub](https://hub.ultralytics.com/) for API access
2. **Hugging Face**: Get token from [Hugging Face](https://huggingface.co/settings/tokens) for BLIP captions

## 📊 Monitoring

### Logs
The system provides detailed logging during curation:

```
[ImageValidator] 👁️ Computer Vision: person, laptop, computer
[ImageValidator] 📊 CV Analysis: Rich image with 8 detected objects
[ImageValidator] ♿ Enhanced alt text: "person with laptop and computer"
```

### Metrics
- **Detection Count**: Number of objects found
- **Confidence Score**: Average detection confidence (0-1)
- **Validation Rate**: Percentage of images passing CV checks
- **Inference Time**: API response time in milliseconds

## 🔄 Integration Points

### News Curation Pipeline
1. **Image Scraping**: Extract images from articles
2. **Basic Validation**: Check format, size, uniqueness
3. **AI Captioning**: Generate descriptions with BLIP
4. **Computer Vision**: Analyze objects with YOLO
5. **Accessibility**: Generate alt text
6. **Storage**: Save validated images with metadata

### Database Schema
Images are stored with enhanced metadata:
```sql
-- Enhanced image metadata
{
  "url": "https://example.com/image.jpg",
  "alt_text": "person with laptop and computer",
  "detected_objects": ["person", "laptop", "computer"],
  "cv_confidence": 0.87,
  "cv_validated": true
}
```

## 🚨 Troubleshooting

### Common Issues

**"Ultralytics service not available"**
- Check `ULTRALYTICS_API_KEY` in environment variables
- Verify API key is valid and has credits

**"Analysis failed: API error"**
- Check network connectivity
- Verify image URLs are accessible
- Check API rate limits

**"No objects detected"**
- Image might be too small (< 320px)
- Image might contain only text/graphics
- Try different image sources

### Rate Limiting
- Ultralytics API has rate limits
- System automatically batches requests
- Adds delays between batches to prevent throttling

## 🎯 Benefits

1. **Quality Assurance**: Ensures all news images contain relevant visual content
2. **Accessibility**: Automatic generation of meaningful alt text
3. **User Experience**: Richer image descriptions and better content understanding
4. **SEO**: Improved image metadata for search engines
5. **Analytics**: Detailed insights into image content and quality

## 🔮 Future Enhancements

- **Scene Classification**: Categorize images by scene type (office, outdoor, etc.)
- **Emotion Detection**: Analyze facial expressions in images
- **Brand Recognition**: Detect logos and branded content
- **Content Moderation**: Filter inappropriate or sensitive images
- **Image Similarity**: Find visually similar images across articles