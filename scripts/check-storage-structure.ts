#!/usr/bin/env tsx
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
  // List root level
  const { data: root, error } = await supabase.storage
    .from('module-illustrations')
    .list('', { limit: 10 });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Root files (first 10):');
  console.log(JSON.stringify(root, null, 2));

  // Check if items are folders (no extension, have metadata.size = 0)
  if (root && root[0]) {
    const firstItem = root[0];
    console.log('\nFirst item details:', firstItem);

    // Try listing inside if it's a folder
    const { data: inside } = await supabase.storage
      .from('module-illustrations')
      .list(firstItem.name, { limit: 5 });

    if (inside && inside.length > 0) {
      console.log(`\nInside "${firstItem.name}":`);
      console.log(JSON.stringify(inside, null, 2));
    } else {
      console.log(`\n"${firstItem.name}" is a file, not a folder`);
    }
  }
}

check();
