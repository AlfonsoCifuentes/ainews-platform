/**
 * Central site/brand configuration.
 *
 * NOTE: `SITE_NAME` is a working placeholder for the news brand. Change it here
 * once the final name is chosen and it will propagate across the whole app
 * (header, footer, metadata, OpenGraph, etc.).
 */

export const SITE_NAME = 'Las Noticias de la IA';
export const SITE_SHORT_NAME = 'Las Noticias de la IA';
export const SITE_TAGLINE_EN = 'AI news, explained like a friend would.';
export const SITE_TAGLINE_ES = 'Noticias de IA, explicadas como te las contaría un amigo.';

export const SITE_DESCRIPTION_EN =
  'The most important artificial-intelligence stories of the day, cross-checked across dozens of sources and rewritten in clear, friendly language.';
export const SITE_DESCRIPTION_ES =
  'Las noticias de inteligencia artificial más importantes del día, contrastadas entre decenas de fuentes y reescritas en un lenguaje claro y cercano.';

export const SITE_BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  'https://thotnet-core.vercel.app';

export function siteTagline(locale: string): string {
  return locale === 'es' ? SITE_TAGLINE_ES : SITE_TAGLINE_EN;
}

export function siteDescription(locale: string): string {
  return locale === 'es' ? SITE_DESCRIPTION_ES : SITE_DESCRIPTION_EN;
}
