/**
 * Verify Article Formatting Script
 * 
 * This script verifies that articles have proper paragraph formatting
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyFormatting() {
  console.log('🔍 Verifying article formatting...\n');
  
  // Get sample of recent articles
  const { data: articles, error } = await supabase
    .from('news_articles')
    .select('id, title_en, content_en')
    .order('published_at', { ascending: false })
    .limit(10);
  
  if (error) {
    console.error('❌ Error fetching articles:', error);
    return;
  }
  
  if (!articles || articles.length === 0) {
    console.log('📭 No articles found');
    return;
  }
  
  console.log(`📊 Checking ${articles.length} recent articles:\n`);
  
  let wellFormatted = 0;
  let needsImprovement = 0;
  
  for (const article of articles) {
    const hasParagraphs = article.content_en?.includes('<p') || article.content_en?.includes('\n\n');
    const hasLists = article.content_en?.includes('<ul>') || article.content_en?.includes('<ol>');
    const contentLength = article.content_en?.length || 0;
    
    const isWellFormatted = hasParagraphs && contentLength > 100;
    
    if (isWellFormatted) {
      wellFormatted++;
      console.log(`✅ ${article.title_en.substring(0, 60)}...`);
      console.log(`   Length: ${contentLength} chars | Paragraphs: Yes | Lists: ${hasLists ? 'Yes' : 'No'}`);
    } else {
      needsImprovement++;
      console.log(`⚠️  ${article.title_en.substring(0, 60)}...`);
      console.log(`   Length: ${contentLength} chars | Paragraphs: ${hasParagraphs ? 'Yes' : 'No'}`);
    }
    
    // Show preview of first 200 characters
    if (article.content_en) {
      const preview = article.content_en
        .replace(/<[^>]+>/g, '')
        .substring(0, 200)
        .trim();
      console.log(`   Preview: ${preview}...`);
    }
    console.log('');
  }
  
  console.log('='.repeat(60));
  console.log(`✅ Well formatted: ${wellFormatted}`);
  console.log(`⚠️  Needs improvement: ${needsImprovement}`);
  console.log('='.repeat(60));
}

verifyFormatting()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
