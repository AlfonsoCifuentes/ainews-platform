(() => {
  try {
    if (typeof document === 'undefined') return;

    const entries = document.cookie
      .split(';')
      .map((c) => c.trim())
      .filter(Boolean);
    if (!entries.length) return;

    function isSupabaseCookie(name) {
      const n = name.toLowerCase();
      return n.startsWith('sb') || n.includes('supabase') || n.includes('auth-token');
    }

    function decodeBase64Url(s) {
      try {
        s = s.replace(/-/g, '+').replace(/_/g, '/');
        while (s.length % 4) s += '=';
        return atob(s);
      } catch (err) {
        console.warn('[CookieNormalizer] decodeBase64Url error', err);
        return null;
      }
    }

    const chunks = {};

    // collect cookies and chunked pieces
    for (const entry of entries) {
      const [rawName, ...rawValueParts] = entry.split('=');
      const name = rawName.trim();
      const value = (rawValueParts || []).join('=').trim();
      if (!isSupabaseCookie(name)) continue;
      const chunkMatch = name.match(/^(.*)\.(\d+)$/);
      if (chunkMatch) {
        const base = chunkMatch[1];
        const idx = Number(chunkMatch[2]);
        chunks[base] = chunks[base] || {};
        chunks[base][idx] = value;
      } else {
        // if not chunked, treat as index 0 single item
        chunks[name] = chunks[name] || {};
        chunks[name][0] = value;
      }
    }

    for (const base in chunks) {
      const pieces = chunks[base];
      const sorted = Object.keys(pieces)
        .sort((a, b) => Number(a) - Number(b))
        .map((k) => pieces[k]);
      const combined = sorted.join('');
      if (!combined) continue;

      // If value is prefixed with base64- or base64url-, decode it to a string
      if (/^base64(?:url)?-/.test(combined)) {
        const encoded = combined.replace(/^base64(?:url)?-/, '');
        const decoded = decodeBase64Url(encoded);
        if (decoded) {
          // Try to parse as JSON; if valid, store as JSON string; else store decoded string
          try {
            const parsed = JSON.parse(decoded);
            const normalized = encodeURIComponent(JSON.stringify(parsed));
            document.cookie = `${base}=${normalized}; path=/; ${
              location.protocol === 'https:' ? 'Secure; ' : ''
            }SameSite=Lax`;
            // Remove chunked cookies if any
            for (let i = 0; ; i++) {
              const name = `${base}.${i}`;
              if (!document.cookie.includes(`${name}=`)) break;
              document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;`;
            }
              // Also normalize localStorage entries commonly used by Supabase
              try {
                if (typeof window !== 'undefined' && window.localStorage) {
                  const keysToCheck = [];
                  for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (!key) continue;
                    const k = key.toLowerCase();
                    if (k.includes('supabase') || k.startsWith('sb:') || k.includes('auth')) keysToCheck.push(key);
                  }

                  for (const key of keysToCheck) {
                    try {
                      const raw = localStorage.getItem(key);
                      if (!raw) continue;
                      // If value starts with base64- or base64url-, decode and normalize
                      if (/^base64(?:url)?-/.test(raw)) {
                        const encoded = raw.replace(/^base64(?:url)?-/, '');
                        const decoded = decodeBase64Url(encoded);
                        if (decoded) {
                          try {
                            const parsed = JSON.parse(decoded);
                            localStorage.setItem(key, JSON.stringify(parsed));
                            console.info('[CookieNormalizer] Normalized localStorage key', key);
                            continue;
                          } catch (err) {
                            // Not JSON — store raw decoded value
                            localStorage.setItem(key, decoded);
                            console.info('[CookieNormalizer] Rewrote localStorage key with decoded string', key);
                            continue;
                          }
                        }
                      }

                      // If value looks like encoded JSON but not base64 prefixed, attempt to decodeURIComponent or parse as JSON
                      try {
                        const parsedAgain = JSON.parse(decodeURIComponent(raw));
                        // parsedAgain is valid, ensure stored value is a stringified JSON
                        localStorage.setItem(key, JSON.stringify(parsedAgain));
                        continue;
                      } catch (err) {
                        // Not valid; if it seems gibberish (contains 'base64-') remove it
                        if (typeof raw === 'string' && raw.includes('base64-')) {
                          localStorage.removeItem(key);
                          console.info('[CookieNormalizer] Removed invalid localStorage key:', key);
                        }
                      }
                    } catch (err) {
                      console.warn('[CookieNormalizer] Error normalizing localStorage key:', key, err);
                    }
                  }
                }
              } catch (err) {
                console.warn('[CookieNormalizer] Error normalizing localStorage', err);
              }
            console.info('[CookieNormalizer] Normalized cookie', base);
          } catch (err) {
            console.warn('[CookieNormalizer] JSON parse error for decoded value', err);
            // Not JSON: set raw decoded value
            const normalized = encodeURIComponent(decoded);
            document.cookie = `${base}=${normalized}; path=/; ${
              location.protocol === 'https:' ? 'Secure; ' : ''
            }SameSite=Lax`;
            for (let i = 0; ; i++) {
              const name = `${base}.${i}`;
              if (!document.cookie.includes(`${name}=`)) break;
              document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;`;
            }
            console.info('[CookieNormalizer] Rewrote cookie (decoded string) ', base);
          }
          continue;
        }
      }

      // If value does not parse and doesn't have a base64 prefix, remove it to allow a clean sign-in
      try {
        JSON.parse(decodeURIComponent(combined));
        // Looks valid JSON — leave it alone
      } catch (e) {
        console.warn('[CookieNormalizer] parse/decode error', e);
        // Remove malformed cookie
        document.cookie = `${base}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;`;
        for (let i = 0; ; i++) {
          const name = `${base}.${i}`;
          if (!document.cookie.includes(`${name}=`)) break;
          document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;`;
        }
        console.info('[CookieNormalizer] Removed invalid cookie:', base);
      }
    }
  } catch (err) {
    console.warn('[CookieNormalizer] Error running cookie normalization script', err);
  }
})();
