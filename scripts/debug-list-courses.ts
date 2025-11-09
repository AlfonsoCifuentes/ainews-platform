/**
 * Quick utility to inspect course records in Supabase.
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing Supabase configuration');
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  const { data, error } = await supabase
    .from('courses')
    .select('id, title_en, status, created_at, published_at')
    .limit(5);

  if (error) {
    console.error('Error fetching courses:', error.message);
    return;
  }

  console.table(data || []);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
