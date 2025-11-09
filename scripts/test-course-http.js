#!/usr/bin/env node

/**
 * Test Course Access via HTTP
 * Verifies that course pages are accessible and return 200 OK
 */

const courseIds = [
  'fa61acef-b1d1-4377-a3c5-e9e33cd9617b', // Sectas Femdom
  '3067c233-dc28-4939-ac64-dad702e160e0', // n8n con IA
  'a75b63f1-5e2a-46f1-bfb7-58a121c860bd'  // n8n Automatización
];

const baseUrl = 'https://ainews-platform.vercel.app';

async function testCourseAccess() {
  console.log('🧪 Testing course page accessibility...\n');

  for (const id of courseIds) {
    const url = `${baseUrl}/en/courses/${id}`;
    
    try {
      console.log(`📖 Testing: ${url}`);
      const response = await fetch(url, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0'
        }
      });

      if (response.ok) {
        console.log(`   ✅ SUCCESS (${response.status} ${response.statusText})\n`);
      } else {
        console.log(`   ❌ FAILED (${response.status} ${response.statusText})\n`);
      }
    } catch (error) {
      console.log(`   ❌ ERROR: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n✅ Test complete!');
  console.log('🌐 Visit: https://ainews-platform.vercel.app/en/courses');
}

testCourseAccess();
