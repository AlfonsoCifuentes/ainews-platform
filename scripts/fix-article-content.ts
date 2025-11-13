/**
 * Fix Article Content Script
 * 
 * This script:
 * 1. Checks all articles in the database
 * 2. Identifies articles with missing or incomplete content
 * 3. Generates content for articles that need it
 * 4. Applies proper paragraph formatting to all articles
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';
import { formatArticleContent } from '../lib/utils/text-formatter';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface Article {
  id: string;
  title_en: string;
  title_es: string;
  summary_en: string;
  summary_es: string;
  content_en: string | null;
  content_es: string | null;
  source_url: string | null;
  category: string;
}

/**
 * Generate content from summary if content is missing
 */
function generateContentFromSummary(summary: string, title: string): string {
  if (!summary || summary.trim().length === 0) {
    return `This article about ${title} provides insights into recent developments in AI and technology.`;
  }
  
  // If content is missing, create a basic article structure from summary
  const paragraphs = summary.split('. ').filter(s => s.trim());
  
  if (paragraphs.length <= 2) {
    // Short summary - just use it as is
    return summary;
  }
  
  // Create multiple paragraphs from summary
  const intro = paragraphs.slice(0, 2).join('. ') + '.';
  const body = paragraphs.slice(2).join('. ') + (paragraphs[paragraphs.length - 1].endsWith('.') ? '' : '.');
  
  return `${intro}\n\n${body}`;
}

/**
 * Fetch article content from source URL using LLM
 */
async function fetchAndExtractContent(sourceUrl: string, title: string): Promise<string | null> {
  try {
    // Try to fetch the page content
    const response = await fetch(sourceUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });
    
    if (!response.ok) {
      console.log(`   ⚠️  Failed to fetch: ${response.status}`);
      return null;
    }
    
    const html = await response.text();
    
    // Basic extraction of text content from HTML
    // Remove script and style tags
    let text = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Find content that looks like article text (heuristic)
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 50);
    
    if (sentences.length < 3) {
      return null;
    }
    
    // Take first 10-15 sentences as article content
    const content = sentences.slice(0, 12).join('. ') + '.';
    
    return content.length > 200 ? content : null;
  } catch (error) {
    console.log(`   ⚠️  Error fetching: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return null;
  }
}

/**
 * Check if content needs formatting
 */
function needsFormatting(content: string | null): boolean {
  if (!content) return true;
  if (content.length < 100) return true;
  
  // Check if already has paragraph structure
  const hasLineBreaks = content.includes('\n\n') || content.includes('</p>');
  const hasListStructure = content.includes('<ul>') || content.includes('<ol>');
  
  // If it's just one long block of text, it needs formatting
  if (!hasLineBreaks && !hasListStructure && content.length > 500) {
    return true;
  }
  
  return false;
}

async function fixArticleContent() {
  console.log('🔍 Starting article content check and fix...\n');
  
  // Fetch all articles
  const { data: articles, error } = await supabase
    .from('news_articles')
    .select('id, title_en, title_es, summary_en, summary_es, content_en, content_es, source_url, category')
    .order('published_at', { ascending: false });
  
  if (error) {
    console.error('❌ Error fetching articles:', error);
    return;
  }
  
  if (!articles || articles.length === 0) {
    console.log('📭 No articles found in database');
    return;
  }
  
  console.log(`📊 Total articles: ${articles.length}\n`);
  
  let missingContent = 0;
  let needsFormatCount = 0;
  let updated = 0;
  let errors = 0;
  
  // Process each article
  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];
    const progress = `[${i + 1}/${articles.length}]`;
    
    let needsUpdate = false;
    let newContentEn = article.content_en;
    let newContentEs = article.content_es;
    
    // Check English content
    if (!article.content_en || article.content_en.trim().length < 100) {
      console.log(`${progress} ⚠️  Missing EN content: ${article.title_en.substring(0, 50)}...`);
      missingContent++;
      
      // Try to generate content
      if (article.summary_en && article.summary_en.length > 50) {
        newContentEn = generateContentFromSummary(article.summary_en, article.title_en);
        console.log(`   ✅ Generated content from summary (${newContentEn.length} chars)`);
        needsUpdate = true;
      } else if (article.source_url) {
        console.log(`   🌐 Attempting to fetch from source...`);
        const fetchedContent = await fetchAndExtractContent(article.source_url, article.title_en);
        if (fetchedContent) {
          newContentEn = fetchedContent;
          console.log(`   ✅ Fetched content (${newContentEn.length} chars)`);
          needsUpdate = true;
        }
      }
    } else if (needsFormatting(article.content_en)) {
      needsFormatCount++;
      // Content exists but needs formatting - we'll format it later
    }
    
    // Check Spanish content
    if (!article.content_es || article.content_es.trim().length < 100) {
      if (article.summary_es && article.summary_es.length > 50) {
        newContentEs = generateContentFromSummary(article.summary_es, article.title_es);
        needsUpdate = true;
      } else if (newContentEn && newContentEn !== article.content_en) {
        // Use same content as English if we just generated it
        newContentEs = newContentEn;
        needsUpdate = true;
      }
    }
    
    // Apply formatting to all content
    if (newContentEn) {
      const formatted = formatArticleContent(newContentEn);
      if (formatted !== newContentEn) {
        newContentEn = formatted;
        needsUpdate = true;
      }
    }
    
    if (newContentEs) {
      const formatted = formatArticleContent(newContentEs);
      if (formatted !== newContentEs) {
        newContentEs = formatted;
        needsUpdate = true;
      }
    }
    
    // Update article if needed
    if (needsUpdate) {
      const { error: updateError } = await supabase
        .from('news_articles')
        .update({
          content_en: newContentEn,
          content_es: newContentEs,
          updated_at: new Date().toISOString()
        })
        .eq('id', article.id);
      
      if (updateError) {
        console.log(`${progress} ❌ Error updating: ${updateError.message}`);
        errors++;
      } else {
        console.log(`${progress} ✅ Updated: ${article.title_en.substring(0, 50)}...`);
        updated++;
      }
    }
    
    // Add small delay to avoid rate limiting
    if (i % 10 === 0 && i > 0) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Summary:');
  console.log('='.repeat(60));
  console.log(`Total articles processed: ${articles.length}`);
  console.log(`Missing content found: ${missingContent}`);
  console.log(`Needed formatting: ${needsFormatCount}`);
  console.log(`✅ Successfully updated: ${updated}`);
  console.log(`❌ Errors: ${errors}`);
  console.log('='.repeat(60));
}

// Run the script
fixArticleContent()
  .then(() => {
    console.log('\n✨ Article content fix completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
