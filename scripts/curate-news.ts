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

import Parser from 'rss-parser';
import { load } from 'cheerio';
import { createLLMClient } from '../lib/ai/llm-client';
import { getSupabaseServerClient } from '../lib/db/supabase';
import { AI_NEWS_SOURCES, NewsSource } from '../lib/ai/news-sources';
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
  if (article.enclosure?.url) return article.enclosure.url;
  
  if (article.content) {
    const $ = load(article.content);
    const img = $('img').first().attr('src');
    if (img && img.startsWith('http')) return img;
  }
  
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
  llm: ReturnType<typeof createLLMClient>
) {
  const content = cleanContent(article.content) || article.contentSnippet || '';
  
  const result = await llm.classify(
    `Translate this AI news article to Spanish. Maintain technical accuracy.
    
Title: ${article.title}
Content: ${content}

Provide translated title, summary (2-3 sentences), and full content.`,
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
    translation_es?: z.infer<typeof TranslationSchema>;
  }>,
  db: ReturnType<typeof getSupabaseServerClient>
) {
  console.log('[DB] Storing articles...');
  
  for (const { article, classification, translation_es } of classified) {
    try {
      const content_en = cleanContent(article.content) || article.contentSnippet || '';
      const summary_en = article.contentSnippet?.slice(0, 300) || content_en.slice(0, 300);
      
      const { data: insertedArticle, error: articleError } = await db
        .from('news_articles')
        .insert({
          title_en: article.title,
          title_es: translation_es?.title || article.title,
          summary_en,
          summary_es: translation_es?.summary || summary_en,
          content_en,
          content_es: translation_es?.content || content_en,
          category: classification.category,
          tags: [article.source.name.toLowerCase().replace(/\s+/g, '-')],
          source_url: article.link,
          image_url: extractImageUrl(article),
          published_at: new Date(article.pubDate).toISOString(),
          ai_generated: false,
          quality_score: classification.quality_score,
          reading_time_minutes: Math.ceil(content_en.split(' ').length / 200)
        })
        .select('id')
        .single();
      
      if (articleError) throw articleError;
      
      const embedding = await generateEmbedding(
        `${article.title} ${summary_en} ${content_en.slice(0, 1000)}`
      );
      
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
      translation_es?: z.infer<typeof TranslationSchema>;
    }>;
    
    console.log('[Translation] Translating to Spanish...');
    for (const item of classified) {
      try {
        item.translation_es = await translateArticle(item.article, llm);
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
