#!/usr/bin/env node

/**
 * Test courses API with exact same parameters as browser
 * Run: npx tsx scripts/test-courses-api-direct.ts
 */

const BASE_URL = 'http://localhost:3000'; // Change to Vercel URL when testing in production

async function test() {
  console.log('🧪 Testing courses API endpoint...\n');

  try {
    // Test 1: Health check
    console.log('Test 1️⃣ Health Check');
    const healthUrl = `${BASE_URL}/api/courses/health`;
    console.log(`  URL: ${healthUrl}`);
    const healthRes = await fetch(healthUrl);
    console.log(`  Status: ${healthRes.status} ${healthRes.statusText}`);
    const healthData = await healthRes.json();
    console.log(`  Response: ${JSON.stringify(healthData, null, 2)}\n`);

    // Test 2: Get courses with parameters (as browser sends)
    console.log('Test 2️⃣ Get Courses');
    const coursesParams = new URLSearchParams({
      locale: 'en',
      limit: '20',
      offset: '0',
      sort: 'newest'
    });
    const coursesUrl = `${BASE_URL}/api/courses?${coursesParams.toString()}`;
    console.log(`  URL: ${coursesUrl}`);
    const coursesRes = await fetch(coursesUrl);
    console.log(`  Status: ${coursesRes.status} ${coursesRes.statusText}`);
    
    if (!coursesRes.ok) {
      const errorText = await coursesRes.text();
      console.log(`  Error: ${errorText}`);
    } else {
      const coursesData = await coursesRes.json();
      console.log(`  Success: ${coursesData.success}`);
      console.log(`  Courses found: ${coursesData.data?.length || 0}`);
      console.log(`  Total available: ${coursesData.pagination?.total || 0}\n`);
    }

    // Test 3: Detect models
    console.log('Test 3️⃣ Detect Models');
    const modelsUrl = `${BASE_URL}/api/courses/detect-models`;
    console.log(`  URL: ${modelsUrl}`);
    const modelsRes = await fetch(modelsUrl);
    console.log(`  Status: ${modelsRes.status} ${modelsRes.statusText}`);
    
    if (modelsRes.ok) {
      const modelsData = await modelsRes.json();
      console.log(`  Has Ollama: ${modelsData.hasOllama}`);
      console.log(`  Models found: ${modelsData.modelCount || 0}\n`);
    } else {
      const errorText = await modelsRes.text();
      console.log(`  Error: ${errorText}\n`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

test().then(() => {
  console.log('✅ Tests complete');
  process.exit(0);
});
