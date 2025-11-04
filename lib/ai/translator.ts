/**
 * Simple, reliable translation system using Google Translate
 * - Free, no API keys needed
 * - No rate limits for reasonable usage
 * - Much more reliable than LLMs for translation
 */

import translate from 'google-translate-api-x';

export interface TranslatedContent {
  title: string;
  summary: string;
  content: string;
}

/**
 * Translate article content from one language to another
 */
export async function translateArticle(
  title: string,
  summary: string,
  content: string,
  fromLang: 'en' | 'es',
  toLang: 'en' | 'es'
): Promise<TranslatedContent> {
  if (fromLang === toLang) {
    return { title, summary, content };
  }

  try {
    // Use forceBatch: false and rejectOnPartialFail: false to handle long content
    // Translate sequentially to avoid overwhelming the API
    const translatedTitle = await translate(title, { 
      from: fromLang, 
      to: toLang,
      forceBatch: false,
      rejectOnPartialFail: false
    });

    const translatedSummary = await translate(summary, { 
      from: fromLang, 
      to: toLang,
      forceBatch: false,
      rejectOnPartialFail: false
    });

    const translatedContent = await translate(content, { 
      from: fromLang, 
      to: toLang,
      forceBatch: false,
      rejectOnPartialFail: false
    });

    return {
      title: translatedTitle.text,
      summary: translatedSummary.text,
      content: translatedContent.text
    };
  } catch (error) {
    console.error(`[Translator] Error translating from ${fromLang} to ${toLang}:`, error);
    // Return original content on error instead of failing
    return { title, summary, content };
  }
}

/**
 * Detect the language of a text
 * Returns 'en' or 'es' (defaults to 'en' if uncertain)
 */
export async function detectLanguage(text: string): Promise<'en' | 'es'> {
  try {
    const result = await translate(text.slice(0, 500), { to: 'en' });
    const detected = result.from.language.iso;
    
    // Map to our supported languages
    if (detected === 'es') return 'es';
    return 'en'; // Default to English for all other languages
  } catch (error) {
    console.error('[Translator] Error detecting language:', error);
    return 'en'; // Default to English on error
  }
}

/**
 * Batch translate multiple texts efficiently
 */
export async function batchTranslate(
  texts: string[],
  fromLang: 'en' | 'es',
  toLang: 'en' | 'es',
  delayMs: number = 100 // Small delay to avoid rate limiting
): Promise<string[]> {
  if (fromLang === toLang) {
    return texts;
  }

  const results: string[] = [];

  for (const text of texts) {
    try {
      const result = await translate(text, { from: fromLang, to: toLang });
      results.push(result.text);
      
      // Small delay between requests to be respectful
      if (delayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    } catch (error) {
      console.error('[Translator] Error in batch translation:', error);
      results.push(text); // Keep original on error
    }
  }

  return results;
}
