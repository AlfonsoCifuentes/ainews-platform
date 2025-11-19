const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(url, serviceKey);

async function check() {
  const { data: courses, error } = await supabase
    .from('courses')
    .select('*')
    .limit(1);

  if (error) console.error('courses error:', error);
  if (courses) console.log('courses columns:', Object.keys(courses[0]));

  const { data: modules, error: modError } = await supabase
    .from('course_modules')
    .select('*')
    .limit(1);

  if (modError) console.error('course_modules error:', modError);
  if (modules) console.log('course_modules columns:', Object.keys(modules[0]));
}

check();
