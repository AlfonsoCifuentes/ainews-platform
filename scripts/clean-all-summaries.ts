/**
 * Clean summaries and content from all articles
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';
import { formatArticleContent } from '../lib/utils/text-formatter';

config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Clean summary text
 */
function cleanSummary(summary: string): string {
  if (!summary) return summary;
  
  let cleaned = summary;
  
  // Remove "La entrada [Title]" at the end
  cleaned = cleaned.replace(/La entrada [^.]*$/gi, '');
  cleaned = cleaned.replace(/The entry [^.]*$/gi, '');
  cleaned = cleaned.replace(/Leer más[^.]*$/gi, '');
  cleaned = cleaned.replace(/Read more[^.]*$/gi, '');
  
  // Remove navigation breadcrumbs
  cleaned = cleaned.replace(/^(Inicio|Home|Technology|Tecnología|News|Noticias|Category|Categoría|Dispositivos con IA|Devices with AI)\s*/gi, '');
  
  // Remove social sharing
  cleaned = cleaned.replace(/(Share|Compartir|Cuota)\s*(Twitter|Facebook|Pinterest|WhatsApp|LinkedIn|Telegram)*/gi, '');
  cleaned = cleaned.replace(/Copy\s*(URL|Link)/gi, '');
  
  // Remove timestamps
  cleaned = cleaned.replace(/ChatGPT\s+\d{1,2}\s+de\s+\w+\s+de\s+\d{4}/gi, '');
  
  // Clean trailing/leading punctuation
  cleaned = cleaned.replace(/^\s*[.,;:!?]+\s*/g, '');
  cleaned = cleaned.replace(/\s*[.,;:!?]+\s*$/g, '.');
  
  // Normalize spaces
  cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();
  
  // Ensure it ends with period
  if (cleaned && !cleaned.match(/[.!?]$/)) {
    cleaned += '.';
  }
  
  return cleaned;
}

async function cleanAllSummaries() {
  console.log('🧹 Cleaning summaries and content from all articles...\n');
  
  const { data: articles, error } = await supabase
    .from('news_articles')
    .select('id, title_en, title_es, summary_en, summary_es, content_en, content_es')
    .order('published_at', { ascending: false });
  
  if (error || !articles) {
    console.error('❌ Error:', error);
    return;
  }
  
  console.log(`📊 Total articles: ${articles.length}\n`);
  
  let summariesCleaned = 0;
  let contentCleaned = 0;
  let updated = 0;
  
  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];
    const progress = `[${i + 1}/${articles.length}]`;
    
    let needsUpdate = false;
    let newSummaryEn = article.summary_en;
    let newSummaryEs = article.summary_es;
    let newContentEn = article.content_en;
    let newContentEs = article.content_es;
    
    // Clean summaries
    if (article.summary_en) {
      const cleaned = cleanSummary(article.summary_en);
      if (cleaned !== article.summary_en) {
        newSummaryEn = cleaned;
        needsUpdate = true;
        summariesCleaned++;
      }
    }
    
    if (article.summary_es) {
      const cleaned = cleanSummary(article.summary_es);
      if (cleaned !== article.summary_es) {
        newSummaryEs = cleaned;
        needsUpdate = true;
        summariesCleaned++;
      }
    }
    
    // Re-clean content
    if (article.content_en) {
      const formatted = formatArticleContent(article.content_en.replace(/<[^>]+>/g, ''));
      if (formatted !== article.content_en) {
        newContentEn = formatted;
        needsUpdate = true;
        contentCleaned++;
      }
    }
    
    if (article.content_es) {
      const formatted = formatArticleContent(article.content_es.replace(/<[^>]+>/g, ''));
      if (formatted !== article.content_es) {
        newContentEs = formatted;
        needsUpdate = true;
        contentCleaned++;
      }
    }
    
    if (needsUpdate) {
      const { error: updateError } = await supabase
        .from('news_articles')
        .update({
          summary_en: newSummaryEn,
          summary_es: newSummaryEs,
          content_en: newContentEn,
          content_es: newContentEs,
          updated_at: new Date().toISOString()
        })
        .eq('id', article.id);
      
      if (updateError) {
        console.log(`${progress} ❌ Error: ${updateError.message}`);
      } else {
        updated++;
        if (updated % 20 === 0) {
          console.log(`${progress} ✅ Cleaned: ${article.title_en?.substring(0, 50)}...`);
        }
      }
    }
    
    // Small delay every 50 items
    if (i % 50 === 0 && i > 0) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 Summary:');
  console.log('='.repeat(60));
  console.log(`Total articles processed: ${articles.length}`);
  console.log(`🧹 Summaries cleaned: ${summariesCleaned}`);
  console.log(`📝 Content re-cleaned: ${contentCleaned}`);
  console.log(`✅ Successfully updated: ${updated}`);
  console.log('='.repeat(60));
}

cleanAllSummaries()
  .then(() => {
    console.log('\n✨ Cleaning completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
