const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(url, serviceKey);

async function checkCourse() {
  try {
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select(`
        id,
        title_en,
        title_es,
        description_en,
        description_es,
        course_modules (
          id,
          order_index,
          title_en,
          title_es,
          content_en,
          content_es,
          type,
          estimated_time,
          resources
        )
      `)
      .eq('id', 'fee98e01-89fb-49b2-b0e7-adafe129069d')
      .single();

    if (courseError) throw courseError;

    console.log('\n========================================');
    console.log('COURSE METADATA');
    console.log('========================================');
    console.log(`Title (EN): ${course.title_en}`);
    console.log(`Title (ES): ${course.title_es}`);
    console.log(`\nDescription (EN):\n${course.description_en}`);
    console.log(`\nDescription (ES):\n${course.description_es}`);
    
    console.log('\n========================================');
    console.log('MODULE ANALYSIS');
    console.log('========================================');
    console.log(`Total modules: ${course.course_modules.length}\n`);

    let totalContentChars = 0;
    let emptyModules = 0;

    course.course_modules.forEach((mod, i) => {
      const contentLen = (mod.content_en || '').length;
      totalContentChars += contentLen;
      
      console.log(`\n--- MODULE ${i + 1}: ${mod.title_en} ---`);
      console.log(`Order: ${mod.order_index}`);
      console.log(`Type: ${mod.type}`);
      console.log(`Estimated time: ${mod.estimated_time}`);
      console.log(`Content length (EN): ${contentLen} chars`);
      console.log(`Resources: ${mod.resources ? JSON.stringify(mod.resources).substring(0, 100) : 'NONE'}`);
      
      if (contentLen === 0) {
        console.log(`❌ STATUS: EMPTY - NO CONTENT`);
        emptyModules++;
      } else if (contentLen < 500) {
        console.log(`⚠️  STATUS: VERY SHORT (${contentLen} chars)`);
      } else if (contentLen < 2000) {
        console.log(`⚠️  STATUS: SHORT (${contentLen} chars)`);
      } else {
        console.log(`✅ STATUS: ADEQUATE (${contentLen} chars)`);
      }
      
      if (contentLen > 0) {
        const preview = (mod.content_en || '').substring(0, 150).replace(/\n/g, ' ');
        console.log(`Preview: "${preview}..."`);
      }
    });

    console.log('\n\n========================================');
    console.log('SUMMARY');
    console.log('========================================');
    console.log(`Total modules: ${course.course_modules.length}`);
    console.log(`Total content characters: ${totalContentChars}`);
    console.log(`Empty modules: ${emptyModules} / ${course.course_modules.length}`);
    console.log(`Average content per module: ${Math.round(totalContentChars / course.course_modules.length)} chars`);
    console.log('\n');

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkCourse();
