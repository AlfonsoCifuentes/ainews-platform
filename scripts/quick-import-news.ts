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
  { url: 'https://machinelearningmastery.com/blog/feed/', category: 'machinelearning' },
  { url: 'https://deepmind.google/blog/rss.xml', category: 'research' },
  { url: 'https://www.technologyreview.com/feed/', category: 'industry' },
  { url: 'https://techcrunch.com/category/artificial-intelligence/feed/', category: 'industry' },
  { url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml', category: 'industry' },
];

function extractImageUrl(item: any): string {
  // Try multiple image sources in order of preference
  
  // 1. Media content (RSS 2.0 media extension)
  if (item['media:content']) {
    if (Array.isArray(item['media:content'])) {
      const imageContent = item['media:content'].find((m: any) => 
        m.$?.url && (m.$.medium === 'image' || m.$.type?.startsWith('image/'))
      );
      if (imageContent?.$?.url) return imageContent.$.url;
    } else if (item['media:content'].$?.url) {
      return item['media:content'].$.url;
    }
  }
  
  // 2. Media thumbnail
  if (item['media:thumbnail']) {
    if (Array.isArray(item['media:thumbnail']) && item['media:thumbnail'][0]?.$?.url) {
      return item['media:thumbnail'][0].$.url;
    } else if (item['media:thumbnail'].$?.url) {
      return item['media:thumbnail'].$.url;
    }
  }
  
  // 3. Enclosure (common in podcasts/media feeds)
  if (item.enclosure?.url && item.enclosure?.type?.startsWith('image/')) {
    return item.enclosure.url;
  }
  
  // 4. Parse content/description for img tags
  const contentToSearch = item['content:encoded'] || item.content || item.description || '';
  if (contentToSearch && typeof contentToSearch === 'string') {
    // Look for img tags with src
    const imgMatch = contentToSearch.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (imgMatch && imgMatch[1]) {
      // Filter out tracking pixels and icons
      const url = imgMatch[1];
      if (!url.includes('1x1') && !url.includes('pixel') && !url.includes('icon')) {
        return url;
      }
    }
    
    // Look for og:image meta tags
    const ogMatch = contentToSearch.match(/property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
    if (ogMatch && ogMatch[1]) return ogMatch[1];
  }
  
  // 5. Default fallback (different per category)
  const fallbacks: Record<string, string> = {
    machinelearning: 'https://images.unsplash.com/photo-1555255707-c07966088b7b?w=800&auto=format&fit=crop', // ML/AI abstract
    research: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&auto=format&fit=crop', // Research/science
    industry: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop', // Tech/industry
  };
  
  return fallbacks.machinelearning; // Default
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
