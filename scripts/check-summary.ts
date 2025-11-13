import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSummary() {
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
  
  console.log('\n📰 Title ES:', data.title_es);
  console.log('\n📝 Summary ES:');
  console.log(data.summary_es);
  console.log('\n📏 Summary length:', data.summary_es?.length);
  
  console.log('\n\n📰 Title EN:', data.title_en);
  console.log('\n📝 Summary EN:');
  console.log(data.summary_en);
  console.log('\n📏 Summary length:', data.summary_en?.length);
}

checkSummary().catch(console.error);
