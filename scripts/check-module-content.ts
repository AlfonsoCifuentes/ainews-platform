/**
 * Simple Course Module Content Checker
 * Checks all modules and identifies which ones need content regeneration
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MIN_LENGTH = {
  article: 2500,
  video: 1500,
  quiz: 800
};

async function checkModules() {
  console.log('\n🔍 Checking all course modules...\n');

  const { data: courses, error } = await supabase
    .from('courses')
    .select(`
      id,
      title_en,
      difficulty,
      course_modules (
        id,
        order_index,
        title_en,
        content_en,
        content_es,
        type,
        estimated_time
      )
    `)
    .order('created_at', { ascending: true });

  if (error || !courses) {
    console.error('❌ Error:', error);
    return;
  }

  console.log(`📚 Found ${courses.length} courses\n`);

  let totalModules = 0;
  let needsWork = 0;

  for (const course of courses) {
    const mods = (course as any).course_modules || [];
    console.log(`\n📖 ${course.title_en} (${mods.length} modules)`);

    for (const mod of mods) {
      totalModules++;
      const lenEn = mod.content_en?.length || 0;
      const lenEs = mod.content_es?.length || 0;
      const minLen = MIN_LENGTH[mod.type as keyof typeof MIN_LENGTH] || 1000;

      const status = (lenEn < minLen || lenEs < minLen) ? '🔴 NEEDS WORK' : '✅ OK';
      
      if (lenEn < minLen || lenEs < minLen) needsWork++;

      console.log(`   ${status} ${mod.order_index}. ${mod.title_en}`);
      console.log(`      Type: ${mod.type} | EN: ${lenEn} | ES: ${lenEs} | Min: ${minLen}`);
    }
  }

  console.log(`\n\n═══════════════════════════════════════════`);
  console.log(`📊 SUMMARY`);
  console.log(`═══════════════════════════════════════════`);
  console.log(`Total modules: ${totalModules}`);
  console.log(`Needs work: ${needsWork} (${((needsWork / totalModules) * 100).toFixed(1)}%)`);
  console.log(`Ready: ${totalModules - needsWork} (${(((totalModules - needsWork) / totalModules) * 100).toFixed(1)}%)`);
  console.log(`═══════════════════════════════════════════\n`);
}

checkModules()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
