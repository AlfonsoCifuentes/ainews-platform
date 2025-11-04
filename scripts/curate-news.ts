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
import { createLLMClient } from '../lib/ai/llm-client';
import { getSupabaseServerClient } from '../lib/db/supabase';
import { AI_NEWS_SOURCES, type NewsSource } from '../lib/ai/news-sources';
import { getBestArticleImage } from '../lib/services/image-scraper';
import { initializeImageHashCache } from '../lib/services/image-validator';
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
}

async function fetchRSSFeeds(): Promise<RawArticle[]> {
  console.log(`[RSS] Fetching from ${AI_NEWS_SOURCES.length} sources...`);
  const articles: RawArticle[] = [];
  
  for (const source of AI_NEWS_SOURCES) {
    try {
      const feed = await parser.parseURL(source.url);
      
      for (const item of feed.items.slice(0, 10)) { // Limit to 10 per source
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
      
      console.log(`[RSS] ✓ ${source.name}: ${feed.items.length} articles`);
    } catch (error) {
      console.error(`[RSS] ✗ ${source.name} failed:`, error);
    }
  }
  
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
async function classifyWithFallback(
  article: RawArticle,
  providers: Array<{ name: string; client: ReturnType<typeof createLLMClient> }>,
  systemPrompt: string
): Promise<z.infer<typeof ArticleClassificationSchema> | null> {
  const content = cleanContent(article.content) || article.contentSnippet || '';
  const prompt = `Title: ${article.title}
Content: ${content.slice(0, 500)}...

Is this article relevant to AI/ML/tech? Return JSON only.`;

  for (const provider of providers) {
    try {
      const result = await provider.client.classify(
        prompt,
        ArticleClassificationSchema,
        systemPrompt
      );
      
      console.log(`[LLM:${provider.name}] ✓ Classified "${article.title.slice(0, 40)}..." (score: ${result.quality_score}, category: ${result.category})`);
      return result;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // If rate limited or provider failed, try next provider
      if (errorMessage.includes('429') || errorMessage.includes('rate_limit') || errorMessage.includes('quota')) {
        console.log(`[LLM:${provider.name}] ⚠ Rate limited, trying next provider...`);
        continue;
      }
      
      // Other errors, try next provider
      console.error(`[LLM:${provider.name}] ✗ Error: ${errorMessage.slice(0, 100)}, trying next provider...`);
      continue;
    }
  }
  
  // All providers failed
  console.error(`[LLM] ✗ All providers failed for "${article.title.slice(0, 40)}"`);
  return null;
}

async function filterAndClassifyArticles(
  articles: RawArticle[], 
  providers: Array<{ name: string; client: ReturnType<typeof createLLMClient> }>
) {
  console.log('[LLM] Filtering articles with multi-provider fallback...');
  console.log(`[LLM] Available providers: ${providers.map(p => p.name).join(', ')}`);
  
  const classified = [];
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  
  const systemPrompt = `You are a JSON-only response AI. You MUST respond ONLY with valid JSON, no markdown, no explanations, no formatting.
Your response must match this exact structure:
{
  "relevant": boolean,
  "quality_score": number (0-1),
  "category": "machinelearning" | "nlp" | "computervision" | "robotics" | "ethics" | "business" | "research" | "tools" | "news" | "other",
  "summary": string
}`;
  
  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];
    
    const result = await classifyWithFallback(article, providers, systemPrompt);
    
    if (result && result.relevant && result.quality_score >= 0.6) {
      classified.push({ article, classification: result });
    }
    
    // Small delay between articles to be nice to APIs
    if ((i + 1) % 3 === 0) {
      await delay(500);
    }
  }
  
  console.log(`[LLM] ✓ ${classified.length}/${articles.length} articles passed filter`);
  return classified;
}

async function translateArticle(
  article: RawArticle,
  llm: ReturnType<typeof createLLMClient>,
  targetLanguage: 'en' | 'es'
) {
  const content = cleanContent(article.content) || article.contentSnippet || '';
  
  const result = await llm.classify(
    `Translate the following AI news article to ${targetLanguage === 'es' ? 'Spanish' : 'English'}.
Maintain technical accuracy, names and figures.
    
Original Title: ${article.title}
Original Content: ${content}

Provide the translated title, a concise summary (2-3 sentences), and the full translated content in ${targetLanguage}.`,
    TranslationSchema
  );
  
  return result;
}

async function generateEmbedding(text: string): Promise<number[]> {
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
  
  const data = await response.json();
  return data.data[0].embedding;
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
  let invalidImageCount = 0;
  
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
      
      // IMPROVED IMAGE HANDLING with validation and deduplication
      console.log(`[ImageValidator] Finding best image for: ${article.title.slice(0, 50)}...`);
      
      let imageUrl: string | null = null;
      
      // Try to get the best image with our advanced scraper
      imageUrl = await getBestArticleImage(article.link, {
        enclosure: article.enclosure,
        content: article.content,
        contentSnippet: article.contentSnippet
      });
      
      // If no valid image found, generate unique fallback using Unsplash Source API
      if (!imageUrl) {
        console.warn(`[ImageValidator] No valid unique image found for "${article.title.slice(0, 50)}..." - using unique fallback`);
        
        // Generate UNIQUE fallback URL using Unsplash Source API with random seed
        // Each article gets a different image based on title + link hash
        const articleHash = `${article.title}${article.link}`.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const randomSeed = articleHash % 10000; // Generate seed 0-9999
        
        // Unsplash Source API with query + random seed = unique image every time
        // Categories: ai, technology, computer, robotics, data
        const categories = ['ai', 'technology', 'computer', 'robotics', 'data', 'science'];
        const category = categories[articleHash % categories.length];
        
        // Use Unsplash Source API - generates random image from category with seed
        imageUrl = `https://source.unsplash.com/1600x900/?${category},artificial-intelligence&sig=${randomSeed}`;
        
        console.log(`[ImageValidator] Generated unique fallback: ${imageUrl}`);
        invalidImageCount++;
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
      
      await db.from('content_embeddings').insert({
        content_id: insertedArticle.id,
        content_type: 'article',
        embedding
      });
      
      console.log(`[DB] ✓ ${article.title.slice(0, 50)}...`);
      successCount++;
      
    } catch (error) {
      console.error(`[DB] ✗ Storage failed:`, error);
    }
  }
  
  console.log('\n[DB] Storage complete!');
  console.log(`  - Articles stored: ${successCount}`);
  console.log(`  - Images validated: ${successCount - invalidImageCount}`);
  console.log(`  - Fallback images used: ${invalidImageCount}`);
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
    // Initialize ALL available LLM providers for fallback
    const providers: Array<{ name: string; client: ReturnType<typeof createLLMClient> }> = [];
    
    // Try Gemini first (best JSON support, 60 RPM)
    if (process.env.GEMINI_API_KEY) {
      try {
        providers.push({ name: 'Gemini', client: createLLMClient('gemini') });
        console.log('[News Curator] ✓ Gemini client initialized');
      } catch (error) {
        console.log('[News Curator] ⚠ Gemini initialization failed:', error);
      }
    }
    
    // OpenRouter as fallback (multiple models, good limits)
    if (process.env.OPENROUTER_API_KEY) {
      try {
        providers.push({ name: 'OpenRouter', client: createLLMClient('openrouter') });
        console.log('[News Curator] ✓ OpenRouter client initialized');
      } catch (error) {
        console.log('[News Curator] ⚠ OpenRouter initialization failed:', error);
      }
    }
    
    // Groq as last resort (30 RPM, but free)
    if (process.env.GROQ_API_KEY) {
      try {
        providers.push({ name: 'Groq', client: createLLMClient('groq') });
        console.log('[News Curator] ✓ Groq client initialized');
      } catch (error) {
        console.log('[News Curator] ⚠ Groq initialization failed:', error);
      }
    }
    
    if (providers.length === 0) {
      console.error('[News Curator] ✗ CRITICAL ERROR: No LLM providers available!');
      console.error('[News Curator] Please configure at least ONE of these GitHub Secrets:');
      console.error('  1. GEMINI_API_KEY (recommended - best JSON support)');
      console.error('  2. OPENROUTER_API_KEY (good fallback)');
      console.error('  3. GROQ_API_KEY (last resort)');
      console.error('[News Curator] Go to: https://github.com/AlfonsoCifuentes/ainews-platform/settings/secrets/actions');
      throw new Error('No LLM providers available. Set GEMINI_API_KEY, OPENROUTER_API_KEY, or GROQ_API_KEY in GitHub Secrets.');
    }
    
    console.log(`[News Curator] Initialized ${providers.length} LLM provider(s) with automatic fallback`);
    
    const db = getSupabaseServerClient();
    console.log('[News Curator] ✓ Supabase client initialized');
    
    // Initialize image hash cache to prevent duplicates
    console.log('[ImageValidator] Initializing image hash cache...');
    await initializeImageHashCache();
    console.log('[ImageValidator] ✓ Cache initialized');

    const rawArticles = await fetchRSSFeeds();
    const classified = await filterAndClassifyArticles(rawArticles, providers) as Array<{
      article: RawArticle;
      classification: z.infer<typeof ArticleClassificationSchema>;
      translation?: z.infer<typeof TranslationSchema>;
      translationLanguage?: 'en' | 'es';
    }>;
    
    console.log('[Translation] Generating bilingual content...');
    
    // Create rate limiter for concurrency control (max 3 concurrent translations)
    const translationLimit = pLimit(3);
    
    await Promise.all(
      classified.map((item) =>
        translationLimit(async () => {
          try {
            const targetLanguage: 'en' | 'es' = item.article.source.language === 'es' ? 'en' : 'es';
            
            // Use first available provider for translation
            let translationResult = null;
            for (const provider of providers) {
              try {
                translationResult = await translateArticle(item.article, provider.client, targetLanguage);
                console.log(`[Translation:${provider.name}] ✓ Translated to ${targetLanguage}`);
                break;
              } catch {
                console.log(`[Translation:${provider.name}] ✗ Failed, trying next...`);
                continue;
              }
            }
            
            if (translationResult) {
              item.translation = translationResult;
              item.translationLanguage = targetLanguage;
            }
          } catch (_error) {
            console.error('[Translation] ✗ All providers failed:', _error);
          }
        })
      )
    );
    
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
