/**
 * Quick Gemini Test
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import { GoogleGenerativeAI } from '@google/generative-ai';

async function test() {
  console.log('Testing Gemini...');
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  console.log('Key starts with:', apiKey?.slice(0, 10) + '...');

  try {
    const gemini = new GoogleGenerativeAI(apiKey!);
    const model = gemini.getGenerativeModel({ model: 'gemini-2.0-flash' });
    console.log('Sending request...');
    const result = await model.generateContent('Say hello in Spanish. Just respond with the greeting.');
    console.log('Got result');
    const response = await result.response;
    console.log('SUCCESS:', response.text().slice(0, 100));
  } catch(e: any) {
    console.log('ERROR:', e.message);
    console.log('Full error:', e);
  }
}

test().then(() => {
  console.log('Test complete');
  process.exit(0);
}).catch((e) => {
  console.log('Unhandled:', e);
  process.exit(1);
});
