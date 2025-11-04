/**
 * Test the complete curation flow with translation
 */

import { translateArticle, detectLanguage } from '../lib/ai/translator';

async function testTranslationFlow() {
  console.log('Testing translation flow...\n');

  // Simulate an article in English
  const englishArticle = {
    title: "OpenAI launches GPT-5: The Next Generation of AI",
    summary: "OpenAI has announced the release of GPT-5, their most advanced language model yet.",
    content: "<p>Today, OpenAI unveiled GPT-5, marking a significant milestone in artificial intelligence development. The new model demonstrates unprecedented capabilities in reasoning, creativity, and problem-solving.</p>"
  };

  console.log('Original (English):');
  console.log('Title:', englishArticle.title);
  console.log('Summary:', englishArticle.summary.substring(0, 80) + '...\n');

  // Detect language
  const detectedLang = await detectLanguage(englishArticle.title);
  console.log(`Detected language: ${detectedLang}\n`);

  // Translate to Spanish
  console.log('Translating to Spanish...');
  const spanishVersion = await translateArticle(
    englishArticle.title,
    englishArticle.summary,
    englishArticle.content,
    'en',
    'es'
  );

  console.log('\nTranslated (Spanish):');
  console.log('Title:', spanishVersion.title);
  console.log('Summary:', spanishVersion.summary.substring(0, 80) + '...');
  console.log('Content:', spanishVersion.content.substring(0, 120) + '...\n');

  // Verify they're different
  const isDifferent = englishArticle.title !== spanishVersion.title;
  console.log(`✓ Translation successful: ${isDifferent ? 'YES' : 'NO'}`);
  console.log(`✓ Title changed: ${englishArticle.title} → ${spanishVersion.title}`);
}

testTranslationFlow();
