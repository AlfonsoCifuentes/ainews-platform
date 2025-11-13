/**
 * Quick fix for articles starting with punctuation
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';
import { formatArticleContent } from '../lib/utils/text-formatter';

config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function quickFix() {
  console.log('🔧 Quick fix: cleaning articles with punctuation issues\n');
  
  const { data: articles, error } = await supabase
    .from('news_articles')
    .select('id, title_en, title_es, content_en, content_es')
    .order('published_at', { ascending: false });
  
  if (error || !articles) {
    console.error('❌ Error:', error);
    return;
  }
  
  let fixed = 0;
  
  for (const article of articles) {
    let needsUpdate = false;
    let newContentEn = article.content_en;
    let newContentEs = article.content_es;
    
    // Check if content starts with orphaned punctuation or has issues
    if (article.content_en) {
      const startsWithPunct = /^<p[^>]*>\s*[.,;:!?]/.test(article.content_en);
      if (startsWithPunct) {
        newContentEn = formatArticleContent(article.content_en.replace(/<[^>]+>/g, ''));
        needsUpdate = true;
      }
    }
    
    if (article.content_es) {
      const startsWithPunct = /^<p[^>]*>\s*[.,;:!?]/.test(article.content_es);
      if (startsWithPunct) {
        newContentEs = formatArticleContent(article.content_es.replace(/<[^>]+>/g, ''));
        needsUpdate = true;
      }
    }
    
    if (needsUpdate) {
      await supabase
        .from('news_articles')
        .update({
          content_en: newContentEn,
          content_es: newContentEs
        })
        .eq('id', article.id);
      
      fixed++;
      console.log(`✅ Fixed: ${article.title_en?.substring(0, 50) || article.title_es?.substring(0, 50)}...`);
    }
  }
  
  console.log(`\n✅ Fixed ${fixed} articles`);
}

quickFix()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
