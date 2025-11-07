// Quick diagnosis test
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/courses/diagnose',
  method: 'GET',
  headers: {
    'Accept': 'application/json'
  }
};

console.log('🔍 Running course generation diagnosis...\n');

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      
      console.log('📊 DIAGNOSTIC RESULTS');
      console.log('='.repeat(80));
      console.log(`Status: ${result.status.toUpperCase()}`);
      console.log(`Timestamp: ${result.timestamp}`);
      console.log('='.repeat(80));
      console.log('\n');
      
      result.steps.forEach((step, index) => {
        const icon = step.status === 'ok' ? '✅' : step.status === 'warning' ? '⚠️' : '❌';
        console.log(`${icon} ${step.step}`);
        console.log(`   ${step.message}`);
        
        if (step.details) {
          console.log(`   Details:`, JSON.stringify(step.details, null, 2).split('\n').map(line => `   ${line}`).join('\n'));
        }
        console.log('');
      });
      
      if (result.status === 'error') {
        console.log('\n🚨 CRITICAL ISSUES FOUND!');
        console.log('Please fix the errors above before attempting to generate courses.\n');
      } else if (result.status === 'warning') {
        console.log('\n⚠️ WARNINGS DETECTED');
        console.log('System will work but may have issues.\n');
      } else {
        console.log('\n✅ ALL CHECKS PASSED!');
        console.log('Course generation system is ready to use.\n');
      }
      
      process.exit(result.status === 'ok' ? 0 : 1);
      
    } catch (error) {
      console.error('❌ Failed to parse response:', error.message);
      console.error('Raw response:', data);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request failed:', error.message);
  console.error('\nMake sure the development server is running:');
  console.error('  npm run dev');
  process.exit(1);
});

req.end();
