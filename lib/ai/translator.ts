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

type Locale = 'en' | 'es';

function normalizeNewlines(text: string): string {
  return String(text ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

async function translateTextRaw(
  text: string,
  fromLang: Locale,
  toLang: Locale
): Promise<string> {
  if (fromLang === toLang) return text;
  const input = String(text ?? '');
  if (!input.trim()) return input;

  const res = await translate(input, {
    from: fromLang,
    to: toLang,
    forceBatch: false,
    rejectOnPartialFail: false,
  });

  return res.text;
}

function chunkByNewlines(text: string, maxChars: number): string[] {
  const input = String(text ?? '');
  if (input.length <= maxChars) return [input];

  const chunks: string[] = [];
  let cursor = 0;

  while (cursor < input.length) {
    const targetEnd = Math.min(cursor + maxChars, input.length);
    if (targetEnd === input.length) {
      chunks.push(input.slice(cursor));
      break;
    }

    const minEnd = cursor + Math.floor(maxChars * 0.6);
    let cut = input.lastIndexOf('\n\n', targetEnd);
    if (cut < minEnd) cut = input.lastIndexOf('\n', targetEnd);
    if (cut < minEnd) cut = targetEnd;

    // Prevent infinite loops if we cannot find a safe cut.
    if (cut <= cursor) cut = targetEnd;

    chunks.push(input.slice(cursor, cut));
    cursor = cut;
  }

  return chunks;
}

export async function translateText(
  text: string,
  fromLang: Locale,
  toLang: Locale,
  options: { maxChunkChars?: number; delayMs?: number } = {}
): Promise<string> {
  if (fromLang === toLang) return text;

  const maxChunkChars = options.maxChunkChars ?? 3800;
  const delayMs = options.delayMs ?? 80;

  try {
    const normalized = normalizeNewlines(text);
    const parts = chunkByNewlines(normalized, maxChunkChars);
    const out: string[] = [];

    for (let i = 0; i < parts.length; i += 1) {
      const part = parts[i] ?? '';
      const translated = await translateTextRaw(part, fromLang, toLang);
      out.push(translated);
      if (delayMs > 0 && i < parts.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    return out.join('');
  } catch (error) {
    console.error(`[Translator] Error translating text from ${fromLang} to ${toLang}:`, error);
    return text;
  }
}

export async function translateMarkdown(
  markdown: string,
  fromLang: Locale,
  toLang: Locale
): Promise<string> {
  if (fromLang === toLang) return markdown;

  const input = normalizeNewlines(markdown);
  if (!input.trim()) return input;

  const codeBlocks: string[] = [];
  const inlineCodes: string[] = [];
  const urls: string[] = [];
  const calloutTitles: string[] = [];

  const token = (kind: string, index: number) => `__TN_${kind}_${index}__`;

  // 1) Extract fenced code blocks (keep exactly as-is, including newlines).
  let text = input.replace(/```[\s\S]*?```/g, (match) => {
    const id = codeBlocks.length;
    codeBlocks.push(match);
    return token('CODE', id);
  });

  // 2) Extract inline code spans (avoid newlines inside).
  text = text.replace(/`[^`\n]{1,2000}`/g, (match) => {
    const id = inlineCodes.length;
    inlineCodes.push(match);
    return token('INLINE', id);
  });

  // 3) Protect markdown link/image URLs: `[label](url)` -> `[label](__TN_URL_0__)`.
  text = text.replace(/\]\(([^)\s]+(?:\s+\"[^\"]+\")?)\)/g, (_full, url) => {
    const id = urls.length;
    urls.push(String(url));
    return `](${token('URL', id)})`;
  });

  // 4) Protect callout opener titles: `:::type[Title]` -> `:::type[__TN_CALLOUT_0__]`
  // Translate the titles separately to avoid corrupting the directive syntax.
  text = text.replace(/^:::(\w+)\[([^\]]+)\]\s*$/gm, (_full, kind, title) => {
    const trimmedTitle = String(title ?? '').trim();
    if (!trimmedTitle) return _full;
    const id = calloutTitles.length;
    calloutTitles.push(trimmedTitle);
    return `:::${kind}[${token('CALLOUT', id)}]`;
  });

  // 5) Translate callout titles (small batch).
  let translatedCalloutTitles: string[] = [];
  if (calloutTitles.length) {
    translatedCalloutTitles = await batchTranslate(calloutTitles, fromLang, toLang, 50);
  }

  // 6) Translate the remaining markdown in chunks.
  const translated = await translateText(text, fromLang, toLang, { maxChunkChars: 3800, delayMs: 80 });
  let restored = translated;

  // 7) Restore callout titles.
  for (let i = 0; i < calloutTitles.length; i += 1) {
    const replacement = translatedCalloutTitles[i] ?? calloutTitles[i] ?? '';
    restored = restored.split(token('CALLOUT', i)).join(replacement);
  }

  // 8) Restore URLs.
  for (let i = 0; i < urls.length; i += 1) {
    restored = restored.split(token('URL', i)).join(urls[i] ?? '');
  }

  // 9) Restore inline code.
  for (let i = 0; i < inlineCodes.length; i += 1) {
    restored = restored.split(token('INLINE', i)).join(inlineCodes[i] ?? '');
  }

  // 10) Restore fenced code blocks.
  for (let i = 0; i < codeBlocks.length; i += 1) {
    restored = restored.split(token('CODE', i)).join(codeBlocks[i] ?? '');
  }

  return restored;
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
