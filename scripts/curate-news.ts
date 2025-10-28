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
import { createLLMClient } from '../lib/ai/llm-client';
import { getSupabaseServerClient } from '../lib/db/supabase';
import { AI_NEWS_SOURCES, type NewsSource } from '../lib/ai/news-sources';
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
  category: z.enum(['machinelearning', 'nlp', 'computervision', 'ethics', 'industry', 'research']),
  reasoning: z.string().optional()
});

const TranslationSchema = z.object({
  title: z.string(),
  summary: z.string(),
  content: z.string()
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

function extractImageUrl(article: RawArticle): string | null {
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
  
  // Fallback: Use a neutral AI/tech themed image from Unsplash
  // This is better than null - provides visual consistency
  return `https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1600&q=80`;
}

function cleanContent(html: string | undefined): string {
  if (!html) return '';
  const $ = load(html);
  $('script, style, iframe').remove();
  return $.text().trim().slice(0, 2000);
}

async function filterAndClassifyArticles(
  articles: RawArticle[], 
  llm: ReturnType<typeof createLLMClient>
) {
  console.log('[LLM] Filtering articles...');
  const classified = [];
  
  for (const article of articles) {
    try {
      const content = cleanContent(article.content) || article.contentSnippet || '';
      
      const result = await llm.classify(
        `Analyze if this article is relevant to AI/ML/tech news.
        
Title: ${article.title}
Content: ${content.slice(0, 500)}...

Classify its relevance, quality (0-1), and category.`,
        ArticleClassificationSchema
      );
      
      if (result.relevant && result.quality_score >= 0.6) {
        classified.push({ article, classification: result });
      }
    } catch (error) {
      console.error(`[LLM] ✗ Classification failed:`, error);
    }
  }
  
  console.log(`[LLM] ✓ ${classified.length}/${articles.length} articles passed`);
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
  
  for (const { article, classification, translation } of classified) {
    try {
      const contentOriginal = cleanContent(article.content) || article.contentSnippet || '';
      const summaryOriginal = article.contentSnippet?.slice(0, 300) || contentOriginal.slice(0, 300);
      const originalLanguage: 'en' | 'es' = article.source.language === 'es' ? 'es' : 'en';

      const bilingual = {
        title_en: originalLanguage === 'en' ? article.title : translation?.title || article.title,
        title_es: originalLanguage === 'es' ? article.title : translation?.title || article.title,
        summary_en: originalLanguage === 'en' ? summaryOriginal : translation?.summary || summaryOriginal,
        summary_es: originalLanguage === 'es' ? summaryOriginal : translation?.summary || summaryOriginal,
        content_en: originalLanguage === 'en' ? contentOriginal : translation?.content || contentOriginal,
        content_es: originalLanguage === 'es' ? contentOriginal : translation?.content || contentOriginal
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
      
      const { data: insertedArticle, error: articleError } = await db
        .from('news_articles')
        .insert({
          title_en: bilingual.title_en,
          title_es: bilingual.title_es,
          summary_en: bilingual.summary_en,
          summary_es: bilingual.summary_es,
          content_en: bilingual.content_en,
          content_es: bilingual.content_es,
          category: classification.category,
          tags: Array.from(baseTags),
          source_url: article.link,
          image_url: extractImageUrl(article),
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
      
    } catch (error) {
      console.error(`[DB] ✗ Storage failed:`, error);
    }
  }
}

async function main() {
  console.log('[News Curator] Starting curation workflow...');

  const startTime = Date.now();

  try {
    const llm = createLLMClient('groq');
    const db = getSupabaseServerClient();

    console.log('[News Curator] Initialized clients');

    const rawArticles = await fetchRSSFeeds();
    const classified = await filterAndClassifyArticles(rawArticles, llm) as Array<{
      article: RawArticle;
      classification: z.infer<typeof ArticleClassificationSchema>;
      translation?: z.infer<typeof TranslationSchema>;
      translationLanguage?: 'en' | 'es';
    }>;
    
    console.log('[Translation] Generating bilingual content...');
    for (const item of classified) {
      try {
        const targetLanguage: 'en' | 'es' = item.article.source.language === 'es' ? 'en' : 'es';
        item.translation = await translateArticle(item.article, llm, targetLanguage);
        item.translationLanguage = targetLanguage;
      } catch (error) {
        console.error('[Translation] ✗ Failed:', error);
      }
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
