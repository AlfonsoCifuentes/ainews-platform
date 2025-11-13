import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkArticle() {
  // Get one article with "Pagar con gafas" in title
  const { data, error } = await supabase
    .from('news_articles')
    .select('*')
    .ilike('title_es', '%Pagar con gafas%')
    .limit(1)
    .single();
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('\n📰 Article Title:', data.title_es);
  console.log('\n📝 Content ES length:', data.content_es?.length || 0);
  console.log('\n📄 Content ES (first 500 chars):');
  console.log(data.content_es?.substring(0, 500));
  console.log('\n\n📄 Content ES (next 500 chars):');
  console.log(data.content_es?.substring(500, 1000));
  
  // Check for paragraph tags
  const hasPTags = data.content_es?.includes('<p');
  const hasLineBreaks = data.content_es?.includes('\n\n');
  
  console.log('\n\n🔍 Format Check:');
  console.log('Has <p> tags:', hasPTags);
  console.log('Has line breaks:', hasLineBreaks);
}

checkArticle().catch(console.error);
