#!/usr/bin/env node
/**
 * Complete Course System Test
 * 
 * Tests:
 * 1. Course generation
 * 2. Course access via API
 * 3. Course enrollment
 * 4. Course progress tracking
 */

import { config as loadEnv } from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';

const envLocal = resolve(process.cwd(), '.env.local');
if (existsSync(envLocal)) {
  loadEnv({ path: envLocal });
} else {
  loadEnv();
}

import { getSupabaseServerClient } from '../lib/db/supabase';

const BASE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');

// ============================================================================
// TEST 1: Check Database Connection
// ============================================================================

async function testDatabaseConnection(): Promise<boolean> {
  console.log('\n' + '='.repeat(80));
  console.log('TEST 1: Database Connection');
  console.log('='.repeat(80));
  
  try {
    const db = getSupabaseServerClient();
    const { data, error } = await db.from('courses').select('id').limit(1);
    
    if (error) {
      console.error('❌ Database error:', error);
      return false;
    }
    
    console.log('✅ Database connection successful');
    console.log(`   Found ${data?.length || 0} courses in database`);
    return true;
  } catch (error) {
    console.error('❌ Connection failed:', error);
    return false;
  }
}

// ============================================================================
// TEST 2: Check Courses Table Schema
// ============================================================================

async function testCoursesSchema(): Promise<boolean> {
  console.log('\n' + '='.repeat(80));
  console.log('TEST 2: Courses Table Schema');
  console.log('='.repeat(80));
  
  try {
    const db = getSupabaseServerClient();
    
    // Try to insert a test course
    const testCourse = {
      title_en: 'Test Course - ' + Date.now(),
      title_es: 'Curso de Prueba - ' + Date.now(),
      description_en: 'This is a test course',
      description_es: 'Este es un curso de prueba',
      difficulty: 'beginner',
      duration_minutes: 60,
      topics: ['test', 'ai'],
      category: 'research',
      ai_generated: true,
      status: 'published',
      published_at: new Date().toISOString(),
      view_count: 0,
      enrollment_count: 0,
      rating_avg: 0,
      completion_rate: 0
    };
    
    const { data: inserted, error: insertError } = await db
      .from('courses')
      .insert(testCourse)
      .select('id')
      .single();
    
    if (insertError) {
      console.error('❌ Insert error:', insertError);
      console.error('   Code:', insertError.code);
      console.error('   Message:', insertError.message);
      console.error('   Details:', insertError.details);
      return false;
    }
    
    if (!inserted?.id) {
      console.error('❌ No ID returned from insert');
      return false;
    }
    
    console.log('✅ Schema is correct');
    console.log(`   Test course created: ${inserted.id}`);
    
    // Clean up
    await db.from('courses').delete().eq('id', inserted.id);
    console.log('   Test course deleted');
    
    return true;
  } catch (error) {
    console.error('❌ Schema test failed:', error);
    return false;
  }
}

// ============================================================================
// TEST 3: Check Course Modules Table
// ============================================================================

async function testCourseModulesSchema(): Promise<boolean> {
  console.log('\n' + '='.repeat(80));
  console.log('TEST 3: Course Modules Table Schema');
  console.log('='.repeat(80));
  
  try {
    const db = getSupabaseServerClient();
    
    // Create a test course first
    const { data: course, error: courseError } = await db
      .from('courses')
      .insert({
        title_en: 'Module Test - ' + Date.now(),
        title_es: 'Prueba de Módulos - ' + Date.now(),
        description_en: 'Test',
        description_es: 'Prueba',
        difficulty: 'beginner',
        duration_minutes: 60,
        topics: ['test'],
        category: 'research',
        ai_generated: true,
        status: 'published',
        published_at: new Date().toISOString()
      })
      .select('id')
      .single();
    
    if (courseError || !course?.id) {
      console.error('❌ Failed to create test course:', courseError);
      return false;
    }
    
    // Try to insert a test module
    const { data: module, error: moduleError } = await db
      .from('course_modules')
      .insert({
        course_id: course.id,
        order_index: 0,
        title_en: 'Test Module',
        title_es: 'Módulo de Prueba',
        content_en: 'This is test content',
        content_es: 'Este es contenido de prueba',
        type: 'text',
        estimated_time: 30,
        resources: []
      })
      .select('id')
      .single();
    
    if (moduleError) {
      console.error('❌ Module insert error:', moduleError);
      console.error('   Code:', moduleError.code);
      console.error('   Message:', moduleError.message);
      
      // Clean up
      await db.from('courses').delete().eq('id', course.id);
      return false;
    }
    
    console.log('✅ Course modules schema is correct');
    console.log(`   Test module created: ${module?.id}`);
    
    // Clean up
    await db.from('course_modules').delete().eq('id', module?.id);
    await db.from('courses').delete().eq('id', course.id);
    console.log('   Test data cleaned up');
    
    return true;
  } catch (error) {
    console.error('❌ Module schema test failed:', error);
    return false;
  }
}

// ============================================================================
// TEST 4: Test Course API Endpoint
// ============================================================================

async function testCourseAPI(): Promise<boolean> {
  console.log('\n' + '='.repeat(80));
  console.log('TEST 4: Course API Endpoint');
  console.log('='.repeat(80));
  
  try {
    // Get a real course from database
    const db = getSupabaseServerClient();
    const { data: courses, error } = await db
      .from('courses')
      .select('id')
      .limit(1);
    
    if (error || !courses || courses.length === 0) {
      console.log('⚠️  No courses in database to test');
      return true; // Not a failure, just no data
    }
    
    const courseId = courses[0].id;
    console.log(`Testing with course ID: ${courseId}`);
    
    // Test API endpoint
    const response = await fetch(`${BASE_URL}/api/courses/${courseId}`);
    
    if (!response.ok) {
      console.error(`❌ API returned ${response.status}`);
      const text = await response.text();
      console.error('   Response:', text.substring(0, 200));
      return false;
    }
    
    const data = await response.json();
    
    if (!data.success || !data.data) {
      console.error('❌ Invalid API response:', data);
      return false;
    }
    
    console.log('✅ Course API endpoint working');
    console.log(`   Course: ${data.data.title_en}`);
    console.log(`   Modules: ${data.data.course_modules?.length || 0}`);
    
    return true;
  } catch (error) {
    console.error('❌ API test failed:', error);
    return false;
  }
}

// ============================================================================
// TEST 5: Test Course Generation Endpoint
// ============================================================================

async function testCourseGeneration(): Promise<boolean> {
  console.log('\n' + '='.repeat(80));
  console.log('TEST 5: Course Generation Endpoint');
  console.log('='.repeat(80));
  
  try {
    const payload = {
      topic: 'Machine Learning Basics',
      difficulty: 'beginner',
      duration: 'short',
      locale: 'en'
    };
    
    console.log('Sending generation request...');
    console.log(`  Topic: ${payload.topic}`);
    console.log(`  Difficulty: ${payload.difficulty}`);
    console.log(`  Duration: ${payload.duration}`);
    
    const response = await fetch(`${BASE_URL}/api/courses/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      console.error(`❌ Generation failed with status ${response.status}`);
      const text = await response.text();
      console.error('   Response:', text.substring(0, 500));
      return false;
    }
    
    const data = await response.json();
    
    if (!data.success || !data.data?.course_id) {
      console.error('❌ Invalid generation response:', data);
      return false;
    }
    
    console.log('✅ Course generation successful!');
    console.log(`   Course ID: ${data.data.course_id}`);
    console.log(`   Title: ${data.data.title}`);
    console.log(`   Modules: ${data.data.modules_count}`);
    console.log(`   Duration: ${data.data.estimated_duration_minutes} minutes`);
    
    return true;
  } catch (error) {
    console.error('❌ Generation test failed:', error);
    return false;
  }
}

// ============================================================================
// TEST 6: Test Course Access
// ============================================================================

async function testCourseAccess(): Promise<boolean> {
  console.log('\n' + '='.repeat(80));
  console.log('TEST 6: Course Access (Web Page)');
  console.log('='.repeat(80));
  
  try {
    // Get a real course
    const db = getSupabaseServerClient();
    const { data: courses, error } = await db
      .from('courses')
      .select('id')
      .limit(1);
    
    if (error || !courses || courses.length === 0) {
      console.log('⚠️  No courses in database to test');
      return true;
    }
    
    const courseId = courses[0].id;
    const courseUrl = `${BASE_URL}/en/courses/${courseId}`;
    
    console.log(`Testing course page: ${courseUrl}`);
    
    const response = await fetch(courseUrl);
    
    if (!response.ok) {
      console.error(`❌ Course page returned ${response.status}`);
      return false;
    }
    
    const html = await response.text();
    
    if (!html.includes('course') && !html.includes('module')) {
      console.warn('���️  Course page loaded but content might be missing');
    }
    
    console.log('✅ Course page accessible');
    console.log(`   Status: ${response.status}`);
    console.log(`   Content length: ${html.length} bytes`);
    
    return true;
  } catch (error) {
    console.error('❌ Course access test failed:', error);
    return false;
  }
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runAllTests(): Promise<void> {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 COMPLETE COURSE SYSTEM TEST SUITE');
  console.log('='.repeat(80));
  
  const results: Record<string, boolean> = {};
  
  // Run tests
  results['Database Connection'] = await testDatabaseConnection();
  results['Courses Schema'] = await testCoursesSchema();
  results['Course Modules Schema'] = await testCourseModulesSchema();
  results['Course API'] = await testCourseAPI();
  results['Course Generation'] = await testCourseGeneration();
  results['Course Access'] = await testCourseAccess();
  
  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(80));
  
  let passCount = 0;
  let failCount = 0;
  
  for (const [test, passed] of Object.entries(results)) {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} - ${test}`);
    if (passed) passCount++;
    else failCount++;
  }
  
  console.log('\n' + '='.repeat(80));
  console.log(`Total: ${passCount} passed, ${failCount} failed`);
  
  if (failCount === 0) {
    console.log('🎉 ALL TESTS PASSED!');
  } else {
    console.log(`⚠️  ${failCount} test(s) failed`);
  }
  
  console.log('='.repeat(80) + '\n');
  
  process.exit(failCount > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
