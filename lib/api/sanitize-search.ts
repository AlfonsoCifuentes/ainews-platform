/**
 * Sanitize search query strings for use with PostgREST/Supabase .ilike() and .or() filters.
 * 
 * PostgREST uses special characters in its filter syntax (%, _, *, (, ), etc.).
 * User-supplied search terms must be escaped to prevent filter injection/breakout.
 */

/**
 * Escape PostgREST special characters in a search term.
 * Use this before interpolating user input into .ilike() or .or() filters.
 * 
 * @example
 * const safe = sanitizeSearchQuery(userInput);
 * query.ilike('name', `%${safe}%`);
 */
export function sanitizeSearchQuery(query: string): string {
  return query
    .replace(/[%_*(),."\\]/g, (char) => `\\${char}`)
    .replace(/'/g, "''");
}
