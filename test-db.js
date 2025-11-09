const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://yabsciwdpblqzskfupnj.supabase.co',
  'sb_publishable_Nr54RILzCB2u_sO5gSjUpQ_5LdCWDJg'
);

(async () => {
  console.log('Testing database connection...');

  // Check courses
  const { data: courses, error: coursesError } = await supabase
    .from('courses')
    .select('id, title_en, title_es')
    .limit(3);

  console.log('Courses:', courses);
  console.log('Courses Error:', coursesError);

  // Check course_modules
  const { data: modules, error: modulesError } = await supabase
    .from('course_modules')
    .select('id, course_id, title_en, content_en')
    .limit(3);

  console.log('Modules:', modules);
  console.log('Modules Error:', modulesError);

})();