export type SourceLanguage = 'en' | 'es' | 'multi';

export type SourceCategory =
  | 'company'
  | 'news'
  | 'research'
  | 'newsletter'
  | 'tutorials'
  | 'aggregator'
  | 'community';

export interface NewsSource {
  name: string;
  url: string;
  category: SourceCategory;
  language: SourceLanguage;
  notes?: string;
}

export const AI_NEWS_SOURCES: readonly NewsSource[] = [
  // Core company blogs
  { name: 'OpenAI Blog', url: 'https://openai.com/blog/rss.xml', category: 'company', language: 'en' },
  { name: 'Anthropic News', url: 'https://www.anthropic.com/news/rss.xml', category: 'company', language: 'en' },
  { name: 'Google AI Blog', url: 'https://blog.google/technology/ai/rss/', category: 'company', language: 'en' },
  { name: 'Meta AI Blog', url: 'https://ai.meta.com/blog/rss/', category: 'company', language: 'en' },
  { name: 'Stability AI Blog', url: 'https://stability.ai/blog/rss.xml', category: 'company', language: 'en' },
  { name: 'Hugging Face Blog', url: 'https://huggingface.co/blog/feed.xml', category: 'company', language: 'en' },
  { name: 'Microsoft Research', url: 'https://www.microsoft.com/en-us/research/feed/', category: 'research', language: 'en' },

  // Academic feeds
  { name: 'arXiv cs.AI', url: 'http://export.arxiv.org/rss/cs.AI', category: 'research', language: 'en' },
  { name: 'arXiv cs.LG', url: 'http://export.arxiv.org/rss/cs.LG', category: 'research', language: 'en' },
  { name: 'arXiv cs.CL', url: 'http://export.arxiv.org/rss/cs.CL', category: 'research', language: 'en' },

  // English newsrooms
  { name: 'Artificial Intelligence News (TechForge)', url: 'https://www.artificialintelligence-news.com/feed/rss/', category: 'news', language: 'en' },
  { name: 'MIT Technology Review – AI', url: 'https://www.technologyreview.com/feed/', category: 'news', language: 'en', notes: 'AI-focused coverage in general feed' },
  { name: 'VentureBeat – AI', url: 'https://venturebeat.com/category/ai/feed/', category: 'news', language: 'en' },
  { name: 'The Guardian – Artificial Intelligence', url: 'https://www.theguardian.com/technology/artificialintelligenceai/rss', category: 'news', language: 'en' },
  { name: 'Wired – AI', url: 'https://www.wired.com/feed/tag/ai/latest/rss', category: 'news', language: 'en' },
  { name: 'Futurism – AI', url: 'https://futurism.com/categories/ai-artificial-intelligence/feed', category: 'news', language: 'en' },
  { name: 'ScienceDaily – Artificial Intelligence', url: 'https://www.sciencedaily.com/rss/computers_math/artificial_intelligence.xml', category: 'news', language: 'en' },
  { name: 'The Verge – AI', url: 'https://www.theverge.com/ai-artificial-intelligence/rss/index.xml', category: 'news', language: 'en' },

  // English newsletters & communities
  { name: 'Last Week in AI', url: 'https://lastweekin.ai/feed', category: 'newsletter', language: 'en' },
  { name: 'Reddit r/Artificial', url: 'https://www.reddit.com/r/artificial/.rss', category: 'community', language: 'en' },

  // Tutorials & learning (English)
  { name: 'Towards Data Science', url: 'https://towardsdatascience.com/feed', category: 'tutorials', language: 'en' },
  { name: 'Machine Learning Mastery', url: 'https://machinelearningmastery.com/feed/', category: 'tutorials', language: 'en' },

  // Spanish-language outlets
  { name: 'El País – Inteligencia Artificial', url: 'https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/section/tecnologia/inteligencia-artificial', category: 'news', language: 'es' },
  { name: 'Xataka – Inteligencia Artificial', url: 'https://www.xataka.com/tag/inteligencia-artificial/rss', category: 'news', language: 'es' },
  { name: 'Agencia EFE – Inteligencia Artificial', url: 'https://www.efe.com/efe/espana/tecnologia/inteligencia-artificial/50000905-5000002325.rdf', category: 'news', language: 'es' },
  { name: 'The AI Revolution News', url: 'https://theairevolution.news/feed/', category: 'news', language: 'es' },
  { name: 'SpacioIA', url: 'https://spacioia.com/feed/', category: 'news', language: 'es' },
  { name: '20minutos – Inteligencia Artificial', url: 'https://www.20minutos.es/rss/temas/inteligencia-artificial/', category: 'news', language: 'es' },
  { name: 'RTVE – Tecnología', url: 'https://www.rtve.es/rss/temas_tecnologia.xml', category: 'news', language: 'es', notes: 'Includes IA coverage with multimedia' },

  // Aggregated Spanish coverage
  { name: 'Google News ES – Inteligencia Artificial', url: 'https://news.google.com/rss/search?q=inteligencia+artificial&hl=es&gl=ES&ceid=ES:es', category: 'aggregator', language: 'es' },

  // Additional perspective sources
  { name: 'OpenAI Research Publications', url: 'https://openai.com/research/feed', category: 'research', language: 'en' },
  { name: 'DeepMind Blog', url: 'https://deepmind.com/blog/feed/basic', category: 'company', language: 'en' },
  { name: 'NVIDIA Technical Blog – AI', url: 'https://developer.nvidia.com/blog/tag/artificial-intelligence/feed/', category: 'company', language: 'en' },
  
  // Additional sources from PROJECT_MASTER
  { name: 'Papers with Code', url: 'https://paperswithcode.com/latest', category: 'research', language: 'en', notes: 'ML papers with implementations' },
  { name: 'The Batch (DeepLearning.AI)', url: 'https://www.deeplearning.ai/the-batch/feed/', category: 'newsletter', language: 'en', notes: 'Andrew Ng weekly insights' },
  { name: 'Reddit r/MachineLearning', url: 'https://www.reddit.com/r/MachineLearning/.rss', category: 'community', language: 'en', notes: 'Technical ML discussions' },
  
  // Latin America sources
  { name: 'Clarín Tecnología', url: 'https://www.clarin.com/rss/tecnologia/', category: 'news', language: 'es', notes: 'Argentine tech coverage' },
  { name: 'El Tiempo Tecnología', url: 'https://www.eltiempo.com/rss/tecnologia.xml', category: 'news', language: 'es', notes: 'Colombian tech news' },
  { name: 'La Vanguardia Tecnología', url: 'https://www.lavanguardia.com/rss/tecnologia/index.xml', category: 'news', language: 'es', notes: 'Spanish tech coverage' },
  { name: 'ABC Tecnología', url: 'https://www.abc.es/rss/feeds/abc_tecnologia.xml', category: 'news', language: 'es', notes: 'Spanish mainstream tech' },
  { name: 'El Mundo Tecnología', url: 'https://www.elmundo.es/rss/tecnologia.xml', category: 'news', language: 'es', notes: 'Spanish tech and science' },
  
  // Spanish learning & community
  { name: 'Genbeta', url: 'https://www.genbeta.com/tag/inteligencia-artificial/feed', category: 'tutorials', language: 'es', notes: 'Software and productivity guides' },
  { name: 'Hipertextual IA', url: 'https://hipertextual.com/tag/inteligencia-artificial/feed', category: 'news', language: 'es', notes: 'Tech culture and AI applications' },
  { name: 'Diseña con IA', url: 'https://disenaconia.com/feed/', category: 'tutorials', language: 'es', notes: 'AI tools comparisons and tutorials' },
] as const;
