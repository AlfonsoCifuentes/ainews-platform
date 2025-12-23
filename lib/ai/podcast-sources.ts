export type PodcastSource = {
  name: string;
  url: string;
  language: 'en' | 'es';
  notes?: string;
};

export const AI_PODCAST_SOURCES: readonly PodcastSource[] = [
  {
    name: 'Monos Estocasticos',
    url: 'https://www.ivoox.com/monos-estocasticos_fg_f11812361_filtro_1.xml',
    language: 'es',
    notes: 'AI news and analysis in Spanish',
  },
  {
    name: 'El Podcast de IA',
    url: 'https://anchor.fm/s/e1d03350/podcast/rss',
    language: 'es',
    notes: 'Daily AI news and interviews',
  },
  {
    name: 'Despegando con la IA',
    url: 'https://anchor.fm/s/e615b138/podcast/rss',
    language: 'es',
    notes: 'Practical AI tools and workflows',
  },
  {
    name: 'The AI Breakdown',
    url: 'https://feeds.megaphone.fm/theaibreakdown',
    language: 'en',
    notes: 'Daily AI news analysis',
  },
  {
    name: 'Hard Fork',
    url: 'https://feeds.simplecast.com/9YNI3WaL',
    language: 'en',
    notes: 'Tech and AI reporting from NYT',
  },
  {
    name: 'Last Week in AI',
    url: 'https://anchor.fm/s/a14e9e8/podcast/rss',
    language: 'en',
    notes: 'Weekly AI roundup',
  },
  {
    name: 'Lex Fridman Podcast',
    url: 'https://lexfridman.com/feed/podcast/',
    language: 'en',
    notes: 'Long-form AI interviews',
  },
  {
    name: 'Latent Space',
    url: 'https://api.substack.com/feed/podcast/1084089.rss',
    language: 'en',
    notes: 'Technical AI engineering podcast',
  },
  {
    name: 'Machine Learning Street Talk',
    url: 'https://anchor.fm/s/1e8f2374/podcast/rss',
    language: 'en',
    notes: 'Deep technical ML discussions',
  },
  {
    name: 'No Priors',
    url: 'https://feeds.simplecast.com/jMPOp-W1',
    language: 'en',
    notes: 'AI and venture capital',
  },
] as const;