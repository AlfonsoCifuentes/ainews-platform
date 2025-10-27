#!/usr/bin/env node
/**
 * Quick News Import Script
 * Imports articles directly from RSS without LLM classification (for quick testing)
 */

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
import { createClient } from '@supabase/supabase-js';

const parser = new Parser({
  customFields: {
    item: ['media:content', 'media:thumbnail', 'enclosure']
  }
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Quick RSS sources (top AI news)
const RSS_SOURCES = [
  { url: 'https://www.artificialintelligence-news.com/feed/', category: 'machinelearning' },
  { url: 'https://machinelearningmastery.com/blog/feed/', category: 'machinelearning' },
  { url: 'https://openai.com/blog/rss/', category: 'industry' },
  { url: 'https://deepmind.google/blog/rss.xml', category: 'research' },
  { url: 'https://www.technologyreview.com/feed/', category: 'industry' },
];

function extractImageUrl(item: unknown): string {
  // Try multiple image sources
  if (item['media:content']?.$ && item['media:content'].$.url) {
    return item['media:content'].$.url;
  }
  if (item['media:thumbnail']?.$ && item['media:thumbnail'].$.url) {
    return item['media:thumbnail'].$.url;
  }
  if (item.enclosure?.url) {
    return item.enclosure.url;
  }
  if (item.content && item.content.includes('<img')) {
    const imgMatch = item.content.match(/<img[^>]+src="([^">]+)"/);
    if (imgMatch) return imgMatch[1];
  }
  // Default fallback
  return 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&auto=format&fit=crop';
}

async function quickImport() {
  console.log('🚀 Quick importing articles from RSS feeds...\n');
  
  let totalInserted = 0;

  for (const source of RSS_SOURCES) {
    try {
      console.log(`📰 Fetching from ${source.url}...`);
      const feed = await parser.parseURL(source.url);
      
      const articles = feed.items.slice(0, 10).map((item) => ({
        title_en: item.title || 'Untitled',
        title_es: item.title || 'Sin título', // Quick copy, no translation
        summary_en: item.contentSnippet?.substring(0, 300) || item.summary || 'No summary available',
        summary_es: item.contentSnippet?.substring(0, 300) || item.summary || 'No hay resumen disponible',
        content_en: item.content || item.summary || '',
        content_es: item.content || item.summary || '',
        category: source.category,
        tags: ['ai', 'news'],
        source_url: item.link || '',
        image_url: extractImageUrl(item),
        published_at: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
        ai_generated: false,
        quality_score: 0.75, // Default quality
        reading_time_minutes: 5,
      }));

      const { data, error } = await supabase
        .from('news_articles')
        .insert(articles)
        .select();

      if (error) {
        console.log(`   ❌ Error: ${error.message}`);
      } else {
        totalInserted += data.length;
        console.log(`   ✅ Inserted ${data.length} articles`);
      }
    } catch (error: unknown) {
      console.log(`   ❌ Error fetching feed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  console.log(`\n✅ Total inserted: ${totalInserted} articles`);
}

quickImport().catch(console.error);
