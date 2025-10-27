import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local from project root
config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkArticles() {
  console.log('🔍 Checking news_articles table...\n');
  
  // Count total articles
  const { count, error: countError } = await supabase
    .from('news_articles')
    .select('*', { count: 'exact', head: true });
  
  if (countError) {
    console.error('❌ Error counting articles:', countError);
    return;
  }
  
  console.log(`📊 Total articles in DB: ${count}`);
  
  // Get sample of recent articles
  const { data, error } = await supabase
    .from('news_articles')
    .select('id, title_en, published_at, category, ai_generated')
    .order('published_at', { ascending: false })
    .limit(5);
  
  if (error) {
    console.error('❌ Error fetching articles:', error);
    return;
  }
  
  console.log('\n📰 Recent 5 articles:');
  data?.forEach((article, i) => {
    console.log(`  ${i + 1}. ${article.title_en.substring(0, 60)}...`);
    console.log(`     Category: ${article.category} | AI: ${article.ai_generated ? 'Yes' : 'No'} | Date: ${article.published_at}`);
  });
}

checkArticles().catch(console.error);
