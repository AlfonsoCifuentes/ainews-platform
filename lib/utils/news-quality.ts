import type { INewsArticle } from '@/lib/types/news';

const urlRegex = /https?:\/\//i;

function normalizeForChecks(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\u00a0/g, ' ')
    .trim();
}

export function countUrls(text: string): number {
  const matches = normalizeForChecks(text).match(/https?:\/\/[\w\-._~:/?#\[\]@!$&'()*+,;=%]+/gi);
  return matches?.length ?? 0;
}

export function looksLikeUrlOnly(text: string): boolean {
  const cleaned = normalizeForChecks(text);
  if (!cleaned) return true;

  // If the whole thing is basically one URL (or a couple), it’s garbage.
  const stripped = cleaned.replace(/[()\[\]<>"'.,;:!?]/g, ' ');
  const parts = stripped.split(' ').filter(Boolean);

  if (parts.length <= 3 && parts.some((p) => urlRegex.test(p))) return true;

  // Very short content with any URL is likely not real text.
  if (cleaned.length < 120 && urlRegex.test(cleaned)) return true;

  // Lots of URL tokens relative to words.
  const urlCount = countUrls(cleaned);
  if (urlCount >= 2 && parts.length <= urlCount * 6) return true;

  return false;
}

export function containsBoilerplateArtifacts(text: string): boolean {
  const cleaned = normalizeForChecks(text).toLowerCase();
  if (!cleaned) return false;

  const patterns: RegExp[] = [
    /\b(read more|continue reading|continue\s+reading|view image|see image)\b/i,
    /\b(leer más|seguir leyendo|continúa leyendo|ver imagen|ver\s+la\s+imagen)\b/i,
    /\b(reuse this content|republish|reutilizar este contenido|republicar)\b/i,
    /\b(sign up|subscribe|newsletter|suscríbete|suscribirte|boletín)\b/i,
    /\b(cookie policy|privacy policy|política de cookies|política de privacidad)\b/i,
    /\b(share|compartir|copy link|copiar enlace)\b/i,
    /\b(all rights reserved|todos los derechos reservados)\b/i,
  ];

  return patterns.some((p) => p.test(cleaned));
}

export function assessNewsTextQuality(input: {
  title: string;
  summary: string;
  content: string;
}): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];

  const title = normalizeForChecks(input.title);
  const summary = normalizeForChecks(input.summary);
  const content = normalizeForChecks(input.content);

  if (title.length < 8) reasons.push('title_too_short');
  if (looksLikeUrlOnly(summary)) reasons.push('summary_url_only');
  if (looksLikeUrlOnly(content)) reasons.push('content_url_only');
  if (summary.length < 40) reasons.push('summary_too_short');
  if (content.length < 220) reasons.push('content_too_short');

  const urlCount = countUrls(`${summary} ${content}`);
  if (urlCount >= 6) reasons.push('too_many_urls');

  if (containsBoilerplateArtifacts(`${summary}\n${content}`)) reasons.push('boilerplate_artifacts');

  return { ok: reasons.length === 0, reasons };
}

function recencyScore(publishedAtIso: string, nowMs: number): number {
  const ageMs = Math.max(0, nowMs - new Date(publishedAtIso).getTime());
  const ageHours = ageMs / (1000 * 60 * 60);

  // Half-life ~ 60h: allows articles from the last 3-4 days to still compete.
  const halfLifeHours = 60;
  const decay = Math.pow(0.5, ageHours / halfLifeHours);
  return Math.max(0, Math.min(1, decay));
}

function keywordScore(text: string): number {
  const cleaned = normalizeForChecks(text).toLowerCase();
  if (!cleaned) return 0;

  // Tier 1: Major AI companies / products (highest relevance)
  const tier1: RegExp[] = [
    /\b(openai|gpt[-\s]?\d|chatgpt|o[1-4]|dall[-\s]?e)\b/i,
    /\b(google|deepmind|gemini)\b/i,
    /\b(anthropic|claude)\b/i,
    /\b(nvidia|blackwell|cuda)\b/i,
    /\b(meta ai|llama[-\s]?\d)\b/i,
    /\b(microsoft|copilot)\b/i,
    /\b(apple intelligence|apple ai)\b/i,
    /\b(mistral|groq|perplexity|xai|grok)\b/i,
  ];

  // Tier 2: Important AI concepts / tech terms
  const tier2: RegExp[] = [
    /\b(transformer|llm|large language model|foundation model)\b/i,
    /\b(agi|artificial general intelligence|superintelligence)\b/i,
    /\b(multimodal|vision[-\s]?language|text[-\s]?to[-\s]?(image|video|speech))\b/i,
    /\b(agent|agentic|autonomous agent|ai agent)\b/i,
    /\b(open[-\s]?source|open[-\s]?weight)\b/i,
    /\b(fine[-\s]?tun|rlhf|reinforcement learning|reasoning)\b/i,
    /\b(diffusion|generative ai|gen[-\s]?ai)\b/i,
    /\b(neural network|deep learning|machine learning)\b/i,
    /\b(benchmark|state[-\s]?of[-\s]?the[-\s]?art|sota|breakthrough)\b/i,
  ];

  // Tier 3: Impact / magnitude signals (indicates major event)
  const tier3: RegExp[] = [
    /\b(launch|launches|launched|release|released|ships|shipped|unveil|unveiled)\b/i,
    /\b(announce|announces|announced|reveals?|introduces?)\b/i,
    /\b(regulation|lawsuit|ban|banned|copyright|antitrust|legislation|executive order)\b/i,
    /\b(billion|millions?\s+users|market\s+cap|valuation|ipo)\b/i,
    /\b(funding|raises?|series [a-e]|acquisition|acquires?|merger)\b/i,
    /\b(partner|partnership|collaboration|deal)\b/i,
    /\b(safety|alignment|existential|risk|threat)\b/i,
    /\b(world[-\s]?first|record[-\s]?breaking|historic|unprecedented)\b/i,
  ];

  let tier1Hits = 0;
  let tier2Hits = 0;
  let tier3Hits = 0;

  for (const re of tier1) { if (re.test(cleaned)) tier1Hits++; }
  for (const re of tier2) { if (re.test(cleaned)) tier2Hits++; }
  for (const re of tier3) { if (re.test(cleaned)) tier3Hits++; }

  const raw = (tier1Hits * 0.15) + (tier2Hits * 0.08) + (tier3Hits * 0.10);

  // Bonus when a major company + impact signal co-occur (e.g. "OpenAI launches...")
  const coOccurrenceBonus = (tier1Hits > 0 && tier3Hits > 0) ? 0.12 : 0;

  return Math.max(0, Math.min(1, raw + coOccurrenceBonus));
}

function contentDepthScore(text: string): number {
  const len = normalizeForChecks(text).length;
  if (len > 4000) return 1.0;
  if (len > 2000) return 0.7;
  if (len > 800) return 0.4;
  return 0.2;
}

export function computeFeaturedScore(article: Pick<INewsArticle, 'title_en' | 'summary_en' | 'content_en' | 'published_at' | 'quality_score' | 'image_url'>, nowMs: number): number {
  const rawQuality = typeof article.quality_score === 'number' ? article.quality_score : 0.75;
  const normalizedQuality = rawQuality > 1 ? rawQuality / 100 : rawQuality;
  const quality = Math.max(0, Math.min(1, normalizedQuality));
  const recency = recencyScore(article.published_at, nowMs);
  const combined = `${article.title_en}\n${article.summary_en}\n${article.content_en}`;
  const keywords = keywordScore(combined);
  const depth = contentDepthScore(combined);

  const hasImage = article.image_url ? 1 : 0;

  // Balanced: importance (keywords+depth) outweighs recency so the *most
  // significant* story surfaces, not simply the newest one.
  const score = 0.25 * recency + 0.40 * keywords + 0.10 * quality + 0.20 * depth + 0.05 * hasImage;
  return Math.max(0, Math.min(1, score));
}

export function reorderArticlesForHero<T extends INewsArticle>(articles: T[], nowMs: number, windowDays: number = 3): T[] {
  if (articles.length === 0) return articles;

  const cutoffMs = nowMs - windowDays * 24 * 60 * 60 * 1000;
  const candidates = articles.filter((a) => new Date(a.published_at).getTime() >= cutoffMs);
  if (candidates.length === 0) return articles;

  // Only consider candidates that are not obviously garbage.
  const goodCandidates = candidates.filter((a) => {
    const q = assessNewsTextQuality({
      title: a.title_en,
      summary: a.summary_en,
      content: a.content_en,
    });
    return q.ok;
  });

  const pool = goodCandidates.length ? goodCandidates : candidates;

  let best = pool[0];
  let bestScore = computeFeaturedScore(best, nowMs);

  for (const article of pool.slice(1)) {
    const score = computeFeaturedScore(article, nowMs);
    if (score > bestScore) {
      best = article;
      bestScore = score;
    }
  }

  const rest = articles.filter((a) => a.id !== best.id);

  // Keep rest in published_at desc (as fetched) — we just pin hero first.
  return [best, ...rest];
}
