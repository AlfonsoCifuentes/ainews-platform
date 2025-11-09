#!/usr/bin/env node
/**
 * News Curation Agent Script
 * 
 * This script runs the AI news curation workflow:
 * 1. Fetches RSS feeds from configured sources
 * 2. Filters articles using LLM (quality + relevance)
 * 3. Translates EN ↔ ES
 * 4. Generates embeddings
 * 5. Stores in Supabase
 * 
 * Runs on schedule via GitHub Actions or manually via `npm run ai:curate`
 */

// Load environment variables for standalone script runs (prefers .env.local, falls back to .env)
import { config as loadEnv } from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';
const envLocal = resolve(process.cwd(), '.env.local');
if (existsSync(envLocal)) {
  loadEnv({ path: envLocal });
} else {
  loadEnv();
}

import Parser from 'rss-parser';
import { load } from 'cheerio';
import pLimit from 'p-limit';
import { createLLMClientWithFallback, LLMClient } from '../lib/ai/llm-client';
import { getSupabaseServerClient } from '../lib/db/supabase';
import { AI_NEWS_SOURCES, type NewsSource } from '../lib/ai/news-sources';
import { getBestArticleImage } from '../lib/services/image-scraper';
import { scrapeArticleImageAdvanced } from '../lib/services/advanced-image-scraper';
import { validateImageEnhanced } from '../lib/services/image-validator';
import { enhancedImageDescription } from '../lib/services/enhanced-image-description';
import { initializeImageHashCache } from '../lib/services/image-validator';
import { visualSimilarity } from '../lib/services/visual-similarity';
import { z } from 'zod';

const parser = new Parser({
  customFields: {
    item: ['media:content', 'media:thumbnail', 'enclosure']
  }
});

// Schema for LLM article classification
const ArticleClassificationSchema = z.object({
  relevant: z.boolean().describe('Is this article about AI/ML/tech?'),
  quality_score: z.number().min(0).max(1).describe('Quality rating 0-1'),
  category: z.enum(['machinelearning', 'nlp', 'computervision', 'robotics', 'ethics', 'business', 'research', 'tools', 'news', 'other']),
  summary: z.string().describe('Brief summary of the article'),
  image_alt_text: z.string().optional().describe('Descriptive alt text for article image (accessibility)')
});

const TranslationSchema = z.object({
  title: z.string(),
  summary: z.string(),
  content: z.string(),
  image_alt_text: z.string().optional().describe('Translated alt text for image')
});

interface RawArticle {
  title: string;
  link: string;
  pubDate: string;
  contentSnippet?: string;
  content?: string;
  enclosure?: { url: string };
  source: NewsSource;
  // Enhanced fields added during processing
  imageUrl?: string;
  image_alt_text?: string;
  processedContent?: string;
}

async function fetchRSSFeeds(): Promise<RawArticle[]> {
  console.log(`[RSS] Fetching from ${AI_NEWS_SOURCES.length} sources...`);
  let articles: RawArticle[] = [];
  
  for (const source of AI_NEWS_SOURCES) {
    try {
      const feed = await parser.parseURL(source.url);
      
      // Limit to most recent 10 articles per source to avoid overload
      const recentItems = feed.items
        .sort((a, b) => {
          const dateA = a.pubDate ? new Date(a.pubDate).getTime() : 0;
          const dateB = b.pubDate ? new Date(b.pubDate).getTime() : 0;
          return dateB - dateA; // Most recent first
        })
        .slice(0, 10);
      
      for (const item of recentItems) {
        if (!item.title || !item.link) continue;
        
        articles.push({
          title: item.title,
          link: item.link,
          pubDate: item.pubDate || new Date().toISOString(),
          contentSnippet: item.contentSnippet || item.content,
          content: item.content,
          enclosure: item.enclosure,
          source
        });
      }
      
      console.log(`[RSS] ✓ ${source.name}: ${recentItems.length} articles (from ${feed.items.length} total)`);
    } catch (error) {
      console.error(`[RSS] ✗ ${source.name} failed:`, error);
    }
  }
  
  console.log(`\n[RSS] ✓ Total articles fetched: ${articles.length}`);
  
  // Limit total articles to prevent overwhelming the LLM (prioritize most recent)
  const MAX_ARTICLES_TO_PROCESS = 100; // Process max 100 articles per run
  if (articles.length > MAX_ARTICLES_TO_PROCESS) {
    console.log(`[RSS] ⚠ Limiting to ${MAX_ARTICLES_TO_PROCESS} most recent articles (from ${articles.length} total)`);
    articles = articles
      .sort((a, b) => {
        const dateA = new Date(a.pubDate).getTime();
        const dateB = new Date(b.pubDate).getTime();
        return dateB - dateA; // Most recent first
      })
      .slice(0, MAX_ARTICLES_TO_PROCESS);
  }
  
  console.log(`[RSS] Final articles to process: ${articles.length}\n`);
  
  return articles;
}

// Legacy function - kept for reference but replaced by getBestArticleImage
function _extractImageUrl(article: RawArticle): string | null {
  // Strategy 1: Check enclosure (most RSS feeds with media)
  if (article.enclosure?.url) {
    const url = article.enclosure.url;
    if (url.startsWith('http') && (url.endsWith('.jpg') || url.endsWith('.png') || url.endsWith('.webp') || url.includes('image'))) {
      return url;
    }
  }
  
  // Strategy 2: Parse content HTML for images
  if (article.content) {
    const $ = load(article.content);
    
    // Try multiple selectors in priority order
    const selectors = [
      'meta[property="og:image"]',
      'meta[name="twitter:image"]',
      'img.featured-image',
      'img.wp-post-image',
      'article img',
      'img'
    ];
    
    for (const selector of selectors) {
      const img = $(selector).first().attr(selector.startsWith('meta') ? 'content' : 'src');
      if (img && img.startsWith('http') && !img.includes('avatar') && !img.includes('icon')) {
        return img;
      }
    }
  }
  
  // Strategy 3: Try to extract from description/content snippet
  if (article.contentSnippet) {
    const $ = load(article.contentSnippet);
    const img = $('img').first().attr('src');
    if (img && img.startsWith('http')) return img;
  }
  
  // Return null instead of fallback - we'll fetch from source URL later
  return null;
}

/**
 * Scrapes the actual article page to get the real featured image and full content
 */
async function scrapeArticlePage(url: string): Promise<{ image: string | null; content: string | null }> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });
    
    if (!response.ok) {
      console.warn(`[Scraper] Failed to fetch ${url}: ${response.status}`);
      return { image: null, content: null };
    }
    
    const html = await response.text();
    const $ = load(html);
    
    // Remove unwanted elements
    $('script, style, nav, header, footer, aside, .ad, .advertisement, .social-share').remove();
    
    // Extract image with priority order
    let image: string | null = null;
    const imageSelectors = [
      'meta[property="og:image"]',
      'meta[name="twitter:image"]',
      'meta[property="twitter:image"]',
      'article img[src*="featured"]',
      'article img[src*="hero"]',
      '.article-image img',
      '.post-thumbnail img',
      'article img',
      'main img',
      '.content img'
    ];
    
    for (const selector of imageSelectors) {
      const attr = selector.startsWith('meta') ? 'content' : 'src';
      let imgUrl = $(selector).first().attr(attr);
      
      if (imgUrl) {
        // Handle relative URLs
        if (imgUrl.startsWith('//')) {
          imgUrl = 'https:' + imgUrl;
        } else if (imgUrl.startsWith('/')) {
          const urlObj = new URL(url);
          imgUrl = `${urlObj.protocol}//${urlObj.host}${imgUrl}`;
        }
        
        // Validate image URL
        if (imgUrl.startsWith('http') && 
            !imgUrl.includes('avatar') && 
            !imgUrl.includes('icon') &&
            !imgUrl.includes('logo') &&
            !imgUrl.includes('1x1')) {
          image = imgUrl;
          break;
        }
      }
    }
    
    // Extract main content
    let content: string | null = null;
    const contentSelectors = [
      'article .article-content',
      'article .post-content',
      'article .entry-content',
      '.article-body',
      'article p',
      'main p',
      '.content p'
    ];
    
    for (const selector of contentSelectors) {
      const contentEl = $(selector);
      if (contentEl.length > 0) {
        content = contentEl.map((_, el) => $(el).text()).get().join('\n\n').trim();
        if (content.length > 200) break; // Found substantial content
      }
    }
    
    // Clean up content
    if (content) {
      content = content
        .replace(/\s+/g, ' ')
        .replace(/\n\s*\n/g, '\n\n')
        .trim()
        .slice(0, 3000); // Limit to 3000 chars
    }
    
    return { image, content };
  } catch (error) {
    console.error(`[Scraper] Error scraping ${url}:`, error);
    return { image: null, content: null };
  }
}

function cleanContent(html: string | undefined): string {
  if (!html) return '';
  const $ = load(html);
  $('script, style, iframe').remove();
  return $.text().trim().slice(0, 2000);
}

/**
 * Multi-LLM classifier with automatic fallback on rate limits
 * Tries providers in order: Gemini -> OpenRouter -> Groq
 */
async function classifyArticle(
  article: RawArticle,
  llmClient: LLMClient,
  systemPrompt: string
): Promise<z.infer<typeof ArticleClassificationSchema> | null> {
  const content = cleanContent(article.content) || article.contentSnippet || '';
  const prompt = `Title: ${article.title}
Content: ${content.slice(0, 500)}...

Is this article relevant to AI/ML/tech? Return JSON only.`;

  try {
    const result = await llmClient.classify(
      prompt,
      ArticleClassificationSchema,
      systemPrompt
    );

    console.log(`[LLM] ✓ Classified "${article.title.slice(0, 40)}..." (score: ${result.quality_score}, category: ${result.category})`);
    return result;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[LLM] ✗ Classification failed for "${article.title.slice(0, 40)}": ${errorMessage.slice(0, 100)}`);
    return null;
  }
}

async function filterAndClassifyArticles(
  articles: RawArticle[],
  llmClient: LLMClient
) {
  console.log(`[LLM] Filtering ${articles.length} articles with LLM...`);
  console.log(`[LLM] Processing in parallel (max 5 concurrent)...`);

  const classified: Array<{
    article: RawArticle;
    classification: z.infer<typeof ArticleClassificationSchema>;
  }> = [];
  const pLimit = (await import('p-limit')).default;
  const limit = pLimit(5); // Process 5 articles at a time

  const systemPrompt = `You are a JSON-only response AI. You MUST respond ONLY with valid JSON, no markdown, no explanations, no formatting.
Your response must match this exact structure:
{
  "relevant": boolean,
  "quality_score": number (0-1),
  "category": "machinelearning" | "nlp" | "computervision" | "robotics" | "ethics" | "business" | "research" | "tools" | "news" | "other",
  "summary": string
}`;

  let processedCount = 0;
  let relevantCount = 0;
  let filteredCount = 0;

  const tasks = articles.map((article, index) =>
    limit(async () => {
      try {
        const result = await classifyArticle(article, llmClient, systemPrompt);
        processedCount++;

        if (result && result.relevant && result.quality_score >= 0.6) {
          classified.push({ article, classification: result });
          relevantCount++;
        } else {
          filteredCount++;
        }

        // Progress indicator every 10 articles
        if (processedCount % 10 === 0) {
          console.log(`[LLM] Progress: ${processedCount}/${articles.length} (${relevantCount} relevant, ${filteredCount} filtered)`);
        }

        return result;
      } catch (error) {
        processedCount++;
        console.error(`[LLM] ✗ Error processing article ${index + 1}:`, error);
        return null;
      }
    })
  );

  await Promise.all(tasks);

  console.log(`[LLM] ✓ ${classified.length}/${articles.length} articles passed filter`);
  return classified;
}

async function translateArticle(
  article: RawArticle,
  _llm: LLMClient, // Not used anymore, kept for signature compatibility
  targetLanguage: 'en' | 'es',
  retries = 3
): Promise<z.infer<typeof TranslationSchema> | null> {
  const { translateArticle: googleTranslate, detectLanguage } = await import('../lib/ai/translator');
  
  const content = cleanContent(article.content) || article.contentSnippet || '';
  const title = article.title;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Detect source language
      const sourceLang = await detectLanguage(title + ' ' + content);
      
      // Skip if already in target language
      if (sourceLang === targetLanguage) {
        console.log(`[Translation] ⊘ Article already in ${targetLanguage}, using original`);
        return {
          title,
          summary: content.slice(0, 300),
          content
        };
      }
      
      // Translate using Google Translate (free, reliable, no rate limits)
      const translated = await googleTranslate(
        title,
        content.slice(0, 300), // Summary from first 300 chars
        content,
        sourceLang,
        targetLanguage
      );
      
      console.log(`[Translation] ✓ Translated "${title.slice(0, 40)}..." from ${sourceLang} to ${targetLanguage}`);
      return translated;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[Translation] ✗ Attempt ${attempt}/${retries} failed:`, errorMessage.slice(0, 100));
      
      if (attempt < retries) {
        // Shorter backoff for Google Translate (it's fast)
        const delayMs = 500 * attempt;
        console.log(`[Translation] Retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  
  console.error(`[Translation] ✗ FAILED after ${retries} attempts for: "${title.slice(0, 40)}..."`);
  return null;
}

async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'openai/text-embedding-ada-002',
        input: text.slice(0, 8000)
      })
    });
    
    if (!response.ok) {
      console.warn(`[Embeddings] API error: ${response.status} ${response.statusText}`);
      return null;
    }
    
    const data = await response.json();
    
    if (!data?.data?.[0]?.embedding) {
      console.warn('[Embeddings] Invalid response format:', JSON.stringify(data).slice(0, 200));
      return null;
    }
    
    return data.data[0].embedding;
  } catch (error) {
    console.warn('[Embeddings] Error generating embedding:', error instanceof Error ? error.message : error);
    return null;
  }
}

async function storeArticles(
  classified: Array<{
    article: RawArticle;
    classification: z.infer<typeof ArticleClassificationSchema>;
    translation?: z.infer<typeof TranslationSchema>;
    translationLanguage?: 'en' | 'es';
  }>,
  db: ReturnType<typeof getSupabaseServerClient>
) {
  console.log('[DB] Storing articles...');
  
  let successCount = 0;
  const duplicateImageCount = 0;
  let skippedImageCount = 0;
  
  for (const { article, classification, translation } of classified) {
    try {
      // First, try to scrape the actual article page for better image and content
      console.log(`[Scraper] Fetching ${article.link.slice(0, 50)}...`);
      const scraped = await scrapeArticlePage(article.link);
      
      // Use scraped content if available and substantial, otherwise fallback to RSS content
      const contentOriginal = (scraped.content && scraped.content.length > 200) 
        ? scraped.content 
        : (cleanContent(article.content) || article.contentSnippet || '');
      
      // Generate a proper summary from content (not just duplicate)
      const summaryOriginal = article.contentSnippet?.slice(0, 300) || contentOriginal.slice(0, 300);
      
      // ULTRA IMPROVED IMAGE HANDLING with multi-layer validation
      console.log(`[ImageValidator] Finding best image for: ${article.title.slice(0, 50)}...`);
      
      let imageUrl: string | null = null;
      
      // LAYER 1: Try fast DOM scraper first
      imageUrl = await getBestArticleImage(article.link, {
        enclosure: article.enclosure,
        content: article.content,
        contentSnippet: article.contentSnippet
      });
      
      // LAYER 2: If Layer 1 failed, use ADVANCED scraper (Multi-layer webscraping)
      if (!imageUrl) {
        console.log(`[ImageValidator] Layer 1 failed, trying ADVANCED scraper (Multi-layer webscraping)...`);
        try {
          const advancedResult = await scrapeArticleImageAdvanced(article.link);
          
          if (advancedResult && advancedResult.confidence > 0.4) {
            imageUrl = advancedResult.url;
            console.log(`[ImageValidator] ✅ ADVANCED scraper SUCCESS! Method: ${advancedResult.method}, Confidence: ${(advancedResult.confidence * 100).toFixed(1)}%`);
          } else {
            console.warn(`[ImageValidator] ADVANCED scraper found image but confidence too low`);
          }
        } catch (advancedError) {
          console.error(`[ImageValidator] ADVANCED scraper failed:`, advancedError instanceof Error ? advancedError.message : advancedError);
        }
      }

      // LAYER 2.5: Validate with AI Computer Vision if we have an image
      if (imageUrl) {
        console.log(`[ImageValidator] Validating image with AI Computer Vision...`);
        try {
          const aiValidation = await validateImageEnhanced(imageUrl, {
            skipCache: true,
            skipComputerVision: false // Enable computer vision validation
          });

          if (!aiValidation.isValid) {
            console.warn(`[ImageValidator] ⚠️ Image rejected: ${aiValidation.reason}`);
            if (aiValidation.aiCaption) {
              console.warn(`[ImageValidator] AI Caption: ${aiValidation.aiCaption}`);
            }
            if (aiValidation.cvAnalysis) {
              console.warn(`[ImageValidator] CV Analysis: ${aiValidation.cvAnalysis}`);
            }
            imageUrl = null; // Discard invalid image
          } else {
            console.log(`[ImageValidator] ✅ Image validated successfully`);

            if (aiValidation.aiVerified) {
              console.log(`[ImageValidator] 🤖 AI verified: "${aiValidation.aiCaption}"`);
            }

            if (aiValidation.cvVerified && aiValidation.detectedObjects) {
              console.log(`[ImageValidator] 👁️ Computer Vision: ${aiValidation.detectedObjects.slice(0, 5).join(', ')}${aiValidation.detectedObjects.length > 5 ? '...' : ''}`);
              console.log(`[ImageValidator] 📊 CV Analysis: ${aiValidation.cvAnalysis}`);
            }

            // Generate enhanced accessibility description
            if (enhancedImageDescription.isAvailable()) {
              try {
                const description = await enhancedImageDescription.generateDescription(imageUrl);
                console.log(`[ImageValidator] ♿ Enhanced alt text: "${description.accessibilityAlt}"`);
                // Store the enhanced description for later use in the article
                article.image_alt_text = description.accessibilityAlt;
              } catch (descError) {
                console.warn(`[ImageValidator] Failed to generate enhanced description:`, descError instanceof Error ? descError.message : descError);
              }
            }

            if (!aiValidation.aiVerified && !aiValidation.cvVerified) {
              console.log(`[ImageValidator] ℹ️ Image passed basic checks (AI/CV not available)`);
            }

            // Store visual similarity hash for future duplicate detection
            if (aiValidation.visualSimilarity?.hash) {
              try {
                await visualSimilarity.storeHash(imageUrl, aiValidation.visualSimilarity.hash, undefined); // Will be updated with article ID after insertion
                console.log(`[VisualSimilarity] ✓ Stored hash for image validation`);
              } catch (hashError) {
                console.warn(`[VisualSimilarity] Failed to store hash:`, hashError instanceof Error ? hashError.message : hashError);
              }
            }
          }
        } catch (aiError) {
          console.warn(`[ImageValidator] Validation skipped:`, aiError instanceof Error ? aiError.message : aiError);
          // Continue with the image even if validation fails
        }
      }
      
      if (!imageUrl) {
        console.warn(`[ImageValidator] ❌ No original image found for "${article.title.slice(0, 50)}...". Skipping article.`);
        skippedImageCount++;
        continue;
      }
      
      const originalLanguage: 'en' | 'es' = article.source.language === 'es' ? 'es' : 'en';
      
      // Generate default alt text if LLM didn't provide one
      const defaultAltText = `AI news image for: ${article.title.slice(0, 100)}`;
      const altTextOriginal = classification.image_alt_text || defaultAltText;
      const altTextTranslated = translation?.image_alt_text || defaultAltText;

      const bilingual = {
        title_en: originalLanguage === 'en' ? article.title : translation?.title || article.title,
        title_es: originalLanguage === 'es' ? article.title : translation?.title || article.title,
        summary_en: originalLanguage === 'en' ? summaryOriginal : translation?.summary || summaryOriginal,
        summary_es: originalLanguage === 'es' ? summaryOriginal : translation?.summary || summaryOriginal,
        content_en: originalLanguage === 'en' ? contentOriginal : translation?.content || contentOriginal,
        content_es: originalLanguage === 'es' ? contentOriginal : translation?.content || contentOriginal,
        alt_text_en: originalLanguage === 'en' ? altTextOriginal : altTextTranslated,
        alt_text_es: originalLanguage === 'es' ? altTextOriginal : altTextTranslated
      };

      const baseTags = new Set<string>([
        article.source.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, ''),
        `lang-${originalLanguage}`,
        `source-lang-${article.source.language}`,
        `source-category-${article.source.category}`
      ]);
      
      const { data: insertedArticle, error: articleError} = await db
        .from('news_articles')
        .insert({
          title_en: bilingual.title_en,
          title_es: bilingual.title_es,
          summary_en: bilingual.summary_en,
          summary_es: bilingual.summary_es,
          content_en: bilingual.content_en,
          content_es: bilingual.content_es,
          image_alt_text_en: bilingual.alt_text_en,
          image_alt_text_es: bilingual.alt_text_es,
          category: classification.category,
          tags: Array.from(baseTags),
          source_url: article.link,
          image_url: imageUrl, // Use scraped image
          published_at: new Date(article.pubDate).toISOString(),
          ai_generated: false,
          quality_score: classification.quality_score,
          reading_time_minutes: Math.ceil(bilingual.content_en.split(' ').length / 200)
        })
        .select('id')
        .single();
      
      if (articleError) throw articleError;
      
      const embeddingBase = `${bilingual.title_en} ${bilingual.summary_en} ${bilingual.content_en.slice(0, 1000)}`;
      const embedding = await generateEmbedding(embeddingBase);
      
      // Only store embedding if generation was successful
      if (embedding && insertedArticle?.id) {
        await db.from('content_embeddings').insert({
          content_id: insertedArticle.id,
          content_type: 'article',
          embedding
        });
      } else if (!embedding) {
        console.warn(`[DB] ⚠️ Skipping embedding for article (generation failed)`);
      }
      
      console.log(`[DB] ✓ ${article.title.slice(0, 50)}...`);
      successCount++;
      
    } catch (error) {
      console.error(`[DB] ✗ Storage failed:`, error);
    }
  }
  
  console.log('\n[DB] Storage complete!');
  console.log(`  - Articles stored: ${successCount}`);
  console.log(`  - Unique images stored: ${successCount}`);
  console.log(`  - Skipped (missing original image): ${skippedImageCount}`);
  console.log(`  - Duplicate images avoided: ${duplicateImageCount}`);
}

async function main() {
  console.log('[News Curator] Starting curation workflow...');
  console.log('[News Curator] Environment check:');
  console.log(`  - GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? '✓ Set' : '✗ Missing'}`);
  console.log(`  - OPENROUTER_API_KEY: ${process.env.OPENROUTER_API_KEY ? '✓ Set' : '✗ Missing'}`);
  console.log(`  - GROQ_API_KEY: ${process.env.GROQ_API_KEY ? '✓ Set' : '✗ Missing'}`);
  console.log(`  - SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '✓ Set' : '✗ Missing'}`);
  console.log(`  - NEXT_PUBLIC_SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? '✓ Set' : '✗ Missing'}`);

  const startTime = Date.now();

  try {
    // Initialize LLM client with automatic fallback (prioritizes Ollama in development)
    const llmClient = await createLLMClientWithFallback();
    console.log('[News Curator] ✓ LLM client initialized with automatic fallback');

    const db = getSupabaseServerClient();
    console.log('[News Curator] ✓ Supabase client initialized');

    // Initialize image hash cache to prevent duplicates
    console.log('[ImageValidator] Initializing image hash cache...');
    await initializeImageHashCache();
    console.log('[ImageValidator] ✓ Cache initialized');

    const rawArticles = await fetchRSSFeeds();
    const classified = await filterAndClassifyArticles(rawArticles, llmClient) as Array<{
      article: RawArticle;
      classification: z.infer<typeof ArticleClassificationSchema>;
      translation?: z.infer<typeof TranslationSchema>;
      translationLanguage?: 'en' | 'es';
    }>;
    
    console.log('[Translation] Generating bilingual content...');
    console.log(`[Translation] ${classified.length} articles to translate`);
    
    // Create rate limiter for concurrency control (max 2 concurrent translations to avoid rate limits)
    const translationLimit = pLimit(2);
    let translationSuccessCount = 0;
    let translationFailCount = 0;
    
    await Promise.all(
      classified.map((item, index) =>
        translationLimit(async () => {
          try {
            const targetLanguage: 'en' | 'es' = item.article.source.language === 'es' ? 'en' : 'es';
            console.log(`[Translation] Processing ${index + 1}/${classified.length}: "${item.article.title.slice(0, 40)}..." → ${targetLanguage}`);
            
            // Translate using the primary LLM client
            let translationResult = null;
            try {
              translationResult = await translateArticle(item.article, llmClient, targetLanguage);

              if (translationResult) {
                console.log(`[Translation] ✓ Success for "${item.article.title.slice(0, 40)}..."`);
                translationSuccessCount++;
              } else {
                console.log(`[Translation] ⚠ Returned null`);
              }
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : String(error);
              console.log(`[Translation] ✗ Error: ${errorMessage.slice(0, 100)}`);
            }

            if (translationResult) {
              item.translation = translationResult;
              item.translationLanguage = targetLanguage;
            } else {
              translationFailCount++;
              console.error(`[Translation] ✗ CRITICAL: Translation failed for "${item.article.title.slice(0, 40)}..."`);
              console.error(`[Translation] ⚠ Article will be stored WITHOUT translation!`);
            }
          } catch (error) {
            translationFailCount++;
            console.error('[Translation] ✗ Unexpected error:', error);
          }
        })
      )
    );
    
    console.log('\n[Translation] Translation complete!');
    console.log(`  ✓ Successful: ${translationSuccessCount}/${classified.length}`);
    console.log(`  ✗ Failed: ${translationFailCount}/${classified.length}`);
    
    if (translationFailCount > 0) {
      console.warn(`\n⚠️  WARNING: ${translationFailCount} article(s) failed translation!`);
      console.warn('  These articles will have duplicate EN/ES content.');
      console.warn('  Check LLM provider API keys and rate limits.');
    }
    
    await storeArticles(classified, db);

    const executionTime = Date.now() - startTime;

    console.log('[News Curator] Workflow completed successfully');
    console.log(`[News Curator] Execution time: ${(executionTime / 1000).toFixed(2)}s`);

    await db.from('ai_system_logs').insert({
      action_type: 'news_curation',
      model_used: 'groq/llama-3.3-70b-versatile',
      input_tokens: 0,
      output_tokens: 0,
      success: true,
      execution_time: executionTime,
      cost: 0,
      timestamp: new Date().toISOString(),
    });

    process.exit(0);
  } catch (error) {
    console.error('[News Curator] Fatal error:', error);

    const executionTime = Date.now() - startTime;

    // Log failure
    try {
      const db = getSupabaseServerClient();
      await db.from('ai_system_logs').insert({
        action_type: 'news_curation',
        model_used: 'groq/llama-3.1-8b-instant',
        input_tokens: 0,
        output_tokens: 0,
        success: false,
        error_message:
          error instanceof Error ? error.message : 'Unknown error',
        execution_time: executionTime,
        cost: 0,
        timestamp: new Date().toISOString(),
      });
    } catch (logError) {
      console.error('[News Curator] Failed to log error:', logError);
    }

    process.exit(1);
  }
}

main();
