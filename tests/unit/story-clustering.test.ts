import { describe, it, expect } from 'vitest';
import {
  cosineSimilarity,
  extractDomain,
  registrableDomain,
  titleSimilarity,
  clusterArticles,
  computeImportance,
  type ClusterableArticle,
} from '@/lib/ai/story-clustering';

describe('cosineSimilarity', () => {
  it('returns 1 for identical vectors', () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 5);
  });
  it('returns 0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 5);
  });
  it('handles empty/zero vectors safely', () => {
    expect(cosineSimilarity([], [1, 2])).toBe(0);
    expect(cosineSimilarity([0, 0], [0, 0])).toBe(0);
  });
});

describe('domain helpers', () => {
  it('extracts and strips www', () => {
    expect(extractDomain('https://www.theverge.com/2024/ai')).toBe('theverge.com');
  });
  it('collapses subdomains to registrable domain', () => {
    expect(registrableDomain('news.bbc.co.uk')).toBe('bbc.co.uk');
    expect(registrableDomain('blog.google.com')).toBe('google.com');
    expect(registrableDomain('openai.com')).toBe('openai.com');
  });
});

describe('titleSimilarity', () => {
  it('is high for paraphrased headlines', () => {
    const a = 'OpenAI launches GPT-5 with major reasoning improvements';
    const b = 'OpenAI releases GPT-5 boasting major reasoning gains';
    expect(titleSimilarity(a, b)).toBeGreaterThan(0.4);
  });
  it('is low for unrelated headlines', () => {
    expect(
      titleSimilarity('Anthropic raises new funding round', 'Tesla unveils robotaxi fleet'),
    ).toBeLessThan(0.2);
  });
});

describe('computeImportance', () => {
  it('rewards more corroborating outlets', () => {
    const base = { bestTierWeight: 1, avgQuality: 0.8, ageHours: 1 };
    const one = computeImportance({ ...base, corroborationCount: 1 });
    const five = computeImportance({ ...base, corroborationCount: 5 });
    expect(five).toBeGreaterThan(one);
  });
  it('decays with age', () => {
    const base = { corroborationCount: 3, bestTierWeight: 1, avgQuality: 0.8 };
    const fresh = computeImportance({ ...base, ageHours: 1 });
    const stale = computeImportance({ ...base, ageHours: 240 });
    expect(fresh).toBeGreaterThan(stale);
  });
});

describe('clusterArticles', () => {
  const now = Date.parse('2026-06-15T12:00:00Z');
  const iso = (hoursAgo: number) => new Date(now - hoursAgo * 3_600_000).toISOString();

  it('groups the same story from different outlets and counts distinct sources', () => {
    const sameEmbedding = [1, 0, 0, 0];
    const nearEmbedding = [0.97, 0.05, 0, 0];
    const articles: ClusterableArticle[] = [
      { id: 'a', title: 'GPT-5 launches', sourceUrl: 'https://www.theverge.com/x', publishedAt: iso(2), qualityScore: 0.9, embedding: sameEmbedding },
      { id: 'b', title: 'GPT-5 is here', sourceUrl: 'https://techcrunch.com/y', publishedAt: iso(3), qualityScore: 0.85, embedding: nearEmbedding },
      { id: 'c', title: 'Robotaxi fleet unveiled', sourceUrl: 'https://example-cars.com/z', publishedAt: iso(1), qualityScore: 0.7, embedding: [0, 0, 1, 0] },
    ];

    const clusters = clusterArticles(articles, { now });
    const big = clusters.find((c) => c.articleIds.includes('a'))!;
    expect(big.articleIds.sort()).toEqual(['a', 'b']);
    expect(big.corroborationCount).toBe(2);
    expect(big.distinctDomains.sort()).toEqual(['techcrunch.com', 'theverge.com']);

    const solo = clusters.find((c) => c.articleIds.includes('c'))!;
    expect(solo.corroborationCount).toBe(1);

    // Corroborated story should outrank the singleton.
    expect(big.importance).toBeGreaterThan(solo.importance);
  });

  it('does not merge different stories from the same outlet', () => {
    const articles: ClusterableArticle[] = [
      { id: 'a', title: 'Story one', sourceUrl: 'https://theverge.com/1', publishedAt: iso(2), qualityScore: 0.9, embedding: [1, 0, 0] },
      { id: 'b', title: 'Story two', sourceUrl: 'https://theverge.com/2', publishedAt: iso(2), qualityScore: 0.9, embedding: [0, 1, 0] },
    ];
    const clusters = clusterArticles(articles, { now });
    expect(clusters).toHaveLength(2);
  });

  it('counts two articles from the SAME domain as one source', () => {
    const articles: ClusterableArticle[] = [
      { id: 'a', title: 'GPT-5 launches', sourceUrl: 'https://theverge.com/1', publishedAt: iso(2), qualityScore: 0.9, embedding: [1, 0, 0] },
      { id: 'b', title: 'GPT-5 launches', sourceUrl: 'https://theverge.com/2', publishedAt: iso(2), qualityScore: 0.9, embedding: [1, 0, 0] },
    ];
    const [cluster] = clusterArticles(articles, { now });
    expect(cluster.articleIds.sort()).toEqual(['a', 'b']);
    expect(cluster.corroborationCount).toBe(1);
  });
});
