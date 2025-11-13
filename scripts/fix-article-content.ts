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

async function fixArticleContent() {
  console.log('🔍 Starting article content check and fix...\n');
  console.log('🧹 This will clean and re-format ALL articles\n');
  
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
  
  let cleaned = 0;
  let updated = 0;
  let errors = 0;
  
  // Process each article - FORCE re-format on ALL
  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];
    const progress = `[${i + 1}/${articles.length}]`;
    
    let needsUpdate = false;
    let newContentEn = article.content_en;
    let newContentEs = article.content_es;
    
    // Re-format ALL content to clean navigation/metadata
    if (article.content_en && article.content_en.length > 50) {
      const formatted = formatArticleContent(article.content_en);
      if (formatted !== article.content_en) {
        newContentEn = formatted;
        needsUpdate = true;
        cleaned++;
      }
    } else if (article.summary_en && article.summary_en.length > 50) {
      // No content, generate from summary
      newContentEn = formatArticleContent(generateContentFromSummary(article.summary_en, article.title_en));
      needsUpdate = true;
    }
    
    if (article.content_es && article.content_es.length > 50) {
      const formatted = formatArticleContent(article.content_es);
      if (formatted !== article.content_es) {
        newContentEs = formatted;
        needsUpdate = true;
        cleaned++;
      }
    } else if (article.summary_es && article.summary_es.length > 50) {
      // No content, generate from summary
      newContentEs = formatArticleContent(generateContentFromSummary(article.summary_es, article.title_es));
      needsUpdate = true;
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
        if (i % 20 === 0) {
          console.log(`${progress} ✅ Cleaned: ${article.title_en.substring(0, 50)}...`);
        }
        updated++;
      }
    }
    
    // Add small delay every 50 items
    if (i % 50 === 0 && i > 0) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Summary:');
  console.log('='.repeat(60));
  console.log(`Total articles processed: ${articles.length}`);
  console.log(`🧹 Cleaned & reformatted: ${cleaned}`);
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
