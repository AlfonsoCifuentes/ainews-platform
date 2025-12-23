export const COURSE_COVER_NEGATIVE_PROMPT =
  'text, typography, caption, subtitle, label, logo, watermark, signature, handwriting, letters, numbers, digits, words, symbols, UI, interface, signage, banner, texto, tipografia, subtitulo, etiqueta, marca de agua, letras, palabras, numeros';

const NO_TEXT_SUFFIX =
  'NO TEXT. ABSOLUTELY NO text, letters, numbers, typography, logos, watermarks, UI labels, captions, or signage.';

export function enforceNoTextCoverPrompt(prompt: string): string {
  const base = String(prompt ?? '').trim();
  if (!base) return NO_TEXT_SUFFIX;

  const lower = base.toLowerCase();
  const already =
    lower.includes('no text') ||
    lower.includes('no-text') ||
    lower.includes('no typography') ||
    lower.includes('no letters') ||
    lower.includes('no words');

  if (already) return base;
  return `${base}\n\n${NO_TEXT_SUFFIX}`;
}
