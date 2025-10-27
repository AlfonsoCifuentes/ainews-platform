// Quick API test script
async function testCourseGeneration() {
  console.log('🧪 Testing course generation API...');
  
  const response = await fetch('http://localhost:3000/api/courses/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      topic: 'Machine Learning Basics',
      difficulty: 'beginner',
      duration: 'medium',
      locale: 'en'
    })
  });

  console.log(`\n📊 Status: ${response.status} ${response.statusText}`);
  
  const data = await response.json();
  console.log('\n📦 Response:', JSON.stringify(data, null, 2));
  
  if (response.ok) {
    console.log('\n✅ API test PASSED');
  } else {
    console.log('\n❌ API test FAILED');
    console.error('Error details:', data.error || data.message);
  }
}

testCourseGeneration().catch(console.error);
