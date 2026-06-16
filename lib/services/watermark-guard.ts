/**
 * 🛡️ WATERMARK / OUTLET-BRAND GUARD
 *
 * Keeps the original article photo but prevents another outlet's brand from
 * appearing baked into it (legal risk). Three zero-cost layers:
 *
 *   1. Deterministic URL cleanup — strip publisher CDN "overlay/logo" params and
 *      reject obviously branded share-card / agency-watermark variants.
 *   2. OCR scan (tesseract.js, CPU only) — read text printed ON the image and
 *      reject it if it contains an outlet/agency name or a credit line.
 *   3. (caller's choice) crop the bottom credit strip, else fall back.
 *
 * The OCR path lazily imports tesseract.js and degrades to "not flagged" when it
 * is unavailable, so this module never hard-fails the pipeline.
 */

// ── Brand / agency / credit vocabulary ──────────────────────────────────────

/** Outlet & wire-agency names whose presence printed on a photo is a red flag. */
const BRAND_TOKENS: string[] = [
  'the guardian', 'guardian', 'getty', 'getty images', 'reuters', 'associated press',
  ' ap ', 'afp', 'bloomberg', 'shutterstock', 'istock', 'epa', 'corbis', 'alamy',
  'new york times', 'nyt', 'the washington post', 'bbc', 'cnn', 'the verge',
  'techcrunch', 'wired', 'financial times', 'wall street journal', 'wsj',
  'el país', 'el pais', 'el mundo', 'la vanguardia', 'rtve', 'efe', 'europa press',
];

/** Credit-line / copyright patterns that imply a baked-in photographer credit. */
const CREDIT_PATTERNS: RegExp[] = [
  /©|\(c\)\s*\d{4}|copyright/i,
  /\bphotograph(?:s|er)?\s*[:|]/i,
  /\bphoto\s*[:|]/i,
  /\bimage\s*[:|]\s*\w/i,
  /\bcredit\s*[:|]/i,
  /\bfoto\s*[:|]/i,
  /\bvia\s+(getty|reuters|ap|afp|epa)/i,
];

/**
 * True when OCR-extracted text from an image contains an outlet/agency brand or
 * a photographer-credit line — i.e. the photo carries someone else's branding.
 */
export function textHasBrandCredit(rawText: string): { flagged: boolean; reason?: string } {
  if (!rawText) return { flagged: false };
  const text = ` ${rawText.toLowerCase().replace(/\s+/g, ' ')} `;

  for (const token of BRAND_TOKENS) {
    // Word-ish boundary so "ap" doesn't match "apple".
    const needle = token.startsWith(' ') || token.endsWith(' ') ? token : ` ${token} `;
    if (text.includes(needle) || text.includes(`${token}/`) || text.includes(`/${token}`)) {
      return { flagged: true, reason: `brand:${token.trim()}` };
    }
  }
  for (const pattern of CREDIT_PATTERNS) {
    if (pattern.test(rawText)) return { flagged: true, reason: `credit:${pattern.source.slice(0, 24)}` };
  }
  return { flagged: false };
}

// ── Deterministic URL-level cleanup ─────────────────────────────────────────

function host(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; }
}

/**
 * Strip publisher-CDN params that bake a logo/branding overlay onto the image,
 * returning the clean photo URL. Safe no-op for unknown hosts.
 */
export function stripImageOverlays(url: string): string {
  if (!url) return url;
  let out = url;
  try {
    const u = new URL(url);
    const h = u.hostname.toLowerCase();

    // The Guardian / Observer CDN (i.guim.co.uk, media.guim.co.uk): the `overlay`
    // and `enable=upscale`+`overlay-*` params add the masthead/branding band.
    if (h.includes('guim.co.uk')) {
      ['overlay', 'overlay-align', 'overlay-width', 'overlay-base64', 'enable'].forEach((p) =>
        u.searchParams.delete(p),
      );
      out = u.toString();
    }
    // WordPress/Jetpack Photon and generic resizers sometimes carry a `mark`/
    // `watermark` overlay param.
    ['mark', 'watermark', 'wm', 'logo', 'brand'].forEach((p) => {
      if (u.searchParams.has(p)) {
        u.searchParams.delete(p);
        out = u.toString();
      }
    });
  } catch {
    return url;
  }
  return out;
}

/** URL/host patterns that denote a branded share-card or watermarked agency preview. */
const BRANDED_URL_PATTERNS: RegExp[] = [
  /[?&/_-](overlay|watermark|share[-_]?card|social[-_]?card|card[-_]?image|twitter[-_]?card)/i,
  /\b(getty|gettyimages|shutterstock|istockphoto|alamy|depositphotos)\b/i,
  /\/wm\//i,
];

/** True when the URL itself signals a branded/watermarked image variant. */
export function looksLikeBrandedImageUrl(url: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  if (BRANDED_URL_PATTERNS.some((p) => p.test(lower))) return true;
  // Known stock/agency hosts that always watermark previews.
  const h = host(url);
  return ['gettyimages.com', 'shutterstock.com', 'istockphoto.com', 'alamy.com', 'depositphotos.com'].includes(h);
}

// ── OCR scan (lazy, optional) ────────────────────────────────────────────────

export interface WatermarkScanResult {
  flagged: boolean;
  reason?: string;
  text?: string;
  ocrAvailable: boolean;
}

/**
 * OCR an image and report whether it carries outlet/agency branding.
 * Accepts a Buffer (preferred — already downloaded) or an image URL.
 * Degrades gracefully (`flagged:false, ocrAvailable:false`) if tesseract.js is
 * not installed or OCR throws.
 */
export async function scanImageForWatermark(
  input: Buffer | string,
): Promise<WatermarkScanResult> {
  let buffer: Buffer | null = null;
  try {
    if (typeof input === 'string') {
      const res = await fetch(input, { signal: AbortSignal.timeout(12_000) });
      if (!res.ok) return { flagged: false, ocrAvailable: false };
      buffer = Buffer.from(await res.arrayBuffer());
    } else {
      buffer = input;
    }
  } catch {
    return { flagged: false, ocrAvailable: false };
  }
  if (!buffer || buffer.length === 0) return { flagged: false, ocrAvailable: false };

  // Downscale to speed OCR up (watermarks remain legible at ~1000px wide).
  let ocrInput: Buffer = buffer;
  try {
    const sharp = (await import('sharp')).default;
    ocrInput = await sharp(buffer).resize({ width: 1000, withoutEnlargement: true }).grayscale().toBuffer();
  } catch {
    // sharp unavailable — OCR the original buffer.
  }

  try {
    type RecognizeFn = (
      image: Buffer | string,
      langs: string,
    ) => Promise<{ data?: { text?: string } }>;
    const mod = (await import('tesseract.js')) as unknown as {
      recognize?: RecognizeFn;
      default?: { recognize?: RecognizeFn };
    };
    const recognize = mod.recognize ?? mod.default?.recognize;
    if (typeof recognize !== 'function') return { flagged: false, ocrAvailable: false };

    const { data } = await recognize(ocrInput, 'eng+spa');
    const text: string = (data?.text as string) ?? '';
    const verdict = textHasBrandCredit(text);
    return { flagged: verdict.flagged, reason: verdict.reason, text: text.slice(0, 300), ocrAvailable: true };
  } catch {
    return { flagged: false, ocrAvailable: false };
  }
}
