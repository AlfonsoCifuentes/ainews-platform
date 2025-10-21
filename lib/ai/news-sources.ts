export const AI_NEWS_SOURCES = [
  // OpenAI
  { name: 'OpenAI Blog', url: 'https://openai.com/blog/rss.xml', category: 'company' },
  
  // Anthropic
  { name: 'Anthropic News', url: 'https://www.anthropic.com/news/rss.xml', category: 'company' },
  
  // Google AI
  { name: 'Google AI Blog', url: 'https://blog.google/technology/ai/rss/', category: 'company' },
  
  // Meta AI
  { name: 'Meta AI Blog', url: 'https://ai.meta.com/blog/rss/', category: 'company' },
  
  // Microsoft Research
  { name: 'Microsoft Research', url: 'https://www.microsoft.com/en-us/research/feed/', category: 'research' },
  
  // Academic
  { name: 'ArXiv CS.AI', url: 'http://export.arxiv.org/rss/cs.AI', category: 'research' },
  { name: 'ArXiv CS.LG', url: 'http://export.arxiv.org/rss/cs.LG', category: 'research' },
  { name: 'ArXiv CS.CL', url: 'http://export.arxiv.org/rss/cs.CL', category: 'research' },
  
  // News Sites
  { name: 'MIT Technology Review AI', url: 'https://www.technologyreview.com/topic/artificial-intelligence/feed', category: 'news' },
  { name: 'VentureBeat AI', url: 'https://venturebeat.com/category/ai/feed/', category: 'news' },
  { name: 'The Verge AI', url: 'https://www.theverge.com/ai-artificial-intelligence/rss/index.xml', category: 'news' },
  
  // Specialized
  { name: 'Towards Data Science', url: 'https://towardsdatascience.com/feed', category: 'tutorials' },
  { name: 'Machine Learning Mastery', url: 'https://machinelearningmastery.com/feed/', category: 'tutorials' },
  
  // HuggingFace
  { name: 'HuggingFace Blog', url: 'https://huggingface.co/blog/feed.xml', category: 'company' },
  
  // Stability AI
  { name: 'Stability AI Blog', url: 'https://stability.ai/blog/rss.xml', category: 'company' },
] as const;

export type NewsSource = (typeof AI_NEWS_SOURCES)[number];
export type SourceCategory = NewsSource['category'];
