import { createClient } from '@supabase/supabase-js';

async function checkRLS() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log('🔍 Checking RLS policies...\n');

  // Check if RLS is enabled on courses table
  const { data: tables, error: tablesError } = await supabase
    .from('pg_tables')
    .select('tablename, rowsecurity')
    .eq('schemaname', 'public')
    .in('tablename', ['courses', 'course_modules']);

  if (tablesError) {
    console.error('❌ Error checking tables:', tablesError);
  } else {
    console.log('📋 Table RLS Status:');
    tables?.forEach(t => {
      console.log(`   ${t.tablename}: RLS ${t.rowsecurity ? '✅ ENABLED' : '❌ DISABLED'}`);
    });
    console.log('');
  }

  // Check policies
  const { data: policies, error: policiesError } = await supabase.rpc('get_policies');

  if (policiesError) {
    console.log('⚠️  Cannot fetch policies (custom function may not exist)');
    console.log('   This is OK - checking access directly instead...\n');
  } else {
    console.log('📜 RLS Policies:');
    console.log(JSON.stringify(policies, null, 2));
    console.log('');
  }

  // Test access with ANON key (public access)
  const publicSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  console.log('🔐 Testing PUBLIC (anon) access to courses...');
  const { data: publicCourses, error: publicError } = await publicSupabase
    .from('courses')
    .select('id, title_en, status')
    .eq('status', 'published')
    .limit(3);

  if (publicError) {
    console.error('❌ PUBLIC ACCESS BLOCKED:');
    console.error(`   Error: ${publicError.message}`);
    console.error(`   Code: ${publicError.code}`);
    console.error(`   Details: ${publicError.details}`);
    console.error('\n⚠️  THIS IS THE PROBLEM! RLS is blocking public access.');
    console.error('   Solution: Need to add RLS policy for public SELECT on published courses');
  } else {
    console.log(`✅ PUBLIC ACCESS WORKS - Found ${publicCourses?.length || 0} courses`);
    publicCourses?.forEach(c => {
      console.log(`   - ${c.title_en} (${c.id})`);
    });
  }

  console.log('');

  // Test with service role (should always work)
  console.log('🔑 Testing SERVICE ROLE access to courses...');
  const { data: adminCourses, error: adminError } = await supabase
    .from('courses')
    .select('id, title_en, status')
    .eq('status', 'published')
    .limit(3);

  if (adminError) {
    console.error('❌ SERVICE ROLE ACCESS FAILED:', adminError);
  } else {
    console.log(`✅ SERVICE ROLE ACCESS WORKS - Found ${adminCourses?.length || 0} courses`);
    adminCourses?.forEach(c => {
      console.log(`   - ${c.title_en} (${c.id})`);
    });
  }
}

checkRLS().catch(console.error);
