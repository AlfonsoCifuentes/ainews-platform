/**
 * Quick script to count articles in the database
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  // Get total count
  const { count, error } = await supabase
    .from('news_articles')
    .select('*', { count: 'exact', head: true });
  
  if (error) {
    console.error('Error:', error.message);
    return;
  }
  
  console.log(`\n📊 Total articles: ${count}\n`);
  
  // Get recent articles
  const { data: recent, error: recentError } = await supabase
    .from('news_articles')
    .select('title_en, created_at, source_url')
    .order('created_at', { ascending: false })
    .limit(10);

  if (recentError) {
    console.error('Error fetching recent articles:', recentError.message);
    return;
  }
  
  if (recent && recent.length > 0) {
    console.log('🆕 Recent articles:');
    for (const article of recent) {
      const title = article.title_en?.substring(0, 60) || 'No title';
      const date = new Date(article.created_at).toISOString().split('T')[0];
      const source = article.source_url || 'unknown-source';
      console.log(`  - [${date}] ${source}: ${title}...`);
    }
  }
  
  // Count by date
  const { data: byDate } = await supabase
    .from('news_articles')
    .select('created_at')
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
  
  if (byDate) {
    console.log(`\n📅 Articles added in last 7 days: ${byDate.length}`);
  }
}

main();
