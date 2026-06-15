/**
 * Multi-source story clustering & importance scoring.
 *
 * Core idea: when the SAME story is reported by several INDEPENDENT outlets, it
 * matters more. The ingestion pipeline already drops near-identical duplicates
 * (cosine > ~0.93). This module groups the remaining same-story articles that
 * come from *different* sources (cosine in a looser band) into "story clusters",
 * counts how many distinct outlets cover each story, and turns that corroboration
 * into an importance score the feed can sort by.
 *
 * Pure, dependency-free functions so they can be unit-tested and reused by both
 * the offline clustering script and any runtime that needs the same math.
 */

import { AI_NEWS_SOURCES, type SourceCategory } from './news-sources';

export interface ClusterableArticle {
  id: string;
  title: string;
  sourceUrl: string;
  publishedAt: string; // ISO
  qualityScore: number; // 0..1
  embedding?: number[] | null;
}

export interface CorroboratingSource {
  domain: string;
  url: string;
  tier: SourceCategory | 'unknown';
}

export interface StoryCluster {
  articleIds: string[];
  primaryId: string;
  distinctDomains: string[];
  corroborationCount: number; // number of distinct independent outlets
  sources: CorroboratingSource[];
  importance: number;
}

/** Cosine threshold for "same story, different wording/source". Looser than the
 *  pipeline's dedup threshold (~0.93) so paraphrased coverage still groups. */
export const DEFAULT_CLUSTER_THRESHOLD = 0.82;
/** Title Jaccard fallback when one/both embeddings are missing. */
export const TITLE_FALLBACK_THRESHOLD = 0.5;

// ── domain / source helpers ────────────────────────────────────────────────

export function extractDomain(url: string): string {
  if (!url) return '';
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.replace(/^www\./, '');
  } catch {
    return '';
  }
}

/** Registrable-ish domain (last two labels) so news.bbc.co.uk and bbc.com don't
 *  both count, and subdomains of one outlet collapse to one source. */
export function registrableDomain(host: string): string {
  if (!host) return '';
  const parts = host.split('.');
  if (parts.length <= 2) return host;
  // Handle common two-level public suffixes (co.uk, com.es, ...).
  const twoLevel = new Set(['co', 'com', 'org', 'net', 'gov', 'ac', 'edu']);
  const last = parts[parts.length - 1];
  const penult = parts[parts.length - 2];
  if (twoLevel.has(penult) && last.length === 2) {
    return parts.slice(-3).join('.');
  }
  return parts.slice(-2).join('.');
}

let domainTierCache: Map<string, SourceCategory> | null = null;

/** Map known source domains → their editorial tier, derived from AI_NEWS_SOURCES. */
export function buildDomainTierMap(): Map<string, SourceCategory> {
  if (domainTierCache) return domainTierCache;
  const map = new Map<string, SourceCategory>();
  for (const source of AI_NEWS_SOURCES) {
    // Skip aggregators whose URL is news.google.com — their resolved articles
    // point at the real publisher, not google.
    const domain = registrableDomain(extractDomain(source.url));
    if (!domain || domain === 'google.com') continue;
    if (!map.has(domain)) map.set(domain, source.category);
  }
  domainTierCache = map;
  return map;
}

export function tierForDomain(domain: string): SourceCategory | 'unknown' {
  return buildDomainTierMap().get(registrableDomain(domain)) ?? 'unknown';
}

function tierWeight(tier: SourceCategory | 'unknown'): number {
  switch (tier) {
    case 'company':
      return 1.15;
    case 'research':
      return 1.12;
    case 'news':
      return 1.0;
    case 'aggregator':
      return 0.92;
    case 'newsletter':
      return 0.93;
    case 'podcast':
      return 0.9;
    case 'tutorials':
      return 0.88;
    case 'community':
      return 0.86;
    default:
      return 0.95;
  }
}

// ── similarity ──────────────────────────────────────────────────────────────

export function cosineSimilarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  if (len === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\b(the|a|an|and|or|of|to|in|for|on|with|from|by|at|as|el|la|los|las|de|y|en)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function titleSimilarity(a: string, b: string): number {
  const ta = new Set(normalizeTitle(a).split(' ').filter((t) => t.length >= 3));
  const tb = new Set(normalizeTitle(b).split(' ').filter((t) => t.length >= 3));
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter += 1;
  return inter / (ta.size + tb.size - inter);
}

/** True if two articles are about the same story. */
export function isSameStory(
  a: ClusterableArticle,
  b: ClusterableArticle,
  clusterThreshold = DEFAULT_CLUSTER_THRESHOLD,
): boolean {
  if (a.embedding && b.embedding && a.embedding.length && b.embedding.length) {
    return cosineSimilarity(a.embedding, b.embedding) >= clusterThreshold;
  }
  // Fallback to lexical title overlap when embeddings are unavailable.
  return titleSimilarity(a.title, b.title) >= TITLE_FALLBACK_THRESHOLD;
}

// ── clustering (union-find) ──────────────────────────────────────────────────

class UnionFind {
  private parent: number[];
  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i);
  }
  find(x: number): number {
    while (this.parent[x] !== x) {
      this.parent[x] = this.parent[this.parent[x]];
      x = this.parent[x];
    }
    return x;
  }
  union(a: number, b: number): void {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent[ra] = rb;
  }
}

// ── importance ───────────────────────────────────────────────────────────────

export interface ImportanceInput {
  corroborationCount: number; // distinct outlets
  bestTierWeight: number; // max tier weight among sources
  avgQuality: number; // 0..1
  ageHours: number; // hours since most recent article in cluster
}

/**
 * Importance is dominated by corroboration (how many independent outlets cover
 * the story), then modulated by source authority, quality and freshness.
 */
export function computeImportance(input: ImportanceInput): number {
  const corroboration = Math.log2(1 + Math.max(1, input.corroborationCount)) * 10;
  const authority = (input.bestTierWeight - 0.85) * 12; // ~0..3.6
  const quality = Math.max(0, Math.min(1, input.avgQuality)) * 5;
  // Half-life of ~36h; fresh stories score higher.
  const recency = 6 * Math.pow(0.5, Math.max(0, input.ageHours) / 36);
  return Number((corroboration + authority + quality + recency).toFixed(3));
}

/**
 * Group articles into story clusters and score them.
 * `now` lets tests pin recency.
 */
export function clusterArticles(
  articles: ClusterableArticle[],
  options: { clusterThreshold?: number; now?: number } = {},
): StoryCluster[] {
  const clusterThreshold = options.clusterThreshold ?? DEFAULT_CLUSTER_THRESHOLD;
  const now = options.now ?? Date.now();
  const n = articles.length;
  const uf = new UnionFind(n);

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (isSameStory(articles[i], articles[j], clusterThreshold)) {
        uf.union(i, j);
      }
    }
  }

  const groups = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    const root = uf.find(i);
    const arr = groups.get(root);
    if (arr) arr.push(i);
    else groups.set(root, [i]);
  }

  const clusters: StoryCluster[] = [];
  for (const indices of groups.values()) {
    const members = indices.map((i) => articles[i]);

    // Distinct independent outlets (by registrable domain).
    const byDomain = new Map<string, CorroboratingSource>();
    for (const m of members) {
      const domain = registrableDomain(extractDomain(m.sourceUrl));
      if (!domain) continue;
      if (!byDomain.has(domain)) {
        byDomain.set(domain, { domain, url: m.sourceUrl, tier: tierForDomain(domain) });
      }
    }
    const sources = Array.from(byDomain.values());
    const distinctDomains = sources.map((s) => s.domain);
    const corroborationCount = Math.max(1, distinctDomains.length);

    // Primary = most authoritative tier, then highest quality, then earliest published.
    const primary = [...members].sort((a, b) => {
      const ta = tierWeight(tierForDomain(registrableDomain(extractDomain(a.sourceUrl))));
      const tb = tierWeight(tierForDomain(registrableDomain(extractDomain(b.sourceUrl))));
      if (tb !== ta) return tb - ta;
      if (b.qualityScore !== a.qualityScore) return b.qualityScore - a.qualityScore;
      return new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime();
    })[0];

    const bestTierWeight = sources.length
      ? Math.max(...sources.map((s) => tierWeight(s.tier)))
      : 0.95;
    const avgQuality = members.reduce((s, m) => s + (m.qualityScore || 0), 0) / members.length;
    const newestMs = Math.max(...members.map((m) => new Date(m.publishedAt).getTime() || 0));
    const ageHours = Math.max(0, (now - newestMs) / 3_600_000);

    const importance = computeImportance({ corroborationCount, bestTierWeight, avgQuality, ageHours });

    clusters.push({
      articleIds: members.map((m) => m.id),
      primaryId: primary.id,
      distinctDomains,
      corroborationCount,
      sources,
      importance,
    });
  }

  // Most important first.
  clusters.sort((a, b) => b.importance - a.importance);
  return clusters;
}
