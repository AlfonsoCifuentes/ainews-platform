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

    throw new Error(`JSON Parse Error in ${context}: ${errorMsg}`);
  }
}
