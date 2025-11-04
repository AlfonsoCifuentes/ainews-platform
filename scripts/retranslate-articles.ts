import { config as loadEnv } from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';

const envLocal = resolve(process.cwd(), '.env.local');
if (existsSync(envLocal)) {
  loadEnv({ path: envLocal });
} else {
  loadEnv();
}

import { getSupabaseServerClient } from '../lib/db/supabase';
import { translateArticle, detectLanguage } from '../lib/ai/translator';
import pLimit from 'p-limit';

async function main() {
  console.log('Starting retranslation with Google Translate...');

  const db = getSupabaseServerClient();
  
  // Fetch ALL articles and filter in JavaScript since Supabase column comparison doesn't work
  const { data, error } = await db
    .from('news_articles')
    .select('id, title_en, title_es, summary_en, summary_es, content_en, content_es')
    .order('published_at', { ascending: false });

  if (error) {
    console.error('Error fetching articles:', error);
    return;
  }

  // Filter articles where EN === ES (not translated)
  const need = data?.filter(a => 
    a.title_en === a.title_es || 
    a.summary_en === a.summary_es || 
    a.content_en === a.content_es
  ) || [];
  
  console.log(`Total articles: ${data?.length || 0}`);
  console.log(`Need translation: ${need.length}`);

  if (need.length === 0) {
    console.log('✓ All articles are properly translated!');
    return;
  }

  const limit = pLimit(5);
  let success = 0;

  await Promise.all(need.map(a => limit(async () => {
    try {
      // Detect the actual language of the content
      const sourceLang = await detectLanguage(a.title_en);
      
      // Translate to the opposite language
      if (sourceLang === 'en') {
        // Content is in English, translate to Spanish
        const translated = await translateArticle(
          a.title_en,
          a.summary_en,
          a.content_en,
          'en',
          'es'
        );
        
        await db.from('news_articles').update({
          title_es: translated.title,
          summary_es: translated.summary,
          content_es: translated.content
        }).eq('id', a.id);
        
        console.log(`✓ EN→ES: ${a.title_en.slice(0, 50)}...`);
      } else {
        // Content is in Spanish, translate to English
        const translated = await translateArticle(
          a.title_en, // Actually contains Spanish
          a.summary_en, // Actually contains Spanish
          a.content_en, // Actually contains Spanish
          'es',
          'en'
        );
        
        // Swap: put Spanish in ES columns, English in EN columns
        await db.from('news_articles').update({
          title_en: translated.title,
          summary_en: translated.summary,
          content_en: translated.content,
          title_es: a.title_en, // Move original Spanish here
          summary_es: a.summary_en,
          content_es: a.content_en
        }).eq('id', a.id);
        
        console.log(`✓ ES→EN: ${a.title_en.slice(0, 50)}...`);
      }
      
      success++;
    } catch (error) {
      console.error(`✗ Failed: ${a.title_en.slice(0, 50)}`, error instanceof Error ? error.message : '');
    }
  })));

  console.log(`\n✓ Done: ${success}/${need.length} articles translated`);
}

main().catch(console.error);
