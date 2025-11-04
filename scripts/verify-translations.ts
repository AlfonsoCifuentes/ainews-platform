/**
 * Verify that translations were saved correctly
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verifyTranslations() {
  console.log('Checking translations...\n');

  // Get 5 random articles to verify
  const { data: articles, error } = await supabase
    .from('news_articles')
    .select('id, title_en, title_es, summary_en, summary_es')
    .limit(5);

  if (error) {
    console.error('Error fetching articles:', error);
    return;
  }

  for (const article of articles!) {
    console.log(`Article ID: ${article.id}`);
    console.log(`EN Title: ${article.title_en.substring(0, 80)}...`);
    console.log(`ES Title: ${article.title_es.substring(0, 80)}...`);
    console.log(`Translations match: ${article.title_en === article.title_es ? '❌ NO' : '✓ YES'}\n`);
  }

  // Count articles with proper translations
  const { data: stats } = await supabase
    .from('news_articles')
    .select('id')
    .or('title_en.eq.title_es,content_en.eq.content_es');

  console.log(`Total articles: ${articles!.length}`);
  console.log(`Articles needing translation: ${stats?.length || 0}`);
}

verifyTranslations();
