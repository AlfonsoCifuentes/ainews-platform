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

// Comprehensive RSS sources from PROJECT_MASTER.md
const RSS_SOURCES = [
  // English Sources - High Priority
  { url: 'https://www.artificialintelligence-news.com/feed/rss/', category: 'industry' },
  { url: 'https://venturebeat.com/category/ai/feed/', category: 'industry' },
  { url: 'https://www.technologyreview.com/feed/', category: 'research' },
  { url: 'https://www.theguardian.com/technology/artificialintelligenceai/rss', category: 'industry' },
  { url: 'https://www.wired.com/feed/tag/ai/latest/rss', category: 'industry' },
  { url: 'https://futurism.com/categories/ai-artificial-intelligence/feed', category: 'industry' },
  { url: 'https://www.sciencedaily.com/rss/computers_math/artificial_intelligence.xml', category: 'research' },
  { url: 'https://lastweekin.ai/feed', category: 'industry' },
  { url: 'https://www.reddit.com/r/artificial/.rss', category: 'industry' },
  
  // Tech News with AI Coverage
  { url: 'https://techcrunch.com/category/artificial-intelligence/feed/', category: 'industry' },
  { url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml', category: 'industry' },
  
  // Research & Academic
  { url: 'https://machinelearningmastery.com/blog/feed/', category: 'machinelearning' },
  { url: 'https://deepmind.google/blog/rss.xml', category: 'research' },
  
  // Additional Quality Sources
  { url: 'https://blog.google/technology/ai/rss/', category: 'research' },
  { url: 'https://openai.com/blog/rss.xml', category: 'research' },
];

interface MediaContent {
  $?: { url?: string; medium?: string; type?: string };
  url?: string;
  medium?: string;
  type?: string;
}

interface RSSItem {
  'media:content'?: MediaContent | MediaContent[];
  'media:thumbnail'?: MediaContent | MediaContent[];
  enclosure?: { url?: string; type?: string };
  'content:encoded'?: string;
  content?: string;
  description?: string;
  link?: string;
}

function extractImageUrl(item: RSSItem): string {
  // Try multiple image sources in order of preference
  
  // 1. Media content (RSS 2.0 media extension) - prioritize high resolution
  if (item['media:content']) {
    if (Array.isArray(item['media:content'])) {
      // Find the largest image or first image marked as 'image'
      const imageContent = item['media:content'].find((m: MediaContent) => 
        m.$?.url && (m.$.medium === 'image' || m.$.type?.startsWith('image/'))
      );
      if (imageContent?.$?.url) return imageContent.$.url;
      
      // Fallback to first item with URL
      if (item['media:content'][0]?.$?.url) {
        return item['media:content'][0].$.url;
      }
    } else if (item['media:content'].$?.url) {
      return item['media:content'].$.url;
    }
  }
  
  // 2. Media thumbnail - prefer first thumbnail
  if (item['media:thumbnail']) {
    if (Array.isArray(item['media:thumbnail']) && item['media:thumbnail'][0]?.$?.url) {
      return item['media:thumbnail'][0].$.url;
    } else if (!Array.isArray(item['media:thumbnail']) && item['media:thumbnail'].$?.url) {
      return item['media:thumbnail'].$.url;
    }
  }
  
  // 3. Enclosure (common in podcasts/media feeds) - only images
  if (item.enclosure?.url && item.enclosure?.type?.startsWith('image/')) {
    return item.enclosure.url;
  }
  
  // 4. Parse content/description for img tags - prioritize larger images
  const contentToSearch = item['content:encoded'] || item.content || item.description || '';
  if (contentToSearch && typeof contentToSearch === 'string') {
    // Look for all img tags and filter
    const imgMatches = contentToSearch.matchAll(/<img[^>]+src=["']([^"']+)["']/gi);
    const validImages: string[] = [];
    
    for (const match of imgMatches) {
      const url = match[1];
      // Filter out tracking pixels, icons, and small images
      if (url && 
          !url.includes('1x1') && 
          !url.includes('pixel') && 
          !url.includes('icon') &&
          !url.includes('avatar') &&
          !url.includes('logo') &&
          !url.includes('badge') &&
          !url.includes('gif') &&
          !/\d+x\d+/.test(url) || url.match(/\d+x(\d+)/)?.[1] && parseInt(url.match(/\d+x(\d+)/)?.[1] || '0') > 400) {
        validImages.push(url);
      }
    }
    
    if (validImages.length > 0) {
      // Return the first valid large image
      return validImages[0];
    }
    
    // Look for og:image meta tags
    const ogMatch = contentToSearch.match(/property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
    if (ogMatch && ogMatch[1]) return ogMatch[1];
  }
  
  // 5. Try to extract from source URL (some sites have predictable patterns)
  if (item.link) {
    const url = new URL(item.link);
    // TechCrunch featured images often follow this pattern
    if (url.hostname.includes('techcrunch.com')) {
      const slug = url.pathname.split('/').pop()?.replace(/\/$/, '');
      if (slug) {
        return `https://techcrunch.com/wp-content/uploads/2025/${slug}.jpg`;
      }
    }
  }
  
  // 6. Default fallback - use different images per category to avoid duplicates
  const fallbacks: Record<string, string[]> = {
    machinelearning: [
      'https://images.unsplash.com/photo-1555255707-c07966088b7b?w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&auto=format&fit=crop',
    ],
    research: [
      'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop',
    ],
    industry: [
      'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop',
    ],
  };
  
  // Rotate through fallbacks to ensure variety
  const categoryFallbacks = fallbacks.machinelearning;
  const randomIndex = Math.floor(Math.random() * categoryFallbacks.length);
  return categoryFallbacks[randomIndex];
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
