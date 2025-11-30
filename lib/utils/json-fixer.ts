/**
 * Robust JSON fixing for LLM-generated content
 * Handles various formatting issues that LLMs introduce
 */

export function sanitizeAndFixJSON(content: string): string {
  let fixed = content;

  // Step 1: Remove ASCII control characters but PRESERVE structure
  fixed = fixed
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // ASCII control chars
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '');     // Unicode control chars

  // Normalize problematic unicode line separators that can break parsers
  fixed = fixed.replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  // Remove BOM if present
  fixed = fixed.replace(/\uFEFF/g, '');

  // Step 2: Extract JSON from markdown code blocks if present
  if (fixed.includes('```json')) {
    fixed = fixed.split('```json')[1].split('```')[0].trim();
  } else if (fixed.includes('```')) {
    fixed = fixed.split('```')[1].split('```')[0].trim();
  }

  // Step 3: Remove newlines that are NOT inside strings
  // This is the CORRECT approach - we preserve actual JSON structure
  // Only remove literal newlines, not escaped ones
  fixed = fixed
    .replace(/\r\n/g, '\n')  // Normalize line endings
    .trim();

  // Step 4: Escape unescaped newlines and tabs that are inside string values
  // We need to be VERY careful here - only escape literal whitespace, not structural
  fixed = escapeUnescapedWhitespace(fixed);

  // Step 5: Escape unescaped double-quotes inside string values.
  // This is a heuristic (best-effort) - it attempts to escape double-quotes
  // that appear inside a JSON string but are not properly escaped by the LLM.
  // If JSON is still invalid, parseJSON will report the exact position.
  fixed = escapeUnescapedQuotes(fixed);

  return fixed;
}

/**
 * Escape unescaped whitespace characters that appear inside JSON strings.
 * This is the most dangerous operation because we need to:
 * 1. Not touch whitespace outside strings
 * 2. Not double-escape already escaped sequences
 * 3. Preserve the actual content
 */
function escapeUnescapedWhitespace(jsonStr: string): string {
  let result = '';
  let inString = false;
  let escaped = false;
  let i = 0;

  while (i < jsonStr.length) {
    const char = jsonStr[i];

    // Track if we're inside a string
    if (char === '"' && !escaped) {
      inString = !inString;
    }

    // Handle escape sequences
    if (char === '\\' && !escaped) {
      escaped = true;
      result += char;
      i++;
      continue;
    }

    // If we're inside a string and find whitespace, escape it
    if (inString && (char === '\n' || char === '\r' || char === '\t') && !escaped) {
      if (char === '\n') result += '\\n';
      else if (char === '\r') result += '\\r';
      else if (char === '\t') result += '\\t';
    } else {
      result += char;
    }

    escaped = false;
    i++;
  }

  return result;
}

/**
 * Heuristically escape unescaped double-quotes inside JSON string values.
 *
 * Strategy:
 * - Walk the string char-by-char and track whether we're in a JSON string
 * - When inside a string and we find a `"` that isn't escaped, check the next
 *   non-whitespace character: if it is not structural (`,`, `}`, `]`, `:`) we
 *   assume the `"` was intended to be part of the string content and should be
 *   escaped (i.e. convert `"` -> `\"`).
 * - This is heuristic and may not be perfect, but covers most LLM JSON cases
 *   where a writer forgot to escape quotes inside content strings.
 */
function escapeUnescapedQuotes(jsonStr: string): string {
  let result = '';
  let inString = false;
  let escaped = false;
  let i = 0;

  while (i < jsonStr.length) {
    const char = jsonStr[i];

    // Track string state
    if (char === '"' && !escaped) {
      // We need to inspect if this quote should be treated as a normal delimiter
      // or if it's likely an unescaped quote within the content.
      if (!inString) {
        // Starting a string
        inString = true;
        result += char;
        i++;
        continue;
      }

      // We're currently inside a string; determine if this is a true close
      // The next non-whitespace char decides if it's legitimately closing the
      // string (comma, colon, brace/bracket) or if it's followed by content,
      // which suggests it should be escaped.
      let j = i + 1;
      while (j < jsonStr.length && /[\s\n\r\t]/.test(jsonStr[j])) j++;
      const nextChar = j < jsonStr.length ? jsonStr[j] : undefined;

      const structural = nextChar === ',' || nextChar === '}' || nextChar === ']' || nextChar === ':' || nextChar === undefined;

      if (!structural) {
        // Likely an internal quote–escape it
        result += '\\"';
        i++;
        continue;
      }

      // Otherwise treat normally as string close
      inString = false;
      result += char;
      i++;
      continue;
    }

    // Handle escapes and normal characters
    if (char === '\\' && !escaped) {
      escaped = true;
      result += char;
      i++;
      continue;
    }

    result += char;
    escaped = false;
    i++;
  }

  return result;
}

/**
 * Escape single backslashes that are not part of valid JSON escape sequences
 * and that occur inside JSON strings.
 * Strategy: walk char-by-char, when inside a string and encountering a backslash
 * that is not escaped and the next char is not one of '"\/bfnrtu', escape it
 * by turning it into two backslashes.
 */
function escapeUnescapedBackslashes(jsonStr: string): string {
  let result = '';
  let inString = false;
  let escaped = false;
  let i = 0;

  while (i < jsonStr.length) {
    const char = jsonStr[i];

    if (char === '"' && !escaped) {
      inString = !inString;
      result += char;
      i++;
      continue;
    }

    if (char === '\\' && !escaped && inString) {
      const nextChar = jsonStr[i + 1];
      // Valid JSON escapes: \ " \/ \b \f \n \r \t \u
      if (nextChar && /["\\/bfnrtu]/.test(nextChar)) {
        // Already a valid escape, keep as-is
        result += char;
        escaped = true;
        i++;
        continue;
      }

      // Not a valid escape sequence - escape the backslash
      result += '\\\\';
      i++;
      continue;
    }

    // Handle escape char when not in the invalid branch
    if (char === '\\' && !escaped) {
      escaped = true;
      result += char;
      i++;
      continue;
    }

    result += char;
    escaped = false;
    i++;
  }

  return result;
}

/**
 * Remove trailing commas before closing object/array braces (e.g., {"a": 1,})
 * This helps with common LLM errors where an extra comma is added.
 */
function removeTrailingCommas(jsonStr: string): string {
  return jsonStr.replace(/,\s*(?=[\]}])/g, '');
}

/**
 * Parse JSON with helpful error reporting
 */
export function parseJSON<T = unknown>(jsonStr: string, context: string = ''): T {
  try {
    return JSON.parse(jsonStr) as T;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[JSON] Parse error in ${context}:`, errorMsg);

    // Extract position from error message
    const match = errorMsg.match(/position (\d+)/);
    if (match) {
      const pos = parseInt(match[1]);
      const start = Math.max(0, pos - 200);
      const end = Math.min(jsonStr.length, pos + 200);
      const context = jsonStr.substring(start, end);
      
      console.error('[JSON] Character at error position:', jsonStr[pos]);
      console.error('[JSON] Characters around error:');
      console.error(JSON.stringify(context));
      console.error('[JSON] Position in snippet:', pos - start);
    }

    // Before attempting fixes, provide an analysis to help debugging
    try {
      const diagnostics = analyzeJsonString(jsonStr);
      console.error('[JSON] Diagnostics: ', diagnostics);
    } catch (diagnosticError) {
      console.warn('[JSON] Failed to compute diagnostics:', diagnosticError);
    }

    // Attempt automatic heuristic fixes in sequence. Each step will try to
    // correct common LLM JSON mistakes and attempt parsing again.
    try {
      // Log basic diagnostics: count of unescaped double quotes (heuristic)
      const unescapedQuotesBefore = (jsonStr.match(/(^|[^\\])\"/g) || []).length;
      console.warn(`[JSON] Unescaped quote count before fix in ${context}:`, unescapedQuotesBefore);
      // 1) Escape unescaped quotes
      let fixed = escapeUnescapedQuotes(jsonStr);
      const unescapedQuotesAfter = (fixed.match(/(^|[^\\])\"/g) || []).length;
      console.warn(`[JSON] Unescaped quote count after quote-fix in ${context}:`, unescapedQuotesAfter);

      // Try parse again
      try {
        const parsed = JSON.parse(fixed) as T;
        console.warn(`[JSON] Auto-fixed quoting issues in ${context} using escapeUnescapedQuotes()`);
        return parsed;
      } catch {
        console.warn('[JSON] Quote-fix parse failed, trying additional heuristics...');
      }
      // 2) Fix backslashes inside strings (e.g., single backslashes not part of valid escapes)
      fixed = escapeUnescapedBackslashes(fixed);
      console.warn(`[JSON] Retried parse with escapeUnescapedBackslashes()`);
      try {
        const parsed = JSON.parse(fixed) as T;
        console.warn(`[JSON] Successfully parsed after backslash-fix in ${context}`);
        return parsed;
      } catch {
        console.warn('[JSON] Backslash-fix parse failed, trying trailing commas fix...');
      }

      // 3) Remove trailing commas
      fixed = removeTrailingCommas(fixed);
      console.warn(`[JSON] Retried parse after removeTrailingCommas()`);
      try {
        const parsed = JSON.parse(fixed) as T;
        console.warn(`[JSON] Successfully parsed after trailing-commas-fix in ${context}`);
        return parsed;
      } catch {
        console.warn('[JSON] Trailing-commas-fix parse failed.');
      }
    } catch (fallbackError) {
      // If it still fails, log fallback details for debugging
      const fallbackMsg = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
      console.error(`[JSON] Fallback parse error after quote-fix in ${context}:`, fallbackMsg);
    }

    throw new Error(`JSON Parse Error in ${context}: ${errorMsg}`);
  }
}

  /**
   * Analyze JSON string and return diagnostics helpful to find issues.
   */
  function analyzeJsonString(jsonStr: string) {
    let unescapedQuotes = 0;
    let escapedQuotes = 0;
    let backslashes = 0;
    let openCurly = 0;
    let closeCurly = 0;
    let openSquare = 0;
    let closeSquare = 0;
    let controlCharCount = 0;
    let i = 0;
    let inString = false;
    let escaped = false;

    while (i < jsonStr.length) {
      const ch = jsonStr[i];
      const code = ch.codePointAt(0) || 0;
      if (ch === '"' && !escaped) {
        unescapedQuotes++;
        inString = !inString;
      }
      if (ch === '"' && escaped) escapedQuotes++;
      if (ch === '\\') backslashes++;
      if (ch === '{') openCurly++;
      if (ch === '}') closeCurly++;
      if (ch === '[') openSquare++;
      if (ch === ']') closeSquare++;
      if (code < 32 || (code >= 127 && code <= 159)) controlCharCount++;

      if (ch === '\\' && !escaped) {
        escaped = true;
        i++;
        continue;
      }
      escaped = false;
      i++;
    }

    return {
      length: jsonStr.length,
      unescapedQuotes,
      escapedQuotes,
      backslashes,
      openCurly,
      closeCurly,
      openSquare,
      closeSquare,
      controlCharCount,
      quotesBalanced: unescapedQuotes % 2 === 0,
    };
  }
